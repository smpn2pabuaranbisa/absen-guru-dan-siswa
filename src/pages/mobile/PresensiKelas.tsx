import React, { useState, useEffect } from "react";
import { useAuth } from "@/store/useAuth";
import { 
  apiGetTeacherSchedulesToday, 
  apiSubmitPresensiKelas, 
  apiFinishPresensiKelas, 
  apiGetPresensiMengajarList 
} from "@/services/api";
import { 
  BookOpen, 
  Camera, 
  Clock, 
  CheckCircle2, 
  Eye, 
  ChevronLeft, 
  Sparkles, 
  Loader2, 
  ShieldCheck, 
  Calendar,
  AlertCircle,
  History,
  Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { JadwalPelajaran, PresensiMengajar } from "@/types";
import { cn } from "@/lib/utils";
import PresensiKelasModal from "@/components/guru/PresensiKelasModal";
import SelesaiKBMModal from "@/components/guru/SelesaiKBMModal";
import DetailPresensiKBMModal from "@/components/guru/DetailPresensiKBMModal";
import { Button } from "@/components/ui/button";

export default function PresensiKelas() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSubTab, setActiveSubTab] = useState<"hari_ini" | "riwayat">("hari_ini");
  const [schedules, setSchedules] = useState<(JadwalPelajaran & { presensi?: PresensiMengajar | null; isCurrentActiveTime: boolean })[]>([]);
  const [historyKBM, setHistoryKBM] = useState<PresensiMengajar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Modals
  const [selectedJadwalForPresensi, setSelectedJadwalForPresensi] = useState<(JadwalPelajaran & { presensi?: PresensiMengajar | null }) | null>(null);
  const [selectedPresensiForSelesai, setSelectedPresensiForSelesai] = useState<PresensiMengajar | null>(null);
  const [selectedPresensiForDetail, setSelectedPresensiForDetail] = useState<PresensiMengajar | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadSchedules = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const guruId = user?.reference_id || "G001";
      const [schedRes, histRes] = await Promise.all([
        apiGetTeacherSchedulesToday(token, guruId),
        apiGetPresensiMengajarList(token, { guruId })
      ]);

      if (schedRes.success && schedRes.data) {
        setSchedules(schedRes.data.schedules);
      }
      if (histRes.success && histRes.data) {
        setHistoryKBM(histRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [token, user]);

  const handleKbmSuccess = () => {
    setNotificationMsg("Presensi KBM di kelas berhasil diperbarui!");
    loadSchedules();
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const timeString = currentTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }) + " WIB";

  const dateString = currentTime.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const totalJadwal = schedules.length;
  const sudahPresensi = schedules.filter(s => s.presensi).length;

  return (
    <div className="p-4 space-y-4">
      {/* Header Halaman */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate("/guru/home")}
            className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">Presensi Mengajar (KBM)</h1>
            <p className="text-[11px] text-gray-500">Foto Suasana Kelas + Jurnal • Tanpa GPS</p>
          </div>
        </div>
        <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
          {sudahPresensi}/{totalJadwal} Kelas Selesai
        </span>
      </div>

      {/* Jam & Tanggal Hari Ini Card */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-4 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-10 pointer-events-none">
          <BookOpen className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <span className="text-xs text-blue-100 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {dateString}
            </span>
            <div className="text-xl font-extrabold mt-0.5 tracking-tight">{timeString}</div>
          </div>
          <div className="text-right">
            <span className="text-[11px] bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full text-white font-medium inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-300" /> Mode Bebas GPS
            </span>
          </div>
        </div>
      </div>

      {notificationMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 shadow-xs text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Tabs Switcher: Jadwal Hari Ini vs Riwayat KBM */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveSubTab("hari_ini")}
          className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeSubTab === "hari_ini"
              ? "bg-white text-blue-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Jadwal Mengajar Hari Ini
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("riwayat")}
          className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeSubTab === "riwayat"
              ? "bg-white text-blue-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <History className="w-3.5 h-3.5" /> Riwayat KBM
        </button>
      </div>

      {/* KONTEN TAB: JADWAL HARI INI */}
      {activeSubTab === "hari_ini" && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs text-gray-500 font-medium">Memuat jadwal kelas hari ini...</span>
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center text-gray-500 text-xs">
              <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              Tidak ada jadwal mengajar yang terjadwal hari ini.
            </div>
          ) : (
            schedules.map((sch) => {
              const presensi = sch.presensi;
              const isOngoing = presensi && presensi.status === "Sedang Mengajar";
              const isFinished = presensi && presensi.status === "Selesai";

              return (
                <div
                  key={sch.id}
                  className={cn(
                    "p-4 rounded-2xl border transition-all duration-200 shadow-xs relative overflow-hidden",
                    isOngoing
                      ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20"
                      : isFinished
                      ? "bg-emerald-50/50 border-emerald-200"
                      : "bg-white border-gray-200 hover:border-blue-200"
                  )}
                >
                  {/* Top Header Card */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-600 text-white">
                        {sch.kelas_nama}
                      </span>
                      <span className="text-xs font-bold text-gray-900">
                        {sch.mata_pelajaran}
                      </span>
                    </div>

                    <div>
                      {isFinished ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Selesai
                        </span>
                      ) : isOngoing ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span> Sedang Mengajar
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          Belum Presensi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Jam & Ruang */}
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>{sch.jam_mulai} - {sch.jam_selesai} WIB</span>
                    </div>
                    <span className="text-gray-500 text-[11px]">{sch.ruang || "Ruang Kelas"}</span>
                  </div>

                  {/* Keterangan Jika Ada Presensi */}
                  {presensi && (
                    <div className="mb-3 pt-2.5 border-t border-gray-200/80 space-y-1.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="text-[11px] text-gray-500 block">Jurnal KBM:</span>
                          <p className="font-medium text-gray-800 text-xs line-clamp-2">{presensi.topik_materi}</p>
                        </div>
                        {presensi.foto_kbm && (
                          <button
                            type="button"
                            onClick={() => setSelectedPresensiForDetail(presensi)}
                            className="relative w-11 h-11 rounded-lg overflow-hidden border border-gray-300 shadow-xs shrink-0 group cursor-pointer"
                            title="Lihat foto bukti KBM"
                          >
                            <img
                              src={presensi.foto_kbm}
                              alt="Foto KBM"
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
                        <span>Masuk: <strong className="text-gray-700">{presensi.jam_masuk_kelas}</strong></span>
                        {presensi.jam_selesai_kelas && (
                          <span>Selesai: <strong className="text-emerald-700">{presensi.jam_selesai_kelas}</strong></span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-1 space-y-2">
                    {!presensi ? (
                      <button
                        onClick={() => setSelectedJadwalForPresensi(sch)}
                        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs py-2.5 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Presensi Masuk Kelas (Foto KBM)</span>
                      </button>
                    ) : isOngoing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedPresensiForDetail(presensi)}
                          className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs py-2 px-3 rounded-xl border border-gray-300 flex items-center justify-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Bukti Foto</span>
                        </button>
                        <button
                          onClick={() => setSelectedPresensiForSelesai(presensi)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Selesai Mengajar</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedPresensiForDetail(presensi)}
                        className="w-full bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 font-semibold text-xs py-2 px-3 rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Bukti Foto & Jurnal Lengkap</span>
                      </button>
                    )}

                    {/* Tombol Pintas Presensi Siswa di Kelas Tersebut */}
                    <button
                      onClick={() => navigate("/guru/siswa")}
                      className="w-full bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-gray-600 font-medium text-[11px] py-1.5 px-3 rounded-lg border border-gray-200 flex items-center justify-center gap-1.5 transition"
                    >
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Buka Presensi Siswa ({sch.kelas_nama})</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* KONTEN TAB: RIWAYAT KBM */}
      {activeSubTab === "riwayat" && (
        <div className="space-y-3">
          {historyKBM.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center text-gray-500 text-xs">
              Belum ada riwayat mengajar tersimpan.
            </div>
          ) : (
            historyKBM.map((hist) => (
              <div
                key={hist.id}
                onClick={() => setSelectedPresensiForDetail(hist)}
                className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs hover:border-blue-300 transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-200 shrink-0 bg-slate-100">
                    <img
                      src={hist.foto_kbm}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">
                        {hist.kelas_nama}
                      </span>
                      <span className="text-xs font-bold text-gray-900">{hist.mata_pelajaran}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{hist.hari}, {hist.tanggal} • {hist.jam_masuk_kelas}</p>
                    <p className="text-[11px] text-gray-700 line-clamp-1 mt-0.5 italic">{hist.topik_materi}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {hist.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals KBM */}
      {selectedJadwalForPresensi && (
        <PresensiKelasModal
          isOpen={!!selectedJadwalForPresensi}
          onClose={() => setSelectedJadwalForPresensi(null)}
          jadwal={selectedJadwalForPresensi}
          guruName={user?.name || "Ahmad Guru"}
          guruNip="198001012005011001"
          guruId={user?.reference_id || "G001"}
          onSuccess={handleKbmSuccess}
          onSubmit={async (payload) => {
            if (!token) return { success: false, message: "Token tidak ditemukan" };
            return await apiSubmitPresensiKelas(token, payload);
          }}
        />
      )}

      {selectedPresensiForSelesai && (
        <SelesaiKBMModal
          isOpen={!!selectedPresensiForSelesai}
          onClose={() => setSelectedPresensiForSelesai(null)}
          presensi={selectedPresensiForSelesai}
          onSuccess={handleKbmSuccess}
          onSubmit={async (presensiId, catatanSelesai) => {
            if (!token) return { success: false, message: "Token tidak ditemukan" };
            return await apiFinishPresensiKelas(token, presensiId, catatanSelesai);
          }}
        />
      )}

      {selectedPresensiForDetail && (
        <DetailPresensiKBMModal
          isOpen={!!selectedPresensiForDetail}
          onClose={() => setSelectedPresensiForDetail(null)}
          data={selectedPresensiForDetail}
        />
      )}
    </div>
  );
}
