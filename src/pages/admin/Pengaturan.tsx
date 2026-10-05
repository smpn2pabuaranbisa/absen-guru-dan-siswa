import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/store/useAuth";
import { 
  apiGetSettings, 
  apiUpdateSettings, 
  apiGetAdminProfile, 
  apiUpdateAdminCredentials,
  apiExportAllBackupData,
  apiImportBackupData,
  apiResetToFactoryDefault,
  SchoolBackupBundle
} from "@/services/api";
import { KopLogoKiri, KopLogoKanan } from "@/components/common/OfficialLogos";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Clock, 
  MapPin, 
  Crosshair, 
  ExternalLink, 
  ShieldCheck, 
  Camera, 
  CalendarDays,
  Globe,
  Phone,
  Mail,
  School,
  Info,
  Image as ImageIcon,
  Upload,
  Trash2,
  KeyRound,
  UserCheck,
  Eye,
  EyeOff,
  ArrowLeftRight,
  Database,
  Download,
  UploadCloud,
  RotateCcw,
  FileJson,
  AlertTriangle,
  FileCheck,
  Server
} from "lucide-react";
import MasterDatabaseSettings from "@/components/admin/MasterDatabaseSettings";

export default function AdminPengaturan() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<"profil" | "waktu" | "lokasi" | "kebijakan" | "aset" | "admin_auth" | "backup" | "database_master">("profil");
  const [formData, setFormData] = useState<any>({
    schoolName: "",
    npsn: "",
    jenjang: "SMP",
    akreditasi: "A",
    kepalaSekolah: "",
    nipKepalaSekolah: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    logoSekolah: null,
    logoDinas: null, // Input manual saja, default null
    stempelSekolah: null,
    ttdKepalaSekolah: null,
    hariOperasional: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    jamMasukGuru: "07:00",
    jamPulangGuru: "15:00",
    modeJadwalGuru: "per_hari",
    jadwalHarianGuru: {
      "Senin": { masuk: "06:45", pulang: "15:00", aktif: true },
      "Selasa": { masuk: "07:00", pulang: "15:00", aktif: true },
      "Rabu": { masuk: "07:00", pulang: "15:00", aktif: true },
      "Kamis": { masuk: "07:00", pulang: "15:00", aktif: true },
      "Jumat": { masuk: "07:00", pulang: "11:30", aktif: true },
      "Sabtu": { masuk: "07:00", pulang: "13:00", aktif: false },
      "Minggu": { masuk: "07:00", pulang: "12:00", aktif: false }
    },
    jamMasukSiswa: "07:15",
    jamPulangSiswa: "14:00",
    modeJadwalSiswa: "per_hari",
    jadwalHarianSiswa: {
      "Senin": { masuk: "06:45", pulang: "14:15", aktif: true },
      "Selasa": { masuk: "07:15", pulang: "14:00", aktif: true },
      "Rabu": { masuk: "07:15", pulang: "14:00", aktif: true },
      "Kamis": { masuk: "07:15", pulang: "14:00", aktif: true },
      "Jumat": { masuk: "07:15", pulang: "11:15", aktif: true },
      "Sabtu": { masuk: "07:15", pulang: "12:30", aktif: false },
      "Minggu": { masuk: "07:15", pulang: "12:00", aktif: false }
    },
    toleransiKeterlambatan: "15",
    radiusAbsen: "50",
    koordinatSekolah: "-6.200000, 106.816666",
    requireSelfiePhoto: true,
    enableStrictGeofence: true
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Admin Credentials State
  const [adminAuthData, setAdminAuthData] = useState({
    username: "admin",
    name: "Admin Sekolah",
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [adminAuthSaving, setAdminAuthSaving] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [adminAuthSuccess, setAdminAuthSuccess] = useState<string | null>(null);

  // Backup & Restore State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [backupFileBundle, setBackupFileBundle] = useState<SchoolBackupBundle | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);
  const [backupErrorMsg, setBackupErrorMsg] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const daysOfWeek = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  const radiusPresets = [30, 50, 100, 150, 200];

  useEffect(() => {
    const fetchSettings = async () => {
      if (!token) return;
      setIsLoading(true);
      try {
        const [resSettings, resAdmin] = await Promise.all([
          apiGetSettings(token),
          apiGetAdminProfile(token)
        ]);

        if (resSettings.success && resSettings.data) {
          setFormData({
            ...resSettings.data,
            hariOperasional: resSettings.data.hariOperasional || ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
          });
        } else {
          setError(resSettings.message);
        }

        if (resAdmin.success && resAdmin.data) {
          setAdminAuthData((prev) => ({
            ...prev,
            username: resAdmin.data?.username || "admin",
            name: resAdmin.data?.name || "Admin Sekolah"
          }));
        }
      } catch (err) {
        setError("Gagal memuat konfigurasi pengaturan.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [token]);

  const handleSaveAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setAdminAuthError(null);
    setAdminAuthSuccess(null);

    // Validation
    if (!adminAuthData.username || adminAuthData.username.trim().length < 3) {
      setAdminAuthError("Username minimal 3 karakter.");
      return;
    }

    if (adminAuthData.newPassword) {
      if (adminAuthData.newPassword.length < 5) {
        setAdminAuthError("Kata sandi baru minimal 5 karakter.");
        return;
      }
      if (adminAuthData.newPassword !== adminAuthData.confirmPassword) {
        setAdminAuthError("Konfirmasi kata sandi baru tidak sama.");
        return;
      }
      if (!adminAuthData.oldPassword) {
        setAdminAuthError("Harap masukkan kata sandi lama untuk verifikasi perubahan.");
        return;
      }
    }

    setAdminAuthSaving(true);
    try {
      const res = await apiUpdateAdminCredentials(token, {
        username: adminAuthData.username,
        name: adminAuthData.name,
        oldPassword: adminAuthData.oldPassword || undefined,
        newPassword: adminAuthData.newPassword || undefined
      });

      if (res.success) {
        setAdminAuthSuccess(res.message);
        setAdminAuthData((prev) => ({
          ...prev,
          oldPassword: "",
          newPassword: "",
          confirmPassword: ""
        }));
        setTimeout(() => setAdminAuthSuccess(null), 4000);
      } else {
        setAdminAuthError(res.message);
      }
    } catch (err) {
      setAdminAuthError("Gagal memperbarui data login Admin.");
    } finally {
      setAdminAuthSaving(false);
    }
  };

  // BACKUP & RESTORE HANDLERS
  const handleDownloadBackup = async () => {
    if (!token) return;
    setIsExporting(true);
    setBackupErrorMsg(null);
    setBackupSuccessMsg(null);
    try {
      const res = await apiExportAllBackupData(token);
      if (res.success && res.data) {
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement("a");
        const cleanSchool = (res.data.metadata.schoolName || "Sekolah").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
        const dateStr = new Date().toISOString().split("T")[0];
        downloadAnchor.href = url;
        downloadAnchor.download = `cadangan_sims_${cleanSchool}_${dateStr}.json`;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        URL.revokeObjectURL(url);
        setBackupSuccessMsg("Berkas cadangan (.JSON) berhasil diunduh dan tersimpan di perangkat Anda!");
        setTimeout(() => setBackupSuccessMsg(null), 6000);
      } else {
        setBackupErrorMsg(res.message || "Gagal menyiapkan berkas cadangan.");
      }
    } catch (e: any) {
      setBackupErrorMsg("Terjadi kegagalan saat mengekspor: " + (e?.message || ""));
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupErrorMsg(null);
    setBackupSuccessMsg(null);
    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || (typeof parsed !== "object")) {
          throw new Error("Format JSON tidak valid.");
        }
        if (!parsed.metadata && !parsed.settings && !parsed.siswaList) {
          throw new Error("File ini bukan berkas cadangan resmi sistem SIMS Sekolah.");
        }
        setBackupFileBundle(parsed);
      } catch (err: any) {
        setBackupErrorMsg("Gagal membaca file: " + (err?.message || "Struktur JSON tidak sesuai."));
        setBackupFileBundle(null);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyRestore = async () => {
    if (!token || !backupFileBundle) return;
    setIsImporting(true);
    setBackupErrorMsg(null);
    setBackupSuccessMsg(null);
    try {
      const res = await apiImportBackupData(token, backupFileBundle);
      if (res.success) {
        setBackupSuccessMsg(res.message);
        setBackupFileBundle(null);
        setSelectedFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        // Refresh form data
        const resSettings = await apiGetSettings(token);
        if (resSettings.success && resSettings.data) {
          setFormData({
            ...resSettings.data,
            hariOperasional: resSettings.data.hariOperasional || ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
          });
        }
        setTimeout(() => setBackupSuccessMsg(null), 8000);
      } else {
        setBackupErrorMsg(res.message);
      }
    } catch (e: any) {
      setBackupErrorMsg("Gagal memulihkan cadangan: " + (e?.message || ""));
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmFactoryReset = async () => {
    if (!token) return;
    setIsResetting(true);
    setBackupErrorMsg(null);
    setBackupSuccessMsg(null);
    try {
      const res = await apiResetToFactoryDefault(token);
      if (res.success) {
        setShowResetModal(false);
        setBackupSuccessMsg("Sistem telah berhasil dikembalikan ke pengaturan dan data awal bawaan pabrik.");
        const resSettings = await apiGetSettings(token);
        if (resSettings.success && resSettings.data) {
          setFormData({
            ...resSettings.data,
            hariOperasional: resSettings.data.hariOperasional || ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
          });
        }
        setTimeout(() => setBackupSuccessMsg(null), 8000);
      } else {
        setBackupErrorMsg(res.message);
      }
    } catch (e: any) {
      setBackupErrorMsg("Gagal mereset: " + (e?.message || ""));
    } finally {
      setIsResetting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev: any) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev: any) => {
      const currentDays = prev.hariOperasional || [];
      const updated = currentDays.includes(day)
        ? currentDays.filter((d: string) => d !== day)
        : [...currentDays, day];
      return { ...prev, hariOperasional: updated };
    });
  };

  const handleDailyScheduleChange = (
    roleType: "Guru" | "Siswa",
    day: string,
    field: "masuk" | "pulang" | "aktif",
    value: any
  ) => {
    const key = roleType === "Guru" ? "jadwalHarianGuru" : "jadwalHarianSiswa";
    setFormData((prev: any) => {
      const currentSchedule = prev[key] || {};
      const dayData = currentSchedule[day] || { masuk: "07:00", pulang: "15:00", aktif: true };
      return {
        ...prev,
        [key]: {
          ...currentSchedule,
          [day]: {
            ...dayData,
            [field]: value
          }
        }
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev: any) => ({ ...prev, [fieldName]: event.target?.result }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (fieldName: string) => {
    setFormData((prev: any) => ({ ...prev, [fieldName]: null }));
  };

  // GPS BROWSER GEOLOCATION DETECTION
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("Perangkat atau peramban Anda tidak mendukung deteksi geolokasi.");
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setFormData((prev: any) => ({
          ...prev,
          koordinatSekolah: `${lat}, ${lng}`
        }));
        setIsDetectingGps(false);
        setSuccessMsg(`Titik GPS berhasil diperbarui: [${lat}, ${lng}] dengan akurasi ±${Math.round(pos.coords.accuracy)}m.`);
        setTimeout(() => setSuccessMsg(null), 4000);
      },
      (err) => {
        setIsDetectingGps(false);
        let msg = "Gagal mengambil koordinat lokasi.";
        if (err.code === 1) msg = "Izin akses lokasi ditolak oleh peramban. Harap izinkan akses lokasi di peramban Anda.";
        else if (err.code === 2) msg = "Informasi posisi GPS tidak tersedia.";
        else if (err.code === 3) msg = "Waktu permintaan geolokasi habis (timeout).";
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setIsSaving(true);
    setSuccessMsg(null);
    setError(null);
    
    try {
      const res = await apiUpdateSettings(token, formData);
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Gagal menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper calculation for tolerance preview
  const calculateLateThreshold = (baseTime: string, toleranceMin: number) => {
    if (!baseTime) return "--:--";
    const parts = baseTime.split(":");
    if (parts.length !== 2) return "--:--";
    const hours = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    const totalMins = hours * 60 + mins + toleranceMin;
    const finalH = Math.floor(totalMins / 60) % 24;
    const finalM = totalMins % 60;
    return `${String(finalH).padStart(2, "0")}:${String(finalM).padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Memuat Pengaturan Sistem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pengaturan Sistem & Geofencing</h1>
          <p className="text-sm text-gray-500 mt-1">Konfigurasi profil instansi, aturan jam presensi, dan radius batas geofencing GPS.</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center space-x-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* TABS NAVIGATION */}
        <div className="flex border-b border-gray-200 overflow-x-auto bg-gray-50/70 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("profil")}
            className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
              activeTab === "profil" 
                ? "bg-white text-blue-600 shadow-xs border border-gray-200" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Profil Sekolah</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("waktu")}
            className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
              activeTab === "waktu" 
                ? "bg-white text-blue-600 shadow-xs border border-gray-200" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Aturan Waktu & Hari</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("lokasi")}
            className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
              activeTab === "lokasi" 
                ? "bg-white text-blue-600 shadow-xs border border-gray-200" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Geofencing & GPS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("kebijakan")}
            className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
              activeTab === "kebijakan" 
                ? "bg-white text-blue-600 shadow-xs border border-gray-200" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Kebijakan Keamanan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("aset")}
            className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
              activeTab === "aset" 
                ? "bg-white text-blue-600 shadow-xs border border-gray-200" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Aset Visual</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("admin_auth")}
            className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
              activeTab === "admin_auth" 
                ? "bg-white text-emerald-600 shadow-xs border border-gray-200" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Akun Login Admin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("backup");
              setBackupErrorMsg(null);
              setBackupSuccessMsg(null);
            }}
            className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
              activeTab === "backup" 
                ? "bg-white text-indigo-600 shadow-xs border border-gray-200" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Database className="w-4 h-4 text-indigo-500" />
            <span>Cadangkan Data (Backup)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("database_master")}
            className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
              activeTab === "database_master" 
                ? "bg-white text-purple-700 shadow-xs border border-gray-200" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Server className="w-4 h-4 text-purple-600" />
            <span>Database & Drive Master</span>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6">
          {/* TAB 1: PROFIL SEKOLAH */}
          {activeTab === "profil" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Identitas Resmi Institusi</h3>
                  <p className="text-xs text-gray-500">Informasi ini akan tercantum pada kop surat laporan, kartu absen, dan bukti kehadiran.</p>
                </div>
                <div className="hidden sm:flex items-center space-x-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                  <School className="w-3.5 h-3.5" />
                  <span>Akreditasi: {formData.akreditasi || "A"}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Nama Sekolah / Lembaga</label>
                  <input 
                    type="text" 
                    required
                    name="schoolName" 
                    value={formData.schoolName || ""} 
                    onChange={handleChange} 
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">NPSN</label>
                  <input 
                    type="text" 
                    name="npsn" 
                    placeholder="20104567"
                    value={formData.npsn || ""} 
                    onChange={handleChange} 
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Jenjang Pendidikan</label>
                  <select
                    name="jenjang"
                    value={formData.jenjang || "SMP"}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                  >
                    <option value="SD">SD / Madrasah Ibtidaiyah</option>
                    <option value="SMP">SMP / Madrasah Tsanawiyah</option>
                    <option value="SMA">SMA / Madrasah Aliyah</option>
                    <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Akreditasi</label>
                  <select
                    name="akreditasi"
                    value={formData.akreditasi || "A"}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                  >
                    <option value="A">Unggul (A)</option>
                    <option value="B">Baik Sekali (B)</option>
                    <option value="C">Baik (C)</option>
                    <option value="Belum">Belum Terakreditasi</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Nomor Telepon Kantor</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      name="phone" 
                      value={formData.phone || ""} 
                      onChange={handleChange} 
                      className="w-full pl-9 pr-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Nama Kepala Sekolah</label>
                  <input 
                    type="text" 
                    name="kepalaSekolah" 
                    value={formData.kepalaSekolah || ""} 
                    onChange={handleChange} 
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">NIP Kepala Sekolah</label>
                  <input 
                    type="text" 
                    name="nipKepalaSekolah" 
                    placeholder="196805121994031002"
                    value={formData.nipKepalaSekolah || ""} 
                    onChange={handleChange} 
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Email Resmi</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email || ""} 
                      onChange={handleChange} 
                      className="w-full pl-9 pr-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Website / Portal Sekolah</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      name="website" 
                      placeholder="https://..."
                      value={formData.website || ""} 
                      onChange={handleChange} 
                      className="w-full pl-9 pr-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Alamat Lengkap Sekolah</label>
                  <textarea 
                    name="address" 
                    rows={2} 
                    value={formData.address || ""} 
                    onChange={handleChange} 
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATURAN WAKTU & HARI KERJA */}
          {activeTab === "waktu" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b pb-3">
                <h3 className="text-base font-bold text-gray-900">Konfigurasi Jam & Hari Operasional</h3>
                <p className="text-xs text-gray-500">Aturan waktu kedatangan dan toleransi keterlambatan untuk mendeteksi absensi otomatis.</p>
              </div>

              {/* HARI KERJA CHECKLIST */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase">Hari Operasional Belajar-Mengajar</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => {
                    const isChecked = formData.hariOperasional?.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => handleDayToggle(day)}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                          isChecked 
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs" 
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-500">Hari yang tidak dipilih akan dianggap sebagai hari libur (absen tidak diwajibkan).</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* JADWAL GURU PER HARI */}
                <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center space-x-2.5 text-blue-900 font-bold text-sm">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-gray-900 font-bold text-sm">Jadwal Tenaga Pendidik (Guru)</div>
                        <div className="text-[11px] text-gray-500 font-normal">Atur batas masuk & jam pulang per hari secara spesifik</div>
                      </div>
                    </div>

                    <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => setFormData((p: any) => ({ ...p, modeJadwalGuru: "per_hari" }))}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                          formData.modeJadwalGuru !== "seragam"
                            ? "bg-white text-blue-700 shadow-xs"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Per Hari
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((p: any) => ({ ...p, modeJadwalGuru: "seragam" }))}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                          formData.modeJadwalGuru === "seragam"
                            ? "bg-white text-blue-700 shadow-xs"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Seragam
                      </button>
                    </div>
                  </div>

                  {formData.modeJadwalGuru === "seragam" ? (
                    <div className="space-y-3 pt-1">
                      <p className="text-xs text-gray-500">Jam ini berlaku sama untuk semua hari kerja aktif.</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-xs text-gray-600 font-medium">Batas Jam Masuk</label>
                          <input 
                            type="time" 
                            name="jamMasukGuru" 
                            value={formData.jamMasukGuru || "07:00"} 
                            onChange={handleChange} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-semibold" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs text-gray-600 font-medium">Jam Pulang Standar</label>
                          <input 
                            type="time" 
                            name="jamPulangGuru" 
                            value={formData.jamPulangGuru || "15:00"} 
                            onChange={handleChange} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-semibold" 
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-12 text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">
                        <div className="col-span-3">Hari</div>
                        <div className="col-span-4 text-center">Batas Masuk</div>
                        <div className="col-span-4 text-center">Jam Pulang</div>
                        <div className="col-span-1 text-right">Status</div>
                      </div>

                      <div className="space-y-2">
                        {daysOfWeek.map((day) => {
                          const sched = formData.jadwalHarianGuru?.[day] || { masuk: "07:00", pulang: "15:00", aktif: formData.hariOperasional?.includes(day) };
                          const isOperasional = formData.hariOperasional?.includes(day);

                          return (
                            <div 
                              key={day} 
                              className={`grid grid-cols-12 items-center gap-2 p-2.5 rounded-xl border transition-all ${
                                isOperasional 
                                  ? day === "Jumat"
                                    ? "bg-emerald-50/50 border-emerald-200"
                                    : "bg-gray-50 border-gray-200"
                                  : "bg-gray-50/40 border-dashed border-gray-200 opacity-60"
                              }`}
                            >
                              <div className="col-span-3 flex items-center gap-1.5">
                                <span className={`text-xs font-bold ${isOperasional ? "text-gray-900" : "text-gray-400"}`}>
                                  {day}
                                </span>
                                {day === "Jumat" && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded-sm">
                                    Pendek
                                  </span>
                                )}
                              </div>

                              <div className="col-span-4">
                                <input 
                                  type="time" 
                                  disabled={!isOperasional}
                                  value={sched.masuk || "07:00"} 
                                  onChange={(e) => handleDailyScheduleChange("Guru", day, "masuk", e.target.value)} 
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-semibold text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                                />
                              </div>

                              <div className="col-span-4">
                                <input 
                                  type="time" 
                                  disabled={!isOperasional}
                                  value={sched.pulang || "15:00"} 
                                  onChange={(e) => handleDailyScheduleChange("Guru", day, "pulang", e.target.value)} 
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-semibold text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                                />
                              </div>

                              <div className="col-span-1 text-right">
                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${isOperasional ? "bg-emerald-500" : "bg-gray-300"}`} title={isOperasional ? "Hari Kerja Aktif" : "Hari Libur"}></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-1 text-[11px] text-gray-500 flex items-center justify-between">
                        <span>💡 Hari Jumat atau hari tertentu bisa disetel pulang lebih awal (misal: 11:30).</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* JADWAL SISWA PER HARI */}
                <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center space-x-2.5 text-indigo-900 font-bold text-sm">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-gray-900 font-bold text-sm">Jadwal Peserta Didik (Siswa)</div>
                        <div className="text-[11px] text-gray-500 font-normal">Atur batas masuk kelas & jam pulang per hari</div>
                      </div>
                    </div>

                    <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => setFormData((p: any) => ({ ...p, modeJadwalSiswa: "per_hari" }))}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                          formData.modeJadwalSiswa !== "seragam"
                            ? "bg-white text-indigo-700 shadow-xs"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Per Hari
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((p: any) => ({ ...p, modeJadwalSiswa: "seragam" }))}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                          formData.modeJadwalSiswa === "seragam"
                            ? "bg-white text-indigo-700 shadow-xs"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Seragam
                      </button>
                    </div>
                  </div>

                  {formData.modeJadwalSiswa === "seragam" ? (
                    <div className="space-y-3 pt-1">
                      <p className="text-xs text-gray-500">Jam ini berlaku sama untuk semua hari sekolah aktif.</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-xs text-gray-600 font-medium">Batas Masuk Kelas</label>
                          <input 
                            type="time" 
                            name="jamMasukSiswa" 
                            value={formData.jamMasukSiswa || "07:15"} 
                            onChange={handleChange} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-semibold" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs text-gray-600 font-medium">Jam Pulang Sekolah</label>
                          <input 
                            type="time" 
                            name="jamPulangSiswa" 
                            value={formData.jamPulangSiswa || "14:00"} 
                            onChange={handleChange} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-semibold" 
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-12 text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">
                        <div className="col-span-3">Hari</div>
                        <div className="col-span-4 text-center">Batas Masuk</div>
                        <div className="col-span-4 text-center">Jam Pulang</div>
                        <div className="col-span-1 text-right">Status</div>
                      </div>

                      <div className="space-y-2">
                        {daysOfWeek.map((day) => {
                          const sched = formData.jadwalHarianSiswa?.[day] || { masuk: "07:15", pulang: "14:00", aktif: formData.hariOperasional?.includes(day) };
                          const isOperasional = formData.hariOperasional?.includes(day);

                          return (
                            <div 
                              key={day} 
                              className={`grid grid-cols-12 items-center gap-2 p-2.5 rounded-xl border transition-all ${
                                isOperasional 
                                  ? day === "Senin"
                                    ? "bg-amber-50/50 border-amber-200"
                                    : day === "Jumat"
                                    ? "bg-emerald-50/50 border-emerald-200"
                                    : "bg-gray-50 border-gray-200"
                                  : "bg-gray-50/40 border-dashed border-gray-200 opacity-60"
                              }`}
                            >
                              <div className="col-span-3 flex items-center gap-1.5">
                                <span className={`text-xs font-bold ${isOperasional ? "text-gray-900" : "text-gray-400"}`}>
                                  {day}
                                </span>
                                {day === "Senin" && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded-sm">
                                    Upacara
                                  </span>
                                )}
                                {day === "Jumat" && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded-sm">
                                    Pendek
                                  </span>
                                )}
                              </div>

                              <div className="col-span-4">
                                <input 
                                  type="time" 
                                  disabled={!isOperasional}
                                  value={sched.masuk || "07:15"} 
                                  onChange={(e) => handleDailyScheduleChange("Siswa", day, "masuk", e.target.value)} 
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-semibold text-center focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                                />
                              </div>

                              <div className="col-span-4">
                                <input 
                                  type="time" 
                                  disabled={!isOperasional}
                                  value={sched.pulang || "14:00"} 
                                  onChange={(e) => handleDailyScheduleChange("Siswa", day, "pulang", e.target.value)} 
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-semibold text-center focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                                />
                              </div>

                              <div className="col-span-1 text-right">
                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${isOperasional ? "bg-emerald-500" : "bg-gray-300"}`} title={isOperasional ? "Hari Sekolah Aktif" : "Hari Libur"}></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-1 text-[11px] text-gray-500 flex items-center justify-between">
                        <span>💡 Hari Senin (Upacara) bisa diatur masuk lebih awal (misal: 06:45).</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* TOLERANSI KETERLAMBATAN */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-amber-900">Toleransi Keterlambatan</h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Jumlah menit toleransi setelah jam batas masuk resmi sebelum sistem menandai status sebagai <strong>Terlambat</strong>.
                    </p>
                    
                    <div className="mt-3 flex items-center space-x-3 max-w-xs">
                      <input 
                        type="number" 
                        min="0" 
                        max="60"
                        name="toleransiKeterlambatan" 
                        value={formData.toleransiKeterlambatan || 15} 
                        onChange={handleChange} 
                        className="w-24 px-3 py-1.5 border border-amber-300 rounded-lg text-sm bg-white font-bold" 
                      />
                      <span className="text-sm font-medium text-amber-900">Menit</span>
                    </div>

                    <div className="mt-3 p-2.5 bg-white/80 rounded-lg border border-amber-200 text-xs text-gray-700 space-y-1">
                      <div>
                        • Siswa hadir setelah <strong>{calculateLateThreshold(formData.jamMasukSiswa, parseInt(formData.toleransiKeterlambatan || 0, 10))}</strong> terhitung <span className="text-amber-700 font-bold">Terlambat</span>.
                      </div>
                      <div>
                        • Guru hadir setelah <strong>{calculateLateThreshold(formData.jamMasukGuru, parseInt(formData.toleransiKeterlambatan || 0, 10))}</strong> terhitung <span className="text-amber-700 font-bold">Terlambat</span>.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GEOFENCING & GPS */}
          {activeTab === "lokasi" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b pb-3">
                <h3 className="text-base font-bold text-gray-900">Titik Koordinat Sekolah & Radius Geofencing</h3>
                <p className="text-xs text-gray-500">Menetapkan koordinat gerbang/pusat sekolah untuk memvalidasi posisi presensi fisik pengguna.</p>
              </div>

              {gpsError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center space-x-3 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{gpsError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* FORM INPUTS */}
                <div className="lg:col-span-6 space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-700 uppercase">Titik Koordinat (Latitude, Longitude)</label>
                      <button
                        type="button"
                        onClick={handleDetectGPS}
                        disabled={isDetectingGps}
                        className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {isDetectingGps ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1 text-blue-600" />
                        ) : (
                          <Crosshair className="w-3.5 h-3.5 mr-1" />
                        )}
                        Ambil GPS Perangkat
                      </button>
                    </div>

                    <input 
                      type="text" 
                      required
                      name="koordinatSekolah" 
                      placeholder="-6.200000, 106.816666" 
                      value={formData.koordinatSekolah || ""} 
                      onChange={handleChange} 
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono text-gray-800 bg-white" 
                    />
                    <p className="text-[11px] text-gray-500">
                      Format desimal: <code>Lintang, Bujur</code> (contoh: <code>-6.208763, 106.845599</code>).
                    </p>
                  </div>

                  {/* RADIUS PRESETS */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-700 uppercase">Radius Toleransi Geofence (Meter)</label>
                    <div className="flex items-center space-x-3">
                      <input 
                        type="number" 
                        min="10" 
                        max="1000"
                        name="radiusAbsen" 
                        value={formData.radiusAbsen || "50"} 
                        onChange={handleChange} 
                        className="w-28 px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold" 
                      />
                      <span className="text-sm font-medium text-gray-600">Meter</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {radiusPresets.map((r) => (
                        <button
                          type="button"
                          key={r}
                          onClick={() => setFormData((p: any) => ({ ...p, radiusAbsen: r.toString() }))}
                          className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
                            formData.radiusAbsen === r.toString()
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {r} Meter
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* VERIFY IN EXTERNAL GOOGLE MAPS */}
                  {formData.koordinatSekolah && (
                    <div className="pt-2">
                      <a 
                        href={`https://www.google.com/maps?q=${encodeURIComponent(formData.koordinatSekolah)}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Buka Titik Koordinat di Google Maps
                      </a>
                    </div>
                  )}
                </div>

                {/* VISUAL GEOFENCE RADAR SIMULATOR */}
                <div className="lg:col-span-6 bg-slate-900 rounded-xl p-5 text-white flex flex-col justify-between relative overflow-hidden border border-slate-800">
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-xs font-semibold text-slate-200">Radar Geofencing Aktif</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">Radius: {formData.radiusAbsen || 50}m</span>
                  </div>

                  {/* RADAR CIRCLE VISUALIZER */}
                  <div className="my-8 flex items-center justify-center relative">
                    <div className="w-48 h-48 rounded-full border border-blue-500/30 flex items-center justify-center animate-ping duration-1000 opacity-20 absolute"></div>
                    <div className="w-44 h-44 rounded-full border border-blue-400/40 flex items-center justify-center bg-blue-950/40 relative">
                      <div className="w-32 h-32 rounded-full border border-blue-400/60 flex items-center justify-center bg-blue-900/30">
                        <div className="w-20 h-20 rounded-full border border-blue-300 flex items-center justify-center bg-blue-500/20">
                          {/* CENTER PIN */}
                          <div className="p-2 rounded-full bg-red-600 text-white shadow-lg shadow-red-500/50">
                            <MapPin className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                      
                      {/* ACCURACY MARK */}
                      <div className="absolute bottom-2 text-[10px] text-blue-300 font-mono">
                        Gerbang Utama
                      </div>
                    </div>
                  </div>

                  <div className="z-10 bg-slate-800/80 backdrop-blur-xs rounded-lg p-3 border border-slate-700 text-xs space-y-1">
                    <div className="text-slate-300 flex justify-between">
                      <span>Pusat Titik:</span>
                      <span className="font-mono text-white">{formData.koordinatSekolah || "Belum diatur"}</span>
                    </div>
                    <div className="text-slate-300 flex justify-between">
                      <span>Cakupan Area:</span>
                      <span className="text-emerald-400 font-semibold">Toleransi ~{formData.radiusAbsen || 50} Meter</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KEBIJAKAN & KEAMANAN PRESENSI */}
          {activeTab === "kebijakan" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b pb-3">
                <h3 className="text-base font-bold text-gray-900">Kebijakan Keamanan & Integritas Absensi</h3>
                <p className="text-xs text-gray-500">Konfigurasi validasi biometrik swafoto dan pencegahan manipulasi lokasi (fake GPS).</p>
              </div>

              <div className="space-y-4">
                {/* TOGGLE SELFIE */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-start justify-between">
                  <div className="flex items-start space-x-3.5 pr-4">
                    <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 mt-0.5">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Wajib Swafoto (Selfie Kamera Depan)</h4>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Saat melakukan absensi mandiri melalui gawai seluler, pengguna diwajibkan mengambil foto wajah secara langsung untuk mencegah kecurangan titip absen.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                    <input 
                      type="checkbox" 
                      name="requireSelfiePhoto" 
                      checked={formData.requireSelfiePhoto !== false} 
                      onChange={handleChange} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* TOGGLE STRICT GEOFENCE */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-start justify-between">
                  <div className="flex items-start space-x-3.5 pr-4">
                    <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600 mt-0.5">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Validasi Radius Ketat (Strict Geofencing)</h4>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Tolak transaksi absensi secara otomatis apabila titik GPS pengguna berada di luar batas meter yang telah ditentukan. Jika dinonaktifkan, absensi di luar radius tetap dicatat namun diberi tanda peringatan (Warning).
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                    <input 
                      type="checkbox" 
                      name="enableStrictGeofence" 
                      checked={formData.enableStrictGeofence !== false} 
                      onChange={handleChange} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* INFO CARD */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 flex items-start space-x-3 text-xs text-blue-800">
                  <Info className="w-4 h-4 flex-shrink-0 text-blue-600 mt-0.5" />
                  <span>
                    Perubahan kebijakan keamanan akan segera aktif secara global untuk semua aplikasi seluler (PWA) siswa dan guru begitu tombol <strong>Simpan Perubahan</strong> ditekan.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ASET VISUAL */}
          {activeTab === "aset" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Aset Visual, Logo & KOP Surat Resmi</h3>
                  <p className="text-xs text-gray-500">
                    Kelola Logo Kiri KOP (Input / Unggah Manual), Logo Resmi Sekolah (Kanan), Stempel, dan Tanda Tangan untuk format cetak arsip dinas, leger, dan rapor.
                  </p>
                </div>
                {(formData.logoSekolah || formData.stempelSekolah || formData.ttdKepalaSekolah) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (window.confirm("Hapus seluruh data aset visual (Logo Sekolah, Stempel, dan Tanda Tangan Kepsek) dan pertahankan Logo Kiri KOP?")) {
                        const updated = {
                          ...formData,
                          logoSekolah: null,
                          stempelSekolah: null,
                          ttdKepalaSekolah: null
                        };
                        setFormData(updated);
                        if (token) {
                          await apiUpdateSettings(token, {
                            logoSekolah: null,
                            stempelSekolah: null,
                            ttdKepalaSekolah: null
                          });
                          setSuccessMsg("Data aset visual berhasil dibersihkan (kecuali Logo Kiri KOP).");
                          setTimeout(() => setSuccessMsg(null), 3000);
                        }
                      }
                    }}
                    className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 h-8 self-start sm:self-auto shrink-0 flex items-center gap-1.5 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Aset Visual (Kecuali Logo Kiri KOP)</span>
                  </Button>
                )}
              </div>

              {/* 4 KOLOM PENGATURAN ASET */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* 1. LOGO KIRI KOP (INPUT MANUAL SAJA) */}
                <div className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-gray-800 uppercase">
                        1. Logo Kiri KOP
                      </label>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                        Input Manual Saja
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3">
                      Logo di sisi kiri KOP surat kini murni berbasis file yang Anda unggah manual (misal: Lambang Pemda, Yayasan, atau logo kustom). Tidak ada logo dinas/kementerian bawaan yang dipaksakan. Jika tidak diunggah, sisi kiri KOP akan kosong/polos.
                    </p>
                  </div>

                  {/* PREVIEW KOTAK LOGO KIRI */}
                  <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-white flex flex-col items-center justify-center min-h-[110px] relative overflow-hidden">
                    {formData.logoDinas ? (
                      <>
                        <img src={formData.logoDinas} alt="Logo Kiri KOP" className="h-16 w-16 object-contain" />
                        <button 
                          type="button" 
                          onClick={() => removeImage('logoDinas')} 
                          className="absolute top-1.5 right-1.5 p-1 bg-red-100 text-red-600 rounded-md hover:bg-red-200" 
                          title="Hapus Logo Kiri"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] text-emerald-600 mt-1.5 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Logo Manual Terpasang
                        </span>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <span className="text-xs text-gray-500 font-medium block">
                          Sisi Kiri Kosong / Polos
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          (Tidak ada logo bawaan otomatis)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-medium text-gray-600">
                      {formData.logoDinas ? "Ganti Logo Kiri:" : "Unggah Logo Kiri (Manual):"}
                    </label>
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8 font-medium text-gray-700 hover:text-gray-900 border-gray-300 bg-white"
                      >
                        <Upload className="w-3 h-3 mr-1.5" />
                        {formData.logoDinas ? "Ganti File Logo Kiri" : "Pilih File Logo Kiri"}
                      </Button>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, 'logoDinas')} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      />
                    </div>
                    {formData.logoDinas && (
                      <button
                        type="button"
                        onClick={() => removeImage('logoDinas')}
                        className="w-full text-[11px] text-red-600 hover:text-red-700 hover:underline flex items-center justify-center gap-1 mt-1"
                      >
                        <Trash2 className="w-3 h-3" /> Hapus Logo Kiri
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. LOGO RESMI SEKOLAH (KANAN KOP) */}
                <div className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-gray-800 uppercase">
                        2. Logo Sekolah (Kanan KOP)
                      </label>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        Identitas Sekolah
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3">
                      Muncul di KOP dokumen cetak, halaman Login, dan Kartu Pelajar.
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 flex flex-col items-center justify-center bg-white min-h-[140px] relative overflow-hidden group">
                    {formData.logoSekolah ? (
                      <>
                        <img src={formData.logoSekolah} alt="Logo Sekolah" className="w-24 h-24 object-contain p-1" />
                        <button 
                          type="button" 
                          onClick={() => removeImage('logoSekolah')} 
                          className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors shadow-2xs" 
                          title="Hapus Logo Sekolah"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <div className="mx-auto w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-1.5">
                          <School className="w-5 h-5" />
                        </div>
                        <p className="text-xs text-gray-700 font-semibold">Unggah Logo Sekolah</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Format PNG Transparan / JPG (Maks 2MB)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, 'logoSekolah')} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      title="" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] text-gray-400 text-center">
                      {formData.logoSekolah ? "✓ Logo kustom sekolah terpasang" : "Belum diunggah (menggunakan lencana default)"}
                    </p>
                  </div>
                </div>

                {/* 3. STEMPEL SEKOLAH */}
                <div className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-gray-800 uppercase">
                        3. Stempel Sekolah
                      </label>
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full">
                        Pengesahan
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3">
                      Stempel digital pada lembar pengesahan arsip dan e-rapor.
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 flex flex-col items-center justify-center bg-white min-h-[140px] relative overflow-hidden group">
                    {formData.stempelSekolah ? (
                      <>
                        <img src={formData.stempelSekolah} alt="Stempel" className="w-24 h-24 object-contain p-1" />
                        <button 
                          type="button" 
                          onClick={() => removeImage('stempelSekolah')} 
                          className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors shadow-2xs"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <div className="mx-auto w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mb-1.5">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs text-gray-700 font-semibold">Pilih Gambar Stempel</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Disarankan PNG Transparan (Maks 2MB)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/png,image/*" 
                      onChange={(e) => handleImageUpload(e, 'stempelSekolah')} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      title="" 
                    />
                  </div>

                  <p className="text-[10px] text-gray-400 text-center">
                    {formData.stempelSekolah ? "✓ Stempel sekolah terpasang" : "Opsional (bisa diaktifkan/dinonaktifkan)"}
                  </p>
                </div>

                {/* 4. TANDA TANGAN KEPALA SEKOLAH */}
                <div className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-gray-800 uppercase">
                        4. Tanda Tangan Kepsek
                      </label>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                        Otorisasi
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3">
                      Tanda tangan kepala sekolah pada lembar tanda tangan cetak.
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 flex flex-col items-center justify-center bg-white min-h-[140px] relative overflow-hidden group">
                    {formData.ttdKepalaSekolah ? (
                      <>
                        <img src={formData.ttdKepalaSekolah} alt="TTD Kepsek" className="w-24 h-24 object-contain p-1" />
                        <button 
                          type="button" 
                          onClick={() => removeImage('ttdKepalaSekolah')} 
                          className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors shadow-2xs"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <div className="mx-auto w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mb-1.5">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs text-gray-700 font-semibold">Pilih Tanda Tangan</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Disarankan PNG Transparan (Maks 2MB)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/png,image/*" 
                      onChange={(e) => handleImageUpload(e, 'ttdKepalaSekolah')} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      title="" 
                    />
                  </div>

                  <p className="text-[10px] text-gray-400 text-center">
                    {formData.ttdKepalaSekolah ? "✓ Tanda tangan kepsek terpasang" : "Opsional (bisa diaktifkan/dinonaktifkan)"}
                  </p>
                </div>

              </div>

              {/* TOMBOL TUKAR POSISI BILA TERTUKAR */}
              {(formData.stempelSekolah || formData.ttdKepalaSekolah) && (
                <div className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="text-xs text-amber-900">
                    <p className="font-semibold">Posisi Stempel & Tanda Tangan Tertukar?</p>
                    <p className="text-amber-700 text-[11px]">Jika gambar stempel dan tanda tangan Anda tertukar, klik tombol ini untuk menukar file keduanya secara instan.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev: any) => ({
                        ...prev,
                        stempelSekolah: prev.ttdKepalaSekolah,
                        ttdKepalaSekolah: prev.stempelSekolah
                      }));
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-xs rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-4 h-4 text-amber-700" />
                    <span>Tukar Stempel & TTD</span>
                  </button>
                </div>
              )}

              {/* LIVE REAL-TIME PREVIEW KOP SURAT RESMI */}
              <div className="border border-indigo-200 rounded-2xl bg-gradient-to-b from-indigo-50/40 via-white to-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-indigo-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">
                        Pratinjau KOP Surat Dokumen Cetak / Arsip Dinas Pendidikan
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Inilah hasil tampilan KOP surat yang akan dicetak di seluruh Buku Leger, Lembar Presensi, dan e-Rapor.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full border border-indigo-200">
                    Live Real-Time Preview
                  </span>
                </div>

                {/* LEMBAR KERTAS PRATINJAU KOP */}
                <div className="bg-white border border-gray-300 rounded-xl p-5 shadow-inner">
                  <div className="flex items-center justify-between gap-4">
                    {/* SISI KIRI: LOGO INPUT MANUAL */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                      {formData.logoDinas ? (
                        <KopLogoKiri settings={formData} className="w-full h-full" />
                      ) : (
                        <div className="w-full h-full border border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center p-1 text-center bg-gray-50/50">
                          <span className="text-[9px] text-gray-400 font-medium leading-tight">
                            (Tanpa Logo Kiri)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* TENGAH: IDENTITAS SEKOLAH */}
                    <div className="text-center flex-1">
                      <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-700">
                        PEMERINTAH DAERAH PROVINSI / KABUPATEN
                      </h4>
                      <h3 className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wide text-gray-800">
                        DINAS PENDIDIKAN DAN KEBUDAYAAN
                      </h3>
                      <h1 className="text-base sm:text-lg font-black uppercase text-gray-950 tracking-tight mt-0.5">
                        {formData.schoolName || "SMP NEGERI 1 NUSANTARA"}
                      </h1>
                      <p className="text-[10px] sm:text-[11px] text-gray-600 mt-0.5 leading-snug">
                        {formData.address || "Jl. Pendidikan No. 123, Kota Pelajar"} | Telp: {formData.phone || "021-5551234"} | NPSN: {formData.npsn || "20104567"} | Akreditasi: {formData.akreditasi || "A"}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Website: {formData.website || "https://smpn1nusantara.sch.id"} | Email: {formData.email || "info@smpn1nusantara.sch.id"}
                      </p>
                    </div>

                    {/* SISI KANAN: LOGO RESMI SEKOLAH */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                      {formData.logoSekolah ? (
                        <KopLogoKanan settings={formData} className="w-full h-full" />
                      ) : (
                        <div className="w-full h-full border border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center p-1 text-center bg-gray-50/50">
                          <span className="text-[9px] text-gray-400 font-medium leading-tight">
                            (Tanpa Logo Kanan)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* GARIS GANDA KOP DINAS (TEBAL DAN TIPIS) */}
                  <div className="border-b-[3px] border-gray-900 mt-3"></div>
                  <div className="border-b border-gray-900 mt-[2px]"></div>

                  <div className="text-center py-2 text-[10px] text-gray-400 italic">
                    — KONTEN LAPORAN / BUKU LEGER NILAI / PRESENSI SISWA AKAN TAMPIL DI BAWAH GARIS INI —
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AKUN LOGIN ADMIN */}
          {activeTab === "admin_auth" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  Kredensial & Akun Login Administrator
                </h3>
                <p className="text-xs text-gray-500">
                  Ubah Username dan Kata Sandi untuk akun Super Admin yang digunakan untuk mengelola sistem ini.
                </p>
              </div>

              {adminAuthError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{adminAuthError}</span>
                </div>
              )}

              {adminAuthSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{adminAuthSuccess}</span>
                </div>
              )}

              <div className="max-w-xl space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">
                    Nama Lengkap / Panggilan Admin
                  </label>
                  <input
                    type="text"
                    value={adminAuthData.name}
                    onChange={(e) => setAdminAuthData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Contoh: Admin Utama Sekolah"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">
                    Username Baru untuk Login
                  </label>
                  <input
                    type="text"
                    value={adminAuthData.username}
                    onChange={(e) => setAdminAuthData((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder="Contoh: admin, kepsek, atau operator"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <p className="text-[11px] text-gray-400">
                    Username ini yang Anda ketikkan pada form login saat masuk ke portal admin.
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                    Ubah Kata Sandi (Opsional)
                  </h4>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-700">
                        Kata Sandi Saat Ini (Lama)
                      </label>
                      <div className="relative">
                        <input
                          type={showOldPwd ? "text" : "password"}
                          value={adminAuthData.oldPassword}
                          onChange={(e) => setAdminAuthData((prev) => ({ ...prev, oldPassword: e.target.value }))}
                          placeholder="Masukkan kata sandi lama (default: password)"
                          className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPwd(!showOldPwd)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                          {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-700">
                          Kata Sandi Baru
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPwd ? "text" : "password"}
                            value={adminAuthData.newPassword}
                            onChange={(e) => setAdminAuthData((prev) => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="Minimal 5 karakter"
                            className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPwd(!showNewPwd)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-700">
                          Konfirmasi Kata Sandi Baru
                        </label>
                        <input
                          type="password"
                          value={adminAuthData.confirmPassword}
                          onChange={(e) => setAdminAuthData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Ulangi kata sandi baru"
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <Button
                    type="button"
                    onClick={handleSaveAdminCredentials}
                    disabled={adminAuthSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-medium"
                  >
                    {adminAuthSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <UserCheck className="w-4 h-4 mr-2" />
                    )}
                    Perbarui Akun Admin
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CADANGKAN DATA (BACKUP & RESTORE) */}
          {activeTab === "backup" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-gray-900">Cadangkan & Pulihkan Data Sistem (Backup & Restore)</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Amankan seluruh data sekolah (Data Siswa, Guru, Jadwal, Buku Leger Nilai Kurikulum Merdeka, & Pengaturan) dalam satu file arsip .JSON.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold self-start sm:self-auto border border-indigo-100">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Arsip Aman Portabel</span>
                </div>
              </div>

              {/* Feedback Alert Messages */}
              {backupSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-3 shadow-xs animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-sm font-medium">{backupSuccessMsg}</p>
                </div>
              )}

              {backupErrorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center space-x-3 shadow-xs animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <p className="text-sm font-medium">{backupErrorMsg}</p>
                </div>
              )}

              {/* DUA KARTU UTAMA */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* KARTU 1: UNDUH CADANGAN */}
                <div className="bg-gradient-to-b from-indigo-50/50 to-white rounded-xl border border-indigo-100 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Download className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">1. Unduh Cadangan Data (.JSON)</h4>
                        <p className="text-xs text-gray-500">Ekspor seluruh basis data saat ini ke komputer/HP Anda</p>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-indigo-100 mb-4 text-xs space-y-2 text-gray-600">
                      <div className="font-semibold text-gray-800 text-[11px] uppercase tracking-wider mb-1">
                        Cakupan Data yang Disimpan:
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-gray-100">
                        <span>• Data Siswa & Kontak Wali Murid</span>
                        <span className="font-mono font-semibold text-indigo-600">Aktif</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-gray-100">
                        <span>• Data Guru & Tenaga Kependidikan</span>
                        <span className="font-mono font-semibold text-indigo-600">Aktif</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-gray-100">
                        <span>• Buku Leger Nilai & e-Rapor Siswa</span>
                        <span className="font-mono font-semibold text-indigo-600">Lengkap</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span>• Konfigurasi Sekolah, Waktu, & GPS</span>
                        <span className="font-mono font-semibold text-indigo-600">Tersinkron</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Button
                      type="button"
                      onClick={handleDownloadBackup}
                      disabled={isExporting}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 shadow-xs cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Menyiapkan Berkas...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Unduh File Cadangan (.JSON)</span>
                        </>
                      )}
                    </Button>
                    <p className="text-[11px] text-gray-400 text-center mt-2">
                      File dapat disimpan di Flashdisk / Google Drive / Komputer sekolah sebagai arsip berkala.
                    </p>
                  </div>
                </div>

                {/* KARTU 2: PULIHKAN DATA */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">2. Pulihkan Data dari Berkas (.JSON)</h4>
                        <p className="text-xs text-gray-500">Unggah berkas cadangan untuk mengembalikan data</p>
                      </div>
                    </div>

                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      accept=".json,application/json" 
                      onChange={handleBackupFileChange} 
                      className="hidden" 
                    />

                    {/* Area Upload */}
                    {!backupFileBundle ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-emerald-50/20 group mb-4"
                      >
                        <FileJson className="w-10 h-10 text-gray-400 group-hover:text-emerald-600 mx-auto mb-2 transition-colors" />
                        <p className="text-xs font-semibold text-gray-700">Klik untuk memilih file cadangan (.JSON)</p>
                        <p className="text-[11px] text-gray-400 mt-1">Hanya mendukung format file JSON resmi dari SIMS</p>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 mb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                              <FileCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-emerald-950 truncate max-w-[200px] sm:max-w-xs">
                                {selectedFileName}
                              </div>
                              <p className="text-[11px] text-emerald-700 mt-0.5">
                                Terdeteksi: {backupFileBundle.metadata?.schoolName || "Sekolah"}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setBackupFileBundle(null);
                              setSelectedFileName(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="text-xs text-gray-400 hover:text-red-500 font-medium"
                          >
                            Ganti File
                          </button>
                        </div>

                        {backupFileBundle.metadata && (
                          <div className="mt-3 pt-3 border-t border-emerald-200/70 text-[11px] text-emerald-800 space-y-1">
                            <div><span className="font-semibold">Tanggal Ekspor:</span> {new Date(backupFileBundle.metadata.exportedAt).toLocaleString("id-ID")}</div>
                            <div><span className="font-semibold">Isi Data:</span> {backupFileBundle.metadata.summary || `${backupFileBundle.siswaList?.length || 0} Siswa`}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <Button
                      type="button"
                      onClick={handleApplyRestore}
                      disabled={!backupFileBundle || isImporting}
                      className={`w-full py-2.5 font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                        backupFileBundle && !isImporting
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Menerapkan Data...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Pulihkan & Terapkan Data</span>
                        </>
                      )}
                    </Button>
                    <p className="text-[11px] text-gray-400 text-center mt-2">
                      Data saat ini akan diperbarui sesuai isi berkas cadangan yang dipilih.
                    </p>
                  </div>
                </div>

              </div>

              {/* KARTU 3: RESET PABRIK */}
              <div className="bg-red-50/50 border border-red-200 rounded-xl p-5 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-red-900">Kembalikan ke Pengaturan Awal (Factory Reset)</h4>
                      <p className="text-xs text-red-700/80 mt-0.5">
                        Menghapus perubahan lokal dan mengembalikan sistem ke data sampel awal bawaan sistem.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700 text-xs font-semibold shrink-0 cursor-pointer self-start sm:self-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Reset ke Data Bawaan
                  </Button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 8: DATABASE & DRIVE MASTER (MODEL A) */}
          {activeTab === "database_master" && (
            <MasterDatabaseSettings />
          )}

          {/* SUBMIT BUTTON */}
          {activeTab !== "admin_auth" && activeTab !== "backup" && activeTab !== "database_master" && (
            <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Semua pengaturan tersimpan secara aman di sistem.
              </span>
              <Button 
                type="submit" 
                disabled={isSaving} 
                className="bg-blue-600 hover:bg-blue-700 min-w-[160px] text-white shadow-xs"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Simpan Perubahan
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* MODAL KONFIRMASI FACTORY RESET */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Konfirmasi Reset Sistem</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Apakah Anda yakin ingin mengembalikan seluruh pengaturan dan data ke bawaan awal pabrik? Seluruh perubahan konfigurasi yang belum diunduh sebagai cadangan akan dihapus.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="text-xs font-medium cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleConfirmFactoryReset}
                disabled={isResetting}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mereset...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ya, Reset Semua Data</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
