import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/useAuth";
import { apiGetClasses, apiGetSchedules, apiGetStudents, apiSubmitStudentAttendance, apiBulkSendAttendanceWhatsApp } from "@/services/api";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  UserCheck, 
  CreditCard, 
  QrCode, 
  Search, 
  Info,
  ScanLine,
  Check,
  Calendar,
  BookOpen,
  MessageSquare,
  Send,
  Sparkles,
  Users,
  GraduationCap
} from "lucide-react";
import KartuPelajarModal from "@/components/siswa/KartuPelajarModal";

type Step = "select" | "list" | "submitting" | "success";
type AttendanceMode = "wali_kelas" | "mapel";

interface Student {
  id: string;
  name: string;
  nis?: string;
  nisn?: string;
  jk?: string;
  foto?: string;
  nama_wali?: string;
  no_wa_wali?: string;
  hubungan_wali?: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface ScheduleOption {
  id: string;
  subject: string;
  time: string;
}

export default function MobileSiswa() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  const [step, setStep] = useState<Step>("select");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Data states
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Selection states
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>("wali_kelas");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  
  // Attendance state
  const [attendances, setAttendances] = useState<Record<string, string>>({}); // { studentId: "Hadir" | "Sakit" | "Izin" | "Alpa" }

  // Quick scan / search states
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanNotification, setScanNotification] = useState<string | null>(null);
  const [showQuickScan, setShowQuickScan] = useState(false);
  const [selectedCardStudent, setSelectedCardStudent] = useState<any | null>(null);

  // Phase 44: Automatic WhatsApp Notification state
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState(true);
  const [waSentSummary, setWaSentSummary] = useState<{ totalSent: number; details: any[] } | null>(null);

  // Load Classes initially
  useEffect(() => {
    const fetchClasses = async () => {
      if (!token) return;
      setIsLoading(true);
      try {
        const res = await apiGetClasses(token);
        if (res.success && res.data) {
          setClasses(res.data);
        }
      } catch (err) {
        setError("Gagal mengambil data kelas.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchClasses();
  }, [token]);

  // Load Schedules when class is selected
  useEffect(() => {
    const fetchSchedules = async () => {
      if (!token || !selectedClassId) {
        setSchedules([]);
        return;
      }
      setIsLoading(true);
      try {
        const res = await apiGetSchedules(token, selectedClassId);
        if (res.success && res.data) {
          setSchedules(res.data);
          setSelectedScheduleId(""); // Reset schedule selection
        }
      } catch (err) {
        setError("Gagal mengambil data jadwal.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedules();
  }, [token, selectedClassId]);

  const handleLanjut = async () => {
    if (!selectedClassId) {
      setError("Silakan pilih kelas terlebih dahulu.");
      return;
    }
    if (attendanceMode === "mapel" && !selectedScheduleId) {
      setError("Silakan pilih jadwal mata pelajaran terlebih dahulu.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiGetStudents(token!, selectedClassId);
      if (res.success && res.data) {
        setStudents(res.data);
        
        // Initialize attendances to empty
        const initialStatus: Record<string, string> = {};
        res.data.forEach(s => {
          initialStatus[s.id] = "";
        });
        setAttendances(initialStatus);
        setStep("list");
      }
    } catch (err) {
      setError("Gagal mengambil data siswa.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHadirSemua = () => {
    const newAttendances = { ...attendances };
    students.forEach(s => {
      newAttendances[s.id] = "Hadir";
    });
    setAttendances(newAttendances);
    setScanNotification("Semua siswa berhasil ditandai HADIR.");
    setTimeout(() => setScanNotification(null), 3000);
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendances(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleQuickBarcodeScan = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    const match = students.find(s => 
      (s.nis && s.nis.toLowerCase() === query.toLowerCase()) || 
      s.id.toLowerCase() === query.toLowerCase() ||
      s.name.toLowerCase().includes(query.toLowerCase())
    );

    if (match) {
      setAttendances(prev => ({ ...prev, [match.id]: "Hadir" }));
      setScanNotification(`✓ ${match.name} (${match.nis || match.id}) berhasil diabsen HADIR!`);
      setBarcodeInput("");
      setTimeout(() => setScanNotification(null), 3000);
    } else {
      setError(`Siswa dengan NIS / Kode "${query}" tidak ditemukan di kelas ini.`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSubmit = async () => {
    // Check if all students have a status
    const uncompleted = students.filter(s => !attendances[s.id]);
    if (uncompleted.length > 0) {
      setError(`Ada ${uncompleted.length} siswa yang belum diabsen. Mohon lengkapi status kehadiran semua siswa.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setStep("submitting");
    setError(null);

    try {
      const payload = Object.keys(attendances).map(studentId => ({
        studentId,
        status: attendances[studentId]
      }));

      const activeScheduleId = attendanceMode === "wali_kelas" ? `HARIAN_${selectedClassId}` : selectedScheduleId;
      const res = await apiSubmitStudentAttendance(token!, activeScheduleId, payload);
      
      if (res.success) {
        if (autoSendWhatsApp) {
          try {
            const scheduleObj = schedules.find(s => s.id === selectedScheduleId);
            const classObj = classes.find(c => c.id === selectedClassId);
            const scheduleLabel = attendanceMode === "wali_kelas"
              ? "Presensi Harian Siswa (Wali Kelas)"
              : (scheduleObj ? `${scheduleObj.subject} (${scheduleObj.time})` : "Kegiatan Belajar");

            const waRes = await apiBulkSendAttendanceWhatsApp(token!, {
              scheduleName: scheduleLabel,
              className: classObj ? classObj.name : "Kelas",
              teacherName: user?.name || (attendanceMode === "wali_kelas" ? "Wali Kelas" : "Guru Pengajar"),
              studentsAttendance: students.map(s => ({
                studentId: s.id,
                studentName: s.name,
                waliName: s.nama_wali || "Wali Murid",
                noWaWali: s.no_wa_wali || "081298765431",
                status: attendances[s.id] || "Hadir"
              }))
            });
            if (waRes.success && waRes.data) {
              setWaSentSummary(waRes.data);
            }
          } catch (waErr) {
            console.warn("WA dispatch error:", waErr);
          }
        }
        setStep("success");
      } else {
        setError(res.message);
        setStep("list");
      }
    } catch (err) {
      setError("Gagal terhubung ke server.");
      setStep("list");
    }
  };

  // Counts
  const hadirCount = Object.values(attendances).filter(v => v === "Hadir").length;
  const sakitCount = Object.values(attendances).filter(v => v === "Sakit").length;
  const izinCount = Object.values(attendances).filter(v => v === "Izin").length;
  const alpaCount = Object.values(attendances).filter(v => v === "Alpa").length;
  const belumCount = students.filter(s => !attendances[s.id]).length;

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.nis && s.nis.includes(searchQuery))
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-4 py-3.5 border-b border-gray-200 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => step === "list" ? setStep("select") : navigate("/guru/home")} 
            className="p-1.5 -ml-1 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">Absensi Siswa oleh Guru</h1>
            <p className="text-xs text-gray-500">Pencatatan presensi kelas oleh pengajar</p>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => navigate("/guru/leger")} 
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold border border-blue-200 active:scale-95 transition"
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Buku Leger</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col p-4 relative pb-28 max-w-lg mx-auto w-full">
        {/* Banner Penjelasan Alur Presensi Siswa */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-start space-x-3 shadow-xs">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 leading-relaxed">
            <span className="font-semibold text-blue-950">Presensi Guru: </span>
            Siswa tidak diwajibkan memiliki akun login. Seluruh presensi siswa dicatat langsung oleh Guru atau melalui pemindaian kartu pelajar fisik/barcode siswa.
          </div>
        </div>

        {error && (step === "select" || step === "list") && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl flex items-start space-x-3 mb-4 shadow-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-medium leading-snug">{error}</p>
          </div>
        )}

        {scanNotification && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center space-x-2 mb-4 shadow-sm animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-xs font-semibold">{scanNotification}</p>
          </div>
        )}

        {/* STEP 1: SELECT CLASS & SCHEDULE */}
        {step === "select" && (
          <div className="space-y-4">
            {/* Mode Presensi Selector */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Model Presensi
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  attendanceMode === "wali_kelas"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                }`}>
                  {attendanceMode === "wali_kelas" ? "Harian Siswa" : "Per Mata Pelajaran"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/90 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setAttendanceMode("wali_kelas");
                    setError(null);
                  }}
                  className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    attendanceMode === "wali_kelas"
                      ? "bg-white text-blue-700 shadow-sm border border-blue-100"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <Users className="w-4 h-4" />
                    <span>Wali Kelas</span>
                  </div>
                  <span className="text-[10px] font-normal text-gray-500 mt-0.5">Absensi Harian Pagi</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttendanceMode("mapel");
                    setError(null);
                  }}
                  className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    attendanceMode === "mapel"
                      ? "bg-white text-blue-700 shadow-sm border border-blue-100"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>Per Mapel</span>
                  </div>
                  <span className="text-[10px] font-normal text-gray-500 mt-0.5">Sesi Jam Pelajaran</span>
                </button>
              </div>
            </div>

            {/* Form Input Detail */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-gray-800 font-semibold text-sm border-b border-gray-100 pb-3">
                {attendanceMode === "wali_kelas" ? (
                  <>
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    <span>Presensi Harian Kelas Binaan</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>Pilih Kelas & Mata Pelajaran</span>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  {attendanceMode === "wali_kelas" ? "Pilih Kelas Binaan" : "Pilih Kelas"}
                </label>
                {isLoading && classes.length === 0 ? (
                  <div className="flex items-center space-x-2 text-gray-500 text-xs py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Memuat daftar kelas...</span>
                  </div>
                ) : (
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="block w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                  >
                    <option value="" disabled>-- Pilih Kelas --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {attendanceMode === "wali_kelas" ? (
                <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-start space-x-3">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900 leading-relaxed">
                    <p className="font-bold">Mode Presensi Wali Kelas (Harian)</p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Catat kehadiran pagi siswa untuk 1 hari penuh. Anda tidak perlu memilih jadwal mata pelajaran.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Jadwal / Mata Pelajaran
                  </label>
                  {isLoading && selectedClassId && schedules.length === 0 ? (
                    <div className="flex items-center space-x-2 text-gray-500 text-xs py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Memuat jadwal pelajaran...</span>
                    </div>
                  ) : (
                    <select
                      value={selectedScheduleId}
                      onChange={(e) => setSelectedScheduleId(e.target.value)}
                      disabled={!selectedClassId || schedules.length === 0}
                      className="block w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="" disabled>
                        {selectedClassId ? "-- Pilih Jadwal --" : "Pilih kelas terlebih dahulu"}
                      </option>
                      {schedules.map(s => (
                        <option key={s.id} value={s.id}>{s.subject} ({s.time})</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
            
            <Button 
              onClick={handleLanjut} 
              disabled={isLoading || !selectedClassId || (attendanceMode === "mapel" && !selectedScheduleId)} 
              className="w-full h-12 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memuat Siswa...</span>
                </div>
              ) : attendanceMode === "wali_kelas" ? (
                "Buka Daftar Presensi Wali Kelas"
              ) : (
                "Buka Daftar Presensi Mapel"
              )}
            </Button>
          </div>
        )}

        {/* STEP 2: LIST STUDENTS */}
        {step === "list" && (
          <div className="space-y-4">
            {/* Class Info Header & Shortcut */}
            <div className="bg-white border border-gray-200 p-3.5 rounded-xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {classes.find(c => c.id === selectedClassId)?.name}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                      attendanceMode === "wali_kelas"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                    }`}>
                      {attendanceMode === "wali_kelas" ? "Wali Kelas (Harian)" : "Per Mapel"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 font-medium">
                    {attendanceMode === "wali_kelas" 
                      ? `Presensi Harian • ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}` 
                      : `${schedules.find(s => s.id === selectedScheduleId)?.subject || 'Mapel'} (${schedules.find(s => s.id === selectedScheduleId)?.time || ''})`
                    }
                  </p>
                </div>
                <Button 
                  onClick={handleHadirSemua} 
                  size="sm" 
                  variant="outline" 
                  className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-semibold"
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  Hadir Semua
                </Button>
              </div>

              {/* Status Counters */}
              <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-gray-100 text-center">
                <div className="bg-emerald-50 rounded-lg p-1.5 border border-emerald-100">
                  <p className="text-[10px] text-emerald-600 font-medium">Hadir</p>
                  <p className="text-sm font-bold text-emerald-800">{hadirCount}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-1.5 border border-blue-100">
                  <p className="text-[10px] text-blue-600 font-medium">Sakit</p>
                  <p className="text-sm font-bold text-blue-800">{sakitCount}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-1.5 border border-amber-100">
                  <p className="text-[10px] text-amber-600 font-medium">Izin</p>
                  <p className="text-sm font-bold text-amber-800">{izinCount}</p>
                </div>
                <div className="bg-rose-50 rounded-lg p-1.5 border border-rose-100">
                  <p className="text-[10px] text-rose-600 font-medium">Alpa</p>
                  <p className="text-sm font-bold text-rose-800">{alpaCount}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-1.5 border border-gray-200">
                  <p className="text-[10px] text-gray-500 font-medium">Belum</p>
                  <p className="text-sm font-bold text-gray-700">{belumCount}</p>
                </div>
              </div>
            </div>

            {/* Automatic WhatsApp Gateway Notification Toggle (Phase 44) */}
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-950">Kirim Notifikasi WhatsApp Wali</span>
                    <span className="text-[9px] bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">Phase 44</span>
                  </div>
                  <p className="text-[10px] text-emerald-700">Kirim otomatis hasil absensi ke nomor WA orang tua</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={autoSendWhatsApp} 
                  onChange={(e) => setAutoSendWhatsApp(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Quick Barcode Scan / NIS Input Toolbar */}
            <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 flex items-center">
                  <ScanLine className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  Pindai Kartu / Masukkan NIS
                </span>
                <span className="text-[10px] text-gray-400">Tekan Enter untuk tandai Hadir</span>
              </div>
              <form onSubmit={handleQuickBarcodeScan} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Ketik/Scan NIS (cth: 2023001)..."
                    className="w-full text-xs pl-3 pr-8 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50"
                  />
                  {barcodeInput && (
                    <button 
                      type="button" 
                      onClick={() => setBarcodeInput("")}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <Button type="submit" size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 px-3">
                  Check-in
                </Button>
              </form>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau nomor NIS siswa..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
            </div>

            {/* Student List */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  Tidak ada siswa yang sesuai dengan pencarian "{searchQuery}".
                </div>
              ) : (
                filteredStudents.map((student, index) => {
                  const studentStatus = attendances[student.id];

                  return (
                    <div key={student.id} className="p-3.5 flex flex-col space-y-2.5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {student.foto ? (
                              <img src={student.foto} alt={student.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              student.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 leading-tight">{student.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-gray-400">NIS: {student.nis || `S00${index + 1}`}</span>
                              {student.nama_wali && (
                                <>
                                  <span className="text-[10px] text-gray-300">•</span>
                                  <span className="text-[10px] text-emerald-700 font-medium">Wali: {student.nama_wali}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons (WA Wali & Digital Card) */}
                        <div className="flex items-center space-x-1.5">
                          {student.no_wa_wali && (
                            <a
                              href={`https://wa.me/${student.no_wa_wali.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                attendanceMode === "wali_kelas"
                                  ? `Yth. ${student.nama_wali || 'Bpk/Ibu Wali Murid'},\n\nKami menginformasikan presensi harian ananda *${student.name}* (${classes.find(c => c.id === selectedClassId)?.name || 'Kelas'}) hari ini berstatus *${studentStatus || 'Hadir'}*.\n\nSalam,\n*${user?.name || 'Wali Kelas'}*`
                                  : `Yth. ${student.nama_wali || 'Bpk/Ibu Wali Murid'},\n\nKami menginformasikan presensi ananda *${student.name}* (${classes.find(c => c.id === selectedClassId)?.name || 'Kelas'}) untuk mata pelajaran *${schedules.find(s => s.id === selectedScheduleId)?.subject || 'Pelajaran'}* hari ini berstatus *${studentStatus || 'Hadir'}*.\n\nSalam,\n*${user?.name || 'Guru Pengajar'}*`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              title={`Chat WhatsApp Wali (${student.nama_wali}: ${student.no_wa_wali})`}
                              className="inline-flex items-center px-2 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors"
                            >
                              <MessageSquare className="w-3 h-3 mr-1 text-emerald-600" />
                              <span>WA</span>
                            </a>
                          )}

                          {/* Button preview digital student card */}
                          <button
                            type="button"
                            onClick={() => setSelectedCardStudent({
                              id: student.id,
                              nama: student.name,
                              nis: student.nis || "2023001",
                              nisn: student.nisn || "0087654321",
                              kelas: classes.find(c => c.id === selectedClassId)?.name || "Kelas 7A",
                              jenis_kelamin: student.jk === 'P' ? 'Perempuan' : 'Laki-laki',
                              golongan_darah: "O",
                              tempat_lahir: "Jakarta",
                              tanggal_lahir: "14 Mei 2011",
                              foto: student.foto || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
                              berlaku_hingga: "30 Juni 2027"
                            })}
                            className="inline-flex items-center px-2 py-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors"
                            title="Lihat Kartu Pelajar Digital"
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            <span>Kartu</span>
                          </button>
                        </div>
                      </div>

                      {/* Status Action Buttons */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {["Hadir", "Sakit", "Izin", "Alpa"].map(status => {
                          const isActive = studentStatus === status;
                          
                          let activeClass = "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100";
                          if (isActive) {
                            if (status === "Hadir") activeClass = "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs";
                            else if (status === "Sakit") activeClass = "bg-blue-600 text-white border-blue-600 font-bold shadow-xs";
                            else if (status === "Izin") activeClass = "bg-amber-500 text-white border-amber-500 font-bold shadow-xs";
                            else if (status === "Alpa") activeClass = "bg-rose-600 text-white border-rose-600 font-bold shadow-xs";
                          }

                          return (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(student.id, status)}
                              className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${activeClass}`}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Floating Submit Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t border-gray-200 max-w-lg mx-auto z-20">
              <Button 
                onClick={handleSubmit} 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-sm font-semibold rounded-xl shadow-md flex items-center justify-center space-x-2"
              >
                <span>Simpan Absensi Kelas ({students.length - belumCount}/{students.length})</span>
              </Button>
            </div>
          </div>
        )}

        {/* STEP SUBMITTING */}
        {step === "submitting" && (
          <div className="flex flex-col flex-1 items-center justify-center space-y-4 h-[55vh]">
            <div className="w-14 h-14 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-gray-700 text-sm font-semibold animate-pulse">Menyimpan data kehadiran siswa...</p>
            <p className="text-gray-400 text-xs">Merekam presensi ke database sekolah</p>
          </div>
        )}

        {/* STEP SUCCESS */}
        {step === "success" && (
          <div className="flex flex-col flex-1 items-center justify-center space-y-5 text-center min-h-[55vh] py-6 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Absensi Berhasil Disimpan!</h2>
              <p className="text-gray-500 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
                {attendanceMode === "wali_kelas" ? (
                  <>
                    Data presensi harian kelas <span className="font-semibold text-gray-800">{classes.find(c => c.id === selectedClassId)?.name}</span> (Wali Kelas) telah tersimpan ke sistem.
                  </>
                ) : (
                  <>
                    Data presensi kelas <span className="font-semibold text-gray-800">{classes.find(c => c.id === selectedClassId)?.name}</span> mata pelajaran <span className="font-semibold text-gray-800">{schedules.find(s => s.id === selectedScheduleId)?.subject}</span> telah tersimpan.
                  </>
                )}
              </p>
            </div>

            {/* WhatsApp Dispatch Summary Card */}
            {waSentSummary && (
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3.5 text-left w-full max-w-xs mx-auto shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950">Notifikasi WA Terkirim</span>
                  </div>
                  <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    {waSentSummary.totalSent} Pesan
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700 leading-normal">
                  Pemberitahuan telah terkirim via server bot WhatsApp resmi ke nomor orang tua/wali murid:
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {waSentSummary.details.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white px-2 py-1 rounded text-[10px] border border-emerald-100 shadow-2xs">
                      <span className="font-medium text-gray-700 truncate max-w-[130px]">{item.studentName} ({item.waliName})</span>
                      <span className={`px-1.5 py-0.2 rounded font-semibold text-[9px] ${
                        item.status === 'Hadir' ? 'bg-emerald-50 text-emerald-700' :
                        item.status === 'Alpa' ? 'bg-rose-50 text-rose-700 font-bold' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 w-full max-w-xs pt-1">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedScheduleId("");
                  setWaSentSummary(null);
                  setStep("select");
                }} 
                className="flex-1 h-10 text-xs"
              >
                Absen Kelas Lain
              </Button>
              <Button 
                onClick={() => navigate("/guru/home")} 
                className="flex-1 h-10 text-xs bg-blue-600 hover:bg-blue-700"
              >
                Ke Beranda Guru
              </Button>
            </div>
          </div>
        )}

      </main>

      {/* MODAL PREVIEW KARTU PELAJAR DIGITAL */}
      {selectedCardStudent && (
        <KartuPelajarModal
          isOpen={!!selectedCardStudent}
          onClose={() => setSelectedCardStudent(null)}
          student={selectedCardStudent}
          school={{
            name: "SMP NEGERI 1 NUSANTARA",
            npsn: "20104567",
            akreditasi: "A",
            kepalaSekolah: "Drs. H. Mulyadi, M.Pd",
            nipKepalaSekolah: "196805121994031002",
            alamat: "Jl. Pendidikan No. 123, Kota Pelajar"
          }}
        />
      )}
    </div>
  );
}
