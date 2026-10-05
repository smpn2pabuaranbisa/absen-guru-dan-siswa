import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff, ShieldCheck, ShieldAlert, Clock, Lock, School } from "lucide-react";
import { useAuth } from "@/store/useAuth";
import { apiLogin, getLoginRateLimitStatus, apiGetPublicSettings } from "@/services/api";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Single Universal Login State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Dynamic School Logo & Name State
  const [schoolInfo, setSchoolInfo] = useState<{ schoolName: string; logoSekolah: string | null }>({
    schoolName: "Presensi Sekolah Digital",
    logoSekolah: null
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  
  // Button positioning effect for playful validation feedback
  const [buttonPos, setButtonPos] = useState({ x: 0, y: 0 });

  const isLocked = lockoutSeconds > 0;

  // Validasi: Identifier minimal 3 karakter, password minimal 4 karakter
  const isFormValid = !isLocked && identifier.trim().length >= 3 && password.trim().length >= 4;

  // Cek status rate limit ketika identifier diubah
  useEffect(() => {
    if (identifier.trim()) {
      const status = getLoginRateLimitStatus(identifier);
      if (status.isLocked) {
        setLockoutSeconds(status.remainingSeconds);
      } else {
        setLockoutSeconds(0);
      }
    }
  }, [identifier]);

  // Interval hitung mundur saat terkunci
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  // Load School Settings (Logo & Nama Sekolah)
  useEffect(() => {
    const loadSchoolInfo = async () => {
      try {
        const res = await apiGetPublicSettings();
        if (res.success && res.data) {
          setSchoolInfo({
            schoolName: res.data.schoolName,
            logoSekolah: res.data.logoSekolah
          });
        }
      } catch (e) {
        // fallback to default
      }
    };

    loadSchoolInfo();

    // Listen to updates if settings are modified in admin panel
    const handleSettingsUpdated = () => {
      loadSchoolInfo();
    };

    window.addEventListener("school-settings-updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("school-settings-updated", handleSettingsUpdated);
    };
  }, []);

  useEffect(() => {
    if (isFormValid) {
      setButtonPos({ x: 0, y: 0 });
    }
  }, [isFormValid]);

  const handleMouseOver = () => {
    if (!isFormValid && !isLocked) {
      const randomX = Math.floor(Math.random() * 160) - 80;
      const randomY = Math.floor(Math.random() * 80) - 40;
      setButtonPos({ x: randomX, y: randomY });
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLocked) return;
    if (!isFormValid) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await apiLogin(identifier, password);
      if (response.success && response.data) {
        setLockoutSeconds(0);
        login(response.data.user, response.data.token);
        
        // Dynamic automatic routing based on role
        if (response.data.user.role === "guru") {
          navigate("/guru/home", { replace: true });
        } else if (response.data.user.role === "admin") {
          navigate("/admin/dashboard", { replace: true });
        } else if (response.data.user.role === "satpam") {
          navigate("/kiosk", { replace: true });
        } else if (response.data.user.role === "wali") {
          navigate("/wali/home", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } else {
        setError(response.message || "Identitas atau password salah.");
        // Periksa apakah memicu lockout
        const status = getLoginRateLimitStatus(identifier);
        if (status.isLocked) {
          setLockoutSeconds(status.remainingSeconds);
        }
      }
    } catch (err) {
      setError("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickLogin = (idValue: string, pwdValue: string = "password") => {
    setIdentifier(idValue);
    setPassword(pwdValue);
    setError(null);
    const status = getLoginRateLimitStatus(idValue);
    if (status.isLocked) {
      setLockoutSeconds(status.remainingSeconds);
    } else {
      setLockoutSeconds(0);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] text-[#f3f4f6] font-sans overflow-hidden p-4">
      <div className="bg-[#111827] p-8 sm:p-10 rounded-3xl w-full max-w-[420px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-[#374151]">
        
        {/* Logo Icon / School Logo */}
        <div className="flex justify-center mb-5">
          {schoolInfo.logoSekolah ? (
            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl p-3 flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.3)] border border-emerald-400/40 overflow-hidden relative group">
              <img 
                src={schoolInfo.logoSekolah} 
                alt={schoolInfo.schoolName} 
                className="w-full h-full object-contain filter drop-shadow-md"
              />
              {isLocked && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-xs">
                  <Lock className="w-9 h-9 text-amber-300 animate-pulse" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] border border-emerald-400/30">
              {isLocked ? (
                <Lock className="w-12 h-12 text-amber-200 animate-pulse" />
              ) : (
                <ShieldCheck className="w-14 h-14 text-white" />
              )}
            </div>
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-bold mb-1 text-center text-white tracking-tight">
          {schoolInfo.schoolName || "Presensi Sekolah Digital"}
        </h2>
        <p className="text-[#9ca3af] text-[13px] mb-6 text-center leading-relaxed">
          Satu pintu masuk untuk Guru, Staff, Siswa, dan Orang Tua / Wali Murid
        </p>

        {/* Lockout Warning Banner with Live Countdown */}
        {isLocked && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl flex items-start gap-3 text-amber-300 animate-in fade-in">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-amber-300">Akses Ditangguhkan Sementara</div>
              <p className="text-[12px] text-amber-200/90 mt-0.5 leading-relaxed">
                Terdeteksi 5x kesalahan kata sandi berturut-turut. Demi melindungi akun dari peretasan otomatis, login dibekukan.
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 rounded-lg text-amber-300 font-mono font-bold text-xs border border-amber-500/30">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Buka dalam: 00:{String(lockoutSeconds).padStart(2, "0")} detik</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="block text-[13px] text-[#9ca3af]">
              Username / NISN / No. WhatsApp
            </label>
            <input
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Masukkan username"
              autoComplete="username"
              disabled={isLoading || isLocked}
              className={`w-full px-4 py-3 bg-[#1f2937] border rounded-xl text-[#f3f4f6] text-[14px] outline-none transition-colors ${
                isLocked 
                  ? "border-amber-600/40 bg-amber-950/10 cursor-not-allowed opacity-60" 
                  : "border-[#374151] focus:border-[#10b981]"
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-[13px] text-[#9ca3af]">
                Password / PIN
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                disabled={isLoading || isLocked}
                autoComplete="current-password"
                className={`w-full px-4 py-3 pr-11 bg-[#1f2937] border rounded-xl text-[#f3f4f6] text-[14px] outline-none transition-colors ${
                  isLocked 
                    ? "border-amber-600/40 bg-amber-950/10 cursor-not-allowed opacity-60" 
                    : "border-[#374151] focus:border-[#10b981]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                disabled={isLocked}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#9ca3af] hover:text-[#f3f4f6] transition-colors cursor-pointer disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && !isLocked && (
            <div className="text-red-400 text-xs bg-red-400/10 p-3 rounded-xl border border-red-400/20 text-center leading-relaxed">
              {error}
            </div>
          )}

          <div className="pt-2 flex justify-center h-[52px] relative">
            <button
              type={isFormValid ? "submit" : "button"}
              onMouseOver={handleMouseOver}
              onClick={(e) => {
                if (isLocked) {
                  e.preventDefault();
                  return;
                }
                if (!isFormValid) {
                  e.preventDefault();
                  handleMouseOver();
                }
              }}
              disabled={isLocked || (isLoading && isFormValid)}
              style={{
                transform: !isLocked ? `translate(${buttonPos.x}px, ${buttonPos.y}px)` : "none",
              }}
              className={`absolute px-8 py-3 rounded-full text-[15px] font-semibold transition-all duration-200 z-10 border-none outline-none flex items-center justify-center ${
                isLocked
                  ? "bg-amber-600/30 text-amber-300 border border-amber-500/40 cursor-not-allowed"
                  : isFormValid
                  ? "bg-[#10b981] text-[#f3f4f6] hover:bg-[#059669] cursor-pointer shadow-lg shadow-emerald-600/30"
                  : "bg-[#374151] text-[#9ca3af] cursor-default"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLocked ? (
                <span className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> Terkunci ({lockoutSeconds}s)
                </span>
              ) : (
                "Log in"
              )}
            </button>
          </div>
        </form>

        {/* Hak Cipta & Info Sistem */}
        <div className="mt-8 pt-4 border-t border-[#374151] text-center">
          <p className="text-[12px] text-gray-400 font-medium">
            &copy; 2026 SMP Negeri 2 Pabuaran. Hak Cipta Dilindungi.
          </p>
        </div>
      </div>
    </div>
  );
}


