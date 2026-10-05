import React from "react";
import { PresensiMengajar } from "@/types";
import { X, Calendar, Clock, BookOpen, User, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DetailPresensiKBMModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PresensiMengajar | null;
}

export default function DetailPresensiKBMModal({
  isOpen,
  onClose,
  data
}: DetailPresensiKBMModalProps) {
  if (!isOpen || !data) return null;

  const handleDownloadFoto = () => {
    const link = document.createElement("a");
    link.href = data.foto_kbm;
    link.download = `Bukti_KBM_${data.kelas_nama}_${data.mata_pelajaran}_${data.tanggal}.jpg`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 pb-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">Bukti Presensi Mengajar di Kelas</h2>
              <p className="text-xs text-slate-400">{data.kelas_nama} • {data.mata_pelajaran}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Foto KBM Watermark */}
          <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950">
            <img
              src={data.foto_kbm}
              alt="Bukti KBM"
              className="w-full max-h-72 object-contain mx-auto"
            />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadFoto}
                className="bg-black/60 hover:bg-black/80 text-white border-white/20 text-xs backdrop-blur-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Unduh Foto
              </Button>
            </div>
          </div>

          {/* Rincian KBM */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-500 block mb-0.5">Guru Pengampu:</span>
              <p className="font-semibold text-slate-800">{data.guru_nama}</p>
              <p className="text-[11px] text-slate-500">NIP: {data.nip || "-"}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-500 block mb-0.5">Status Mengajar:</span>
              <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[11px] ${
                data.status === "Selesai" 
                  ? "bg-emerald-100 text-emerald-800" 
                  : "bg-blue-100 text-blue-800"
              }`}>
                <CheckCircle2 className="w-3 h-3" /> {data.status}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Hari / Tanggal:</span>
                <span className="font-medium text-slate-800">{data.hari}, {data.tanggal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jam Jadwal KBM:</span>
                <span className="font-medium text-slate-800">{data.jam_jadwal} WIB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jam Masuk Kelas:</span>
                <span className="font-semibold text-blue-700">{data.jam_masuk_kelas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jam Selesai Mengajar:</span>
                <span className="font-semibold text-emerald-700">
                  {data.jam_selesai_kelas || "Masih berlangsung"}
                </span>
              </div>
            </div>

            {/* Jurnal / Topik Materi */}
            <div className="border border-blue-100 bg-blue-50/50 p-3 rounded-lg">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block mb-1">
                Topik / Materi yang Diajarkan:
              </span>
              <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                {data.topik_materi}
              </p>
            </div>

            {data.catatan_khusus && (
              <div className="border border-slate-200 bg-slate-50 p-3 rounded-lg">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Catatan Guru / Kondisi Kelas:
                </span>
                <p className="text-xs text-slate-700">
                  {data.catatan_khusus}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <Button
            size="sm"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
