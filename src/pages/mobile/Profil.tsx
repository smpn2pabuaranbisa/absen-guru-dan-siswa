import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LogOut, ArrowLeft, Loader2, AlertCircle, CheckCircle2, 
  User as UserIcon, KeyRound, Mail, Phone, Briefcase, BookOpen, Users as UsersIcon, Edit3, Lock, AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/useAuth";
import { apiGetProfile, apiUpdateProfile, apiUpdatePassword } from "@/services/api";
import { GuruProfile } from "@/types";

type ViewState = "view" | "edit" | "password";

export default function MobileProfil() {
  const navigate = useNavigate();
  const { logout, token } = useAuth();
  
  const [view, setView] = useState<ViewState>("view");
  const [profile, setProfile] = useState<GuruProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  // Edit Profile Form
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  
  // Edit Password Form
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiGetProfile(token);
      if (res.success && res.data) {
        setProfile(res.data);
        setEditEmail(res.data.email);
        setEditPhone(res.data.no_hp);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Gagal memuat profil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const res = await apiUpdateProfile(token!, { email: editEmail, no_hp: editPhone });
      if (res.success) {
        setSuccessMsg(res.message);
        setProfile(prev => prev ? { ...prev, email: editEmail, no_hp: editPhone } : null);
        setTimeout(() => { setView("view"); setSuccessMsg(null); }, 1500);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Gagal memperbarui profil");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (newPass !== confirmPass) {
      setError("Konfirmasi password tidak cocok");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiUpdatePassword(token!, oldPass, newPass);
      if (res.success) {
        setSuccessMsg(res.message);
        setOldPass(""); setNewPass(""); setConfirmPass("");
        setTimeout(() => { setView("view"); setSuccessMsg(null); }, 1500);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Gagal memperbarui password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-24">
      <header className="bg-white px-4 py-4 border-b border-gray-200 flex items-center shadow-sm sticky top-0 z-10">
        {view !== "view" && (
          <button onClick={() => { setView("view"); setError(null); setSuccessMsg(null); }} className="p-2 -ml-2 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg font-bold text-gray-900 ml-2">
          {view === "view" ? "Profil Saya" : view === "edit" ? "Edit Profil" : "Ubah Password"}
        </h1>
      </header>

      <main className="flex-1 p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-500">Memuat profil...</p>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            
            {/* MESSAGES */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start space-x-3 shadow-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm leading-snug">{error}</p>
              </div>
            )}
            {successMsg && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-start space-x-3 shadow-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm leading-snug">{successMsg}</p>
              </div>
            )}

            {/* VIEW PROFILE */}
            {view === "view" && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col items-center space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                  
                  <div className="relative z-10 p-1 bg-white rounded-full mt-6 shadow-md">
                    {profile.foto ? (
                      <img src={profile.foto} alt={profile.nama} className="w-24 h-24 rounded-full object-cover" />
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                        <UserIcon className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center z-10">
                    <h2 className="text-xl font-bold text-gray-900">{profile.nama}</h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">{profile.jabatan}</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Data Kepegawaian</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-start">
                      <div className="w-8 flex-shrink-0 text-gray-400"><Briefcase className="w-5 h-5" /></div>
                      <div>
                        <p className="text-xs text-gray-500">NIP</p>
                        <p className="text-sm font-medium text-gray-900">{profile.nip || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-8 flex-shrink-0 text-gray-400"><BookOpen className="w-5 h-5" /></div>
                      <div>
                        <p className="text-xs text-gray-500">NUPTK</p>
                        <p className="text-sm font-medium text-gray-900">{profile.nuptk || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-8 flex-shrink-0 text-gray-400"><UsersIcon className="w-5 h-5" /></div>
                      <div>
                        <p className="text-xs text-gray-500">Kelas yang Diajar</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {profile.kelas_diajar.map(k => (
                            <span key={k} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">{k}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-4 py-3 bg-gray-50 border-y border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kontak</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-start">
                      <div className="w-8 flex-shrink-0 text-gray-400"><Mail className="w-5 h-5" /></div>
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium text-gray-900">{profile.email || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-8 flex-shrink-0 text-gray-400"><Phone className="w-5 h-5" /></div>
                      <div>
                        <p className="text-xs text-gray-500">Nomor HP</p>
                        <p className="text-sm font-medium text-gray-900">{profile.no_hp || "-"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => setView("edit")} variant="outline" className="h-12 border-gray-300 shadow-sm text-gray-700 bg-white">
                    <Edit3 className="w-4 h-4 mr-2" /> Edit Info
                  </Button>
                  <Button onClick={() => setView("password")} variant="outline" className="h-12 border-gray-300 shadow-sm text-gray-700 bg-white">
                    <Lock className="w-4 h-4 mr-2" /> Ubah Sandi
                  </Button>
                </div>

                <div className="pt-4">
                  <Button variant="danger" className="w-full h-12 shadow-sm" onClick={() => setIsLogoutModalOpen(true)}>
                    <LogOut className="w-4 h-4 mr-2" /> Keluar Aplikasi
                  </Button>
                </div>
              </>
            )}

            {/* EDIT PROFILE */}
            {view === "edit" && (
              <form onSubmit={handleUpdateProfile} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-xs mb-4 border border-blue-100">
                  Hanya Email dan Nomor HP yang dapat diubah. Untuk mengubah data kepegawaian lainnya, silakan hubungi Admin.
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                      type="email" 
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 pl-10 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                      type="tel" 
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 pl-10 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full h-12 mt-4 shadow-sm">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Perubahan"}
                </Button>
              </form>
            )}

            {/* CHANGE PASSWORD */}
            {view === "password" && (
              <form onSubmit={handleUpdatePassword} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password Lama</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyRound className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                      type="password" 
                      required
                      value={oldPass}
                      onChange={(e) => setOldPass(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 pl-10 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                      type="password" 
                      required
                      minLength={6}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 pl-10 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CheckCircle2 className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                      type="password" 
                      required
                      minLength={6}
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 pl-10 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full h-12 mt-4 shadow-sm">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Perbarui Password"}
                </Button>
              </form>
            )}

          </div>
        ) : null}
      </main>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Konfirmasi Logout</h3>
              <p className="text-sm text-gray-500 mb-6">
                Apakah Anda yakin ingin keluar dari aplikasi? Anda harus login kembali untuk masuk.
              </p>
              <div className="flex w-full space-x-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsLogoutModalOpen(false)}
                >
                  Batal
                </Button>
                <Button 
                  variant="danger" 
                  className="flex-1"
                  onClick={handleLogout}
                >
                  Ya, Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
