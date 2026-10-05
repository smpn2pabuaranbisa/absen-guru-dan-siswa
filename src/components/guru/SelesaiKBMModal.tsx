import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PresensiMengajar } from "@/types";
import { CheckCircle, X, Clock, Loader2, BookCheck } from "lucide-react";

interface SelesaiKBMModalProps {
  isOpen: boolean;
  onClose: () => void;
  presensi: PresensiMengajar;
  onSuccess: () => void;
  onSubmit: (presensiId: string, catatanSelesai?: string) => Promise<{ success: boolean; message: string }>;
}

export default function SelesaiKBMModal({
  isOpen,
  onClose,
  presensi,
  onSuccess,
  onSubmit
}: SelesaiKBMModalProps) {
  const [catatanSelesai, setCatatanSelesai] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const now = new Date();
  const timeNowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await onSubmit(presensi.id, catatanSelesai.trim());
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert("Gagal menyelesaikan sesi mengajar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pb-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <BookCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Selesaikan Sesi Mengajar (KBM)</h2>
              <p className="text-xs text-emerald-100">{presensi.kelas_nama} • {presensi.mata_pelajaran}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Jam Masuk Kelas:</span>
              <span className="font-semibold text-slate-800">{presensi.jam_masuk_kelas}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Jam Selesai (Sekarang):</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {timeNowStr}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200/70 text-slate-700">
              <span className="text-slate-500 block">Topik yang diajarkan:</span>
              <p className="font-medium mt-0.5">{presensi.topik_materi}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Catatan Penutup / Tugas Rumah (Opsional)
            </label>
            <textarea
              rows={2}
              value={catatanSelesai}
              onChange={(e) => setCatatanSelesai(e.target.value)}
              placeholder="Contoh: Pembahasan latihan tuntas, PR Latihan 2.3 dikumpulkan pekan depan."
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs border-slate-300"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Konfirmasi Selesai KBM
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
