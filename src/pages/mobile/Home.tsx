import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/useAuth";
import { apiGetDashboard, apiGetTeacherSchedulesToday } from "@/services/api";
import { 
  LogIn, 
  LogOut, 
  Loader2, 
  AlertCircle, 
  CalendarClock, 
  BookOpen, 
  Users,
  ChevronRight,
  Sparkles,
  GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JadwalPelajaran, PresensiMengajar } from "@/types";

export default function MobileHome() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendance, setAttendance] = useState<{ datang: string | null; pulang: string | null; status: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // KBM Ringkasan
  const [schedulesToday, setSchedulesToday] = useState<(JadwalPelajaran & { presensi?: PresensiMengajar | null })[]>([]);
  const [isLoadingKBM, setIsLoadingKBM] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    setIsLoadingKBM(true);
    setError(null);
    try {
      const [dashRes, kbmRes] = await Promise.all([
        apiGetDashboard(token),
        apiGetTeacherSchedulesToday(token, user?.reference_id || "G001")
      ]);

      if (dashRes.success && dashRes.data) {
        setAttendance(dashRes.data.attendance);
      } else {
        setError(dashRes.message || "Gagal memuat data absensi.");
      }

      if (kbmRes.success && kbmRes.data) {
        setSchedulesToday(kbmRes.data.schedules);
      }
    } catch (err) {
      setError("Gagal terhubung ke server.");
    } finally {
      setIsLoading(false);
      setIsLoadingKBM(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, user]);
  
  const dateString = currentTime.toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const timeString = currentTime.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  }) + " WIB";

  const getStatusColor = (status: string) => {
    if (status === "Hadir") return "bg-green-100 text-green-800";
    if (status === "Terlambat") return "bg-yellow-100 text-yellow-800";
    if (status === "Izin" || status === "Sakit") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  const totalKbm = schedulesToday.length;
  const selesaiKbm = schedulesToday.filter(s => s.presensi).length;

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-300">
      {/* Header Guru */}
      <header className="flex items-center justify-between">
        <div 
          onClick={() => navigate("/guru/profil")} 
          className="flex items-center space-x-3.5 cursor-pointer hover:opacity-90 transition active:scale-[0.98]"
        >
          {user?.foto ? (
            <img src={user.foto} alt={user.name} className="w-12 h-12 rounded-2xl shadow-sm object-cover border border-slate-200" />
          ) : (
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 font-bold text-lg border border-blue-200">
              {user?.name?.[0] || "G"}
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">{user?.name || "Nama Guru"}</h1>
            <p className="text-xs text-gray-500 mt-0.5">{user?.reference_id || "Guru"} • NIP. 198001012005011001</p>
          </div>
        </div>
      </header>

      {/* Kartu Status Absensi Gerbang Sekolah (GPS) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-sm space-y-3.5">
        <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
          <span className="text-xs font-medium text-gray-500">{dateString}</span>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{timeString}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Presensi Gerbang Sekolah</h2>
          <span className="text-[11px] text-gray-400 font-medium">Verifikasi GPS</span>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="flex items-center space-x-2 text-red-600 text-xs py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="flex justify-between items-center pt-0.5">
            <div>
              <p className="text-[11px] text-gray-500">Datang</p>
              <p className="text-base font-bold text-gray-900">{attendance?.datang || "--:--"}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500">Pulang</p>
              <p className="text-base font-bold text-gray-900">{attendance?.pulang || "--:--"}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-500 mb-0.5">Status Gerbang</p>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                getStatusColor(attendance?.status || "Belum Absen")
              )}>
                {attendance?.status || "Belum Absen"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* KARTU RINGKASAN STATUS KBM HARI INI (BERSIH & KOMPAK) */}
      {/* ========================================================================= */}
      <div 
        onClick={() => navigate("/guru/kbm")}
        className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-4 rounded-2xl text-white shadow-sm cursor-pointer hover:opacity-95 transition active:scale-[0.99] flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-white/20 backdrop-blur-xs rounded-xl flex items-center justify-center text-white shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold leading-tight">Presensi Guru di Kelas (KBM)</h3>
              <span className="text-[10px] bg-emerald-400/30 text-emerald-100 border border-emerald-300/30 font-semibold px-1.5 py-0.5 rounded">
                Bebas GPS
              </span>
            </div>
            <p className="text-xs text-blue-100 mt-0.5">
              {isLoadingKBM 
                ? "Memuat jadwal kelas..." 
                : totalKbm === 0 
                  ? "Tidak ada jadwal mengajar hari ini" 
                  : `${selesaiKbm} dari ${totalKbm} kelas telah tercatat presensi`}
            </p>
          </div>
        </div>
        <div className="flex items-center text-xs font-semibold bg-white/15 px-2.5 py-1.5 rounded-xl text-white gap-1">
          <span>Buka</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MENU AKSI UTAMA (PRESENSI GURU DI KELAS & PRESENSI SISWA KEDUANYA TERSEDIA) */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi Cepat Presensi</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* 1. Absen Gerbang Datang */}
          <div 
            onClick={() => navigate("/guru/absensi?type=datang")}
            className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:bg-gray-50 hover:border-blue-200 transition active:scale-95 group"
          >
             <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition">
               <LogIn className="w-5 h-5 text-blue-600" />
             </div>
             <div>
               <span className="text-xs font-bold text-gray-800 block">Absen Datang</span>
               <span className="text-[10px] text-gray-400">Gerbang (GPS)</span>
             </div>
          </div>

          {/* 2. Absen Gerbang Pulang */}
          <div 
            onClick={() => navigate("/guru/absensi?type=pulang")}
            className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:bg-gray-50 hover:border-orange-200 transition active:scale-95 group"
          >
             <div className="w-11 h-11 bg-orange-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition">
               <LogOut className="w-5 h-5 text-orange-600" />
             </div>
             <div>
               <span className="text-xs font-bold text-gray-800 block">Absen Pulang</span>
               <span className="text-[10px] text-gray-400">Gerbang (GPS)</span>
             </div>
          </div>

          {/* 3. TOMBOL KHUSUS: PRESENSI GURU DI KELAS (KBM) */}
          <div 
            onClick={() => navigate("/guru/kbm")}
            className="bg-white p-3.5 rounded-2xl border border-blue-200 ring-1 ring-blue-500/20 shadow-xs flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:bg-blue-50/50 hover:border-blue-300 transition active:scale-95 group"
          >
             <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition">
               <BookOpen className="w-5 h-5 text-indigo-600" />
             </div>
             <div>
               <span className="text-xs font-bold text-indigo-950 block">Presensi Guru Kelas</span>
               <span className="text-[10px] font-semibold text-indigo-600">Foto KBM & Jurnal</span>
             </div>
          </div>

          {/* 4. TOMBOL PRESENSI SISWA (TETAP ADA LENGKAP) */}
          <div 
            onClick={() => navigate("/guru/siswa")}
            className="bg-white p-3.5 rounded-2xl border border-emerald-200 ring-1 ring-emerald-500/20 shadow-xs flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:bg-emerald-50/50 hover:border-emerald-300 transition active:scale-95 group"
          >
             <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition">
               <Users className="w-5 h-5 text-emerald-600" />
             </div>
             <div>
               <span className="text-xs font-bold text-emerald-950 block">Presensi Siswa</span>
               <span className="text-[10px] font-semibold text-emerald-600">Absensi Kehadiran Kelas</span>
             </div>
          </div>
        </div>

        {/* Tombol Cepat Buku Leger Presensi Siswa */}
        <div
          onClick={() => navigate("/guru/leger")}
          className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-3 rounded-xl border border-blue-200 shadow-xs flex items-center justify-between cursor-pointer hover:bg-blue-100/50 transition active:scale-[0.99] text-xs group"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-900">Buku Leger Presensi Siswa</span>
                <span className="text-[9px] bg-blue-600 text-white font-semibold px-1.5 py-0.2 rounded-sm">
                  Rapor
                </span>
              </div>
              <span className="text-[11px] text-gray-500 block">Rekap Semester, e-Rapor & Ekspor Excel</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-600" />
        </div>

        {/* Tombol Cepat Pengajuan Izin / Sakit Guru */}
        <div
          onClick={() => navigate("/guru/izin-sakit")}
          className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between cursor-pointer hover:bg-gray-50 transition active:scale-[0.99] text-xs"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-gray-800">Izin / Sakit Guru</span>
              <span className="text-[11px] text-gray-400 block">Pengajuan surat ketidakhadiran</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
