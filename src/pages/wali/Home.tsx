import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Bell, 
  ArrowRight, 
  FileText, 
  Phone, 
  Sparkles, 
  UserCheck, 
  Building2,
  Volume2,
  ShieldAlert,
  GraduationCap
} from "lucide-react";
import { useAuth } from "@/store/useAuth";
import { 
  apiGetWaliStudentDetail, 
  apiGetParentNotifications, 
  apiMarkParentNotificationRead,
  apiGetStudentGradesForParent,
  StudentParentGradeReport
} from "@/services/api";
import { ParentNotification } from "@/types";

export default function WaliHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const student = user?.student_data;

  const [studentDetail, setStudentDetail] = useState<any>(null);
  const [notifications, setNotifications] = useState<ParentNotification[]>([]);
  const [gradeReport, setGradeReport] = useState<StudentParentGradeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [browserNotifStatus, setBrowserNotifStatus] = useState<"default" | "granted" | "denied">("default");
  const [notifTestSuccess, setNotifTestSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserNotifStatus(Notification.permission);
    }
  }, []);

  const loadData = async () => {
    if (!student?.id) return;
    try {
      const [detailRes, notifsRes, gradeRes] = await Promise.all([
        apiGetWaliStudentDetail(student.id),
        apiGetParentNotifications(student.id),
        apiGetStudentGradesForParent(student.id, "ganjil", 2024)
      ]);

      if (detailRes.success && detailRes.data) {
        setStudentDetail(detailRes.data);
      }
      if (notifsRes.success && notifsRes.data) {
        setNotifications(notifsRes.data);
      }
      if (gradeRes.success && gradeRes.data) {
        setGradeReport(gradeRes.data);
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [student?.id]);

  const requestBrowserNotification = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Browser Anda belum mendukung web push notification.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserNotifStatus(permission);

      if (permission === "granted") {
        setNotifTestSuccess(true);
        new Notification("Presensi Sekolah Digital", {
          body: `Notifikasi HP aktif! Anda akan menerima pemberitahuan setiap kali ${student?.nama || "ananda"} presensi.`,
          icon: student?.foto || "/favicon.ico"
        });
        setTimeout(() => setNotifTestSuccess(false), 4000);
      }
    } catch (e) {
      // ignore
    }
  };

  const today = studentDetail?.todayAttendance;
  const stats = studentDetail?.statsBulanIni;
  const unreadNotifs = notifications.filter((n) => !n.isRead);

  return (
    <div className="space-y-4">
      {/* Welcome & Student Hero Identity */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -left-6 -top-6 w-24 h-24 bg-blue-400/20 rounded-full blur-lg pointer-events-none" />

        <div className="relative flex items-center space-x-4">
          <div className="relative shrink-0">
            <img
              src={student?.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(student?.nama || "Siswa")}&background=fff&color=2563eb`}
              alt={student?.nama}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/80 shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <span className="inline-block text-[11px] font-medium bg-white/20 backdrop-blur px-2.5 py-0.5 rounded-full text-blue-100">
              {student?.hubungan_wali || "Wali Murid"}
            </span>
            <h2 className="text-lg font-bold text-white truncate mt-1">
              {student?.nama || "Nama Siswa"}
            </h2>
            <p className="text-xs text-blue-100/90 font-medium">
              {student?.kelas_nama} • NISN: {student?.nisn}
            </p>
          </div>
        </div>

        {/* Live Attendance Status Today */}
        <div className="mt-4 pt-4 border-t border-white/15">
          <div className="flex items-center justify-between text-xs text-blue-100 mb-2">
            <span className="flex items-center space-x-1.5 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Status Kehadiran Hari Ini</span>
            </span>
            <span className="font-semibold text-white">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Absen Masuk */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10">
              <div className="flex items-center justify-between text-[11px] text-blue-200">
                <span>Absen Masuk</span>
                {today?.masuk ? (
                  today?.status === "Terlambat" ? (
                    <span className="text-[10px] bg-amber-400/30 text-amber-200 px-1.5 py-0.5 rounded font-bold">Terlambat</span>
                  ) : (
                    <span className="text-[10px] bg-emerald-400/30 text-emerald-200 px-1.5 py-0.5 rounded font-bold">Tepat Waktu</span>
                  )
                ) : (
                  <span className="text-[10px] bg-slate-400/30 text-slate-200 px-1.5 py-0.5 rounded">Belum</span>
                )}
              </div>
              <div className="text-base font-bold text-white mt-1">
                {today?.masuk || "--:--"}
              </div>
              <p className="text-[10px] text-blue-200/80 truncate mt-0.5">
                {today?.gate || "Gerbang Sekolah"}
              </p>
            </div>

            {/* Absen Pulang */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10">
              <div className="flex items-center justify-between text-[11px] text-blue-200">
                <span>Absen Pulang</span>
                {today?.pulang ? (
                  <span className="text-[10px] bg-emerald-400/30 text-emerald-200 px-1.5 py-0.5 rounded font-bold">Pulang</span>
                ) : (
                  <span className="text-[10px] bg-slate-400/30 text-slate-200 px-1.5 py-0.5 rounded">Di Sekolah</span>
                )}
              </div>
              <div className="text-base font-bold text-white mt-1">
                {today?.pulang || "--:--"}
              </div>
              <p className="text-[10px] text-blue-200/80 truncate mt-0.5">
                {today?.pulang ? "Selesai KBM" : "Belum Waktu Pulang"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Web Push Notification Quick Banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-slate-800">
              Notifikasi Presensi di HP
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Dapatkan pemberitahuan langsung di layar HP saat ananda scan kartu masuk atau pulang sekolah.
            </p>
            
            <div className="mt-2.5 flex items-center space-x-2">
              {browserNotifStatus === "granted" ? (
                <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Notifikasi HP Aktif
                </span>
              ) : (
                <button
                  onClick={requestBrowserNotification}
                  className="inline-flex items-center text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Aktifkan Notifikasi Sekarang
                </button>
              )}

              {browserNotifStatus === "granted" && (
                <button
                  onClick={() => {
                    new Notification("Uji Coba Presensi", {
                      body: `Presensi ${student?.nama}: Tiba di sekolah pukul 06:45 WIB.`,
                      icon: student?.foto
                    });
                  }}
                  className="text-[11px] text-slate-500 hover:text-blue-600 underline font-medium cursor-pointer"
                >
                  Tes Notifikasi
                </button>
              )}
            </div>

            {notifTestSuccess && (
              <p className="text-[10px] text-emerald-600 mt-1 font-medium">
                Pemberitahuan berhasil diaktifkan! Banner notifikasi telah dikirim ke perangkat Anda.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Latest Notifications Section (Option A highlight) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pusat Notifikasi Ananda
            </h3>
            {unreadNotifs.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {unreadNotifs.length} baru
              </span>
            )}
          </div>
          <button
            onClick={() => navigate("/wali/notifikasi")}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
          >
            <span>Semua</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            Belum ada notifikasi presensi.
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.slice(0, 3).map((n) => {
              const isMasuk = n.type === "masuk";
              const isTerlambat = n.type === "terlambat";
              const isPulang = n.type === "pulang";

              return (
                <div
                  key={n.id}
                  onClick={() => navigate("/wali/notifikasi")}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    !n.isRead
                      ? "bg-blue-50/60 border-blue-200 shadow-xs"
                      : "bg-slate-50/80 border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isTerlambat
                            ? "bg-amber-500"
                            : isMasuk
                            ? "bg-emerald-500"
                            : isPulang
                            ? "bg-blue-500"
                            : "bg-purple-500"
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-800">
                        {n.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">
                      {n.timeStr}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                    {n.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Attendance Summary */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Rekap Kehadiran Bulan Ini
            </h3>
            <p className="text-[11px] text-slate-400">September 2026</p>
          </div>
          <button
            onClick={() => navigate("/wali/riwayat")}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
          >
            <span>Detail</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">
            <span className="text-[10px] font-semibold text-emerald-700 block">Hadir</span>
            <span className="text-lg font-bold text-emerald-800">{stats?.hadir ?? 20}</span>
            <span className="text-[9px] text-emerald-600 block">hari</span>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5">
            <span className="text-[10px] font-semibold text-amber-700 block">Terlambat</span>
            <span className="text-lg font-bold text-amber-800">{stats?.terlambat ?? 1}</span>
            <span className="text-[9px] text-amber-600 block">kali</span>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5">
            <span className="text-[10px] font-semibold text-blue-700 block">Izin</span>
            <span className="text-lg font-bold text-blue-800">{stats?.izin ?? 1}</span>
            <span className="text-[9px] text-blue-600 block">hari</span>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5">
            <span className="text-[10px] font-semibold text-rose-700 block">Sakit</span>
            <span className="text-lg font-bold text-rose-800">{stats?.sakit ?? 0}</span>
            <span className="text-[9px] text-rose-600 block">hari</span>
          </div>
        </div>
      </div>

      {/* Perkembangan Nilai & Rapor Siswa (Option A) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Capaian Nilai & Rapor
              </h3>
              <p className="text-[11px] text-slate-400">
                {gradeReport?.semesterTitle || "Semester Ganjil"} • {gradeReport?.kurikulum || "Kurikulum Merdeka"}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/wali/nilai")}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
          >
            <span>Rapor Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Ringkasan Nilai Card */}
        <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-slate-50 rounded-2xl p-3.5 border border-indigo-100/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase block tracking-wider">
              Rata-Rata Nilai
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900">
                {gradeReport?.rataRataNilai?.toFixed(1) || "84.5"}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-1.5 py-0.2 rounded">
                {gradeReport?.statusKetuntasan || "Tuntas KKTP"}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block tracking-wider">
              Peringkat Kelas
            </span>
            <span className="text-base font-black text-indigo-700">
              #{gradeReport?.ranking || 3}{" "}
              <span className="text-xs font-medium text-slate-500">
                / {gradeReport?.totalSiswaKelas || 32} siswa
              </span>
            </span>
          </div>
        </div>

        {/* Preview 3 Mata Pelajaran */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Ringkasan Nilai Mata Pelajaran:</span>
            <span>Standar KKTP: {gradeReport?.kktpStandar || 75}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(gradeReport?.subjects || []).slice(0, 3).map((sub) => (
              <div 
                key={sub.code} 
                onClick={() => navigate("/wali/nilai")}
                className="bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 rounded-xl p-2 transition-colors cursor-pointer"
              >
                <p className="text-[10px] font-bold text-slate-700 truncate">{sub.name}</p>
                <p className="text-xs font-black text-slate-900 mt-0.5">
                  {sub.nilaiAkhir}{" "}
                  <span className="text-[9px] font-bold text-indigo-600">({sub.predikat})</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => navigate("/wali/izin")}
          className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-2xl shadow-xs transition-colors cursor-pointer text-xs font-semibold"
        >
          <FileText className="w-4 h-4" />
          <span>Ajukan Izin / Sakit</span>
        </button>

        <button
          onClick={() => {
            const phone = "6281234567890";
            const text = encodeURIComponent(`Halo Bapak/Ibu Wali Kelas ${student?.kelas_nama}, saya wali murid dari ${student?.nama}.`);
            window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
          }}
          className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-2xl shadow-xs transition-colors cursor-pointer text-xs font-semibold"
        >
          <Phone className="w-4 h-4" />
          <span>Hubungi Wali Kelas</span>
        </button>
      </div>
    </div>
  );
}
