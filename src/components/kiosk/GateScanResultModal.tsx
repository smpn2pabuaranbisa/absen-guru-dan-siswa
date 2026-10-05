import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Send, 
  User, 
  School, 
  X, 
  Volume2, 
  ShieldCheck,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GateScanResult } from "@/services/api";

interface GateScanResultModalProps {
  result: GateScanResult | null;
  errorMessage?: string | null;
  onClose: () => void;
  autoCloseSeconds?: number;
}

export default function GateScanResultModal({
  result,
  errorMessage,
  onClose,
  autoCloseSeconds = 4
}: GateScanResultModalProps) {
  const [countdown, setCountdown] = useState(autoCloseSeconds);

  useEffect(() => {
    if (!result && !errorMessage) return;

    setCountdown(autoCloseSeconds);

    // Fire confetti if punctual arrival
    if (result && result.isPunctual && !result.isDoubleScan) {
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore
      }
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [result, errorMessage, autoCloseSeconds, onClose]);

  if (!result && !errorMessage) return null;

  const isErrorOnly = !!errorMessage && !result;
  const isDoubleScan = result?.isDoubleScan;
  const isPunctual = result?.isPunctual && !isDoubleScan;
  const isTerlambat = result && !result.isPunctual && !isDoubleScan && result.record.mode === "masuk";
  const isPulang = result && result.record.mode === "pulang";

  const record = result?.record;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border transition-all ${
          isErrorOnly || isDoubleScan
            ? "bg-slate-900 border-rose-500/40 text-rose-50"
            : isTerlambat
            ? "bg-slate-900 border-amber-500/40 text-amber-50"
            : "bg-slate-900 border-emerald-500/40 text-emerald-50"
        }`}
      >
        {/* Top Header Status Banner */}
        <div 
          className={`py-5 px-6 text-center text-white relative overflow-hidden ${
            isErrorOnly || isDoubleScan
              ? "bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700"
              : isTerlambat
              ? "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600"
              : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600"
          }`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center space-x-2.5 mb-1.5">
            {isErrorOnly || isDoubleScan ? (
              <XCircle className="w-8 h-8 text-white animate-pulse" />
            ) : isTerlambat ? (
              <AlertTriangle className="w-8 h-8 text-white animate-bounce" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-white animate-bounce" />
            )}
            <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
              {isErrorOnly
                ? "Presensi Gagal"
                : isDoubleScan
                ? "Kartu Sudah Dipindai"
                : isTerlambat
                ? `Terlambat ${record?.menitKeterlambatan} Menit`
                : isPulang
                ? "Presensi Pulang Berhasil"
                : "Hadir Tepat Waktu"}
            </h2>
          </div>

          <p className="text-xs sm:text-sm font-medium opacity-90">
            {isErrorOnly
              ? errorMessage
              : isDoubleScan
              ? "Data kehadiran Anda telah tercatat sebelumnya"
              : isTerlambat
              ? "Harap lapor kepada guru piket sebelum memasuki kelas"
              : isPulang
              ? "Terima kasih telah belajar hari ini. Hati-hati di jalan pulang!"
              : "Selamat belajar di sekolah dan raih prestasi terbaik!"}
          </p>
        </div>

        {/* Card Body with Person Details */}
        {record ? (
          <div className="p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Photo */}
              <div className="relative">
                <img
                  src={record.foto}
                  alt={record.nama}
                  referrerPolicy="no-referrer"
                  className={`w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-2xl border-4 shadow-xl ${
                    isDoubleScan
                      ? "border-rose-500/60"
                      : isTerlambat
                      ? "border-amber-500/60"
                      : "border-emerald-500/60"
                  }`}
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute(
                      "src",
                      "https://ui-avatars.com/api/?name=" + encodeURIComponent(record.nama) + "&background=0D8ABC&color=fff"
                    );
                  }}
                />
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700">
                  {record.type}
                </span>
              </div>

              {/* Information */}
              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {record.subInfo}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {record.nama}
                </h3>
                <div className="text-sm text-slate-400 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span>{record.type === "siswa" ? `NIS: ${record.identifier}` : `NIP: ${record.identifier}`}</span>
                  {record.nisn && <span>• NISN: {record.nisn}</span>}
                </div>

                {/* Timestamp Pill */}
                <div className="pt-2 flex items-center justify-center sm:justify-start space-x-2 text-xs font-mono text-slate-300">
                  <div className="px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Waktu Scan: <strong className="text-white">{record.timeStr} WIB</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Parent WhatsApp Notification Status */}
            {record.parentInfo && (
              <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3.5 flex items-start space-x-3 text-xs text-slate-300">
                <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                  record.waNotificationStatus === "PENDING_SYNC"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  <Send className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Notifikasi WhatsApp Orang Tua</span>
                    {record.waNotificationStatus === "PENDING_SYNC" ? (
                      <span className="inline-flex items-center text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                        <Clock className="w-3 h-3 mr-1" /> Antrean Offline
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <Check className="w-3 h-3 mr-1" /> Terkirim Otomatis
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-slate-400 truncate">
                    Ke: {record.parentInfo.namaWali} ({record.parentInfo.noWa})
                  </p>
                  {record.waMessagePreview && (
                    <p className="mt-1.5 text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800 font-mono italic">
                      "{record.waMessagePreview}"
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Voice utterance indicator */}
            {result?.voiceMessage && (
              <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-950/50 px-3 py-2 rounded-xl border border-slate-800">
                <Volume2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="truncate">Suara: "{result.voiceMessage}"</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center space-y-4">
            <p className="text-sm text-slate-300">
              Silakan pastikan kartu pelajar diarahkan tegak lurus ke arah lensa scanner atau gunakan input manual.
            </p>
          </div>
        )}

        {/* Footer with countdown auto-close */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Kembali dalam <strong className="text-white font-mono">{countdown} detik</strong></span>
          </div>

          <Button
            size="sm"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 rounded-xl"
          >
            Tutup (Scan Berikutnya)
          </Button>
        </div>
      </div>
    </div>
  );
}
