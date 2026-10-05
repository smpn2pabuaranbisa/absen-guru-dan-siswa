import React, { useState, useEffect } from "react";
import { 
  X, 
  Printer, 
  RotateCw, 
  QrCode, 
  ShieldCheck, 
  School,
  ArrowLeftRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { KartuPelajarFront, KartuPelajarBack } from "./KartuPelajarTemplate";

interface KartuPelajarModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  school: any;
}

export default function KartuPelajarModal({
  isOpen,
  onClose,
  student,
  school
}: KartuPelajarModalProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showEnlargedQr, setShowEnlargedQr] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [currentSchool, setCurrentSchool] = useState<any>(school);

  useEffect(() => {
    setCurrentSchool(school);
  }, [school]);

  if (!isOpen) return null;

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  const handleSwapStampAndSignature = () => {
    setCurrentSchool((prev: any) => {
      const updated = {
        ...prev,
        stempelSekolah: prev?.ttdKepalaSekolah,
        ttdKepalaSekolah: prev?.stempelSekolah
      };
      try {
        const raw = localStorage.getItem("sims_school_settings_data_v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.stempelSekolah = updated.stempelSekolah;
          parsed.ttdKepalaSekolah = updated.ttdKepalaSekolah;
          localStorage.setItem("sims_school_settings_data_v1", JSON.stringify(parsed));
        }
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  // Murni hanya Nomor Induk Siswa (NIS) untuk scan gerbang super cepat dan ringkas
  const qrPayload = student?.nis ? String(student.nis).trim() : "2023001";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* HEADER MODAL */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
              <School className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Kartu Pelajar Digital</h3>
              <p className="text-xs text-blue-100/90 font-medium">{student?.nama} • {student?.kelas_nama || "Kelas 7A"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 text-white/90 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY MODAL */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* FLIP CONTROLS & STATUS */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-medium border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Status: Terverifikasi Aktif</span>
            </div>

            <div className="flex items-center space-x-2">
              {isFlipped && (
                <button
                  type="button"
                  onClick={handleSwapStampAndSignature}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg border border-amber-200 transition-colors"
                  title="Klik untuk menukar file stempel & tanda tangan jika posisinya tertukar"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Tukar Stempel & TTD</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{isFlipped ? "Lihat Sisi Depan" : "Balik Sisi Belakang"}</span>
              </button>
            </div>
          </div>

          {/* 3D PERSPECTIVE CARD WRAPPER */}
          <div className="relative mx-auto select-none rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 ring-1 ring-black/5 flex items-center justify-center">
            {!isFlipped ? (
              <KartuPelajarFront student={student} school={currentSchool} qrPayload={qrPayload} />
            ) : (
              <KartuPelajarBack student={student} school={currentSchool} />
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEnlargedQr(true)}
              className="text-xs h-10 border-blue-200 text-blue-700 hover:bg-blue-50 flex items-center justify-center space-x-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span>Tampilkan QR Kode</span>
            </Button>

            <Button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="text-xs h-10 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kartu</span>
            </Button>
          </div>

          {/* NOTICE INFO */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-900 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
              Format Kartu Resmi Standar Nasional
            </p>
            <p>
              Tanda tangan kepala sekolah berada persis di tengah dengan cap stempel resmi dinas menempel pada sisi kiri tanda tangan.
            </p>
          </div>
        </div>
      </div>

      {/* ENLARGED QR MODAL */}
      {showEnlargedQr && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowEnlargedQr(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-gray-900">QR Absensi Siswa</h3>
              <p className="text-xs text-gray-500 mt-0.5">{student?.nama} • {student?.nis}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-blue-600 shadow-inner inline-block">
              <QRCodeSVG 
                value={qrPayload} 
                size={200} 
                level="H" 
                includeMargin={true}
              />
            </div>

            <div className="text-[11px] text-gray-500 leading-tight">
              Tunjukkan barcode / QR ini pada sensor kamera gerbang sekolah saat kedatangan siswa.
            </div>
          </div>
        </div>
      )}

      {/* PRINT AREA (PRINT MODE CSS) */}
      <div id="print-area" className="hidden">
        <div className="flex flex-col items-center justify-center min-h-screen py-10 space-y-8 bg-white">
          <div className="page-break mb-8">
            <p className="text-center font-bold text-sm mb-2 text-gray-700">SISI DEPAN (FRONT)</p>
            <KartuPelajarFront student={student} school={currentSchool} qrPayload={qrPayload} />
          </div>

          <div>
            <p className="text-center font-bold text-sm mb-2 text-gray-700">SISI BELAKANG (BACK)</p>
            <KartuPelajarBack student={student} school={currentSchool} />
          </div>
        </div>
      </div>
    </div>
  );
}
