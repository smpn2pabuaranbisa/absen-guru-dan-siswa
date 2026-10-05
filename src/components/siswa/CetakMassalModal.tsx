import React, { useRef, useState } from "react";
import { X, Printer, Download, Sparkles, AlertCircle, CheckCircle2, LayoutGrid, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KartuPelajarFront, KartuPelajarBack } from "./KartuPelajarTemplate";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

interface CetakMassalModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: any[];
  classNameTitle: string;
  school: any;
}

export default function CetakMassalModal({
  isOpen,
  onClose,
  students,
  classNameTitle,
  school,
}: CetakMassalModalProps) {
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Browser Direct Print (Sheet mode)
  const handleDirectPrint = () => {
    window.print();
  };

  // Generate Professional PDF A4 (Grid of 8 cards per page: 2 columns x 4 rows)
  const handleGeneratePdf = async () => {
    if (students.length === 0) return;
    setIsGeneratingPdf(true);
    setPdfProgress({ current: 0, total: students.length });

    try {
      // Standard A4: 210mm x 297mm
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Standard ID Card size: 54mm width x 85.6mm height
      const cardWidth = 54;
      const cardHeight = 85.6;
      const marginX = 14;
      const marginY = 12;
      const gapX = 12;
      const gapY = 8;
      const cardsPerRow = 3; // 3 columns x 3 rows = 9 cards per page or 2x4 = 8
      const cardsPerCol = 3;
      const cardsPerPage = cardsPerRow * cardsPerCol;

      const cardNodes = printAreaRef.current?.querySelectorAll(".batch-card-item");
      if (!cardNodes || cardNodes.length === 0) {
        throw new Error("Elemen kartu tidak ditemukan");
      }

      for (let i = 0; i < cardNodes.length; i++) {
        setPdfProgress({ current: i + 1, total: cardNodes.length });
        const cardEl = cardNodes[i] as HTMLElement;

        const dataUrl = await toPng(cardEl, {
          quality: 0.98,
          pixelRatio: 2.5,
          skipFonts: false,
          cacheBust: true,
        });

        const pageIndex = Math.floor(i / cardsPerPage);
        const positionOnPage = i % cardsPerPage;
        const col = positionOnPage % cardsPerRow;
        const row = Math.floor(positionOnPage / cardsPerRow);

        if (pageIndex > 0 && positionOnPage === 0) {
          pdf.addPage();
        }

        const posX = marginX + col * (cardWidth + gapX);
        const posY = marginY + row * (cardHeight + gapY);

        // Draw card boundary / cut guideline (thin gray line)
        pdf.setDrawColor(220, 220, 225);
        pdf.setLineWidth(0.2);
        pdf.rect(posX - 0.5, posY - 0.5, cardWidth + 1, cardHeight + 1);

        pdf.addImage(dataUrl, "PNG", posX, posY, cardWidth, cardHeight);
      }

      pdf.save(`KARTU_PELAJAR_${classNameTitle.replace(/\s+/g, "_")}_${activeSide.toUpperCase()}.pdf`);
    } catch (err) {
      console.error("Gagal cetak PDF:", err);
      alert("Gagal membuat dokumen PDF. Silakan coba kembali atau gunakan cetak langsung.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs">
              <LayoutGrid className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Cetak Massal ID Card Pelajar Vertikal</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                {classNameTitle} • {students.length} Siswa Terdaftar • QR Berisi NIS Murni
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLS BAR */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Side Toggle Tabs */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSide("front")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeSide === "front"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sisi Depan (Foto + QR NIS)
            </button>
            <button
              type="button"
              onClick={() => setActiveSide("back")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeSide === "back"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sisi Belakang (Ketentuan & TTD)
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDirectPrint}
              className="h-9 text-xs bg-white border-slate-300 hover:bg-slate-50 text-slate-700"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Cetak Browser (Ctrl+P)
            </Button>

            <Button
              type="button"
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
            >
              {isGeneratingPdf ? (
                <>
                  <span className="animate-spin mr-1.5">⏳</span>
                  Memproses {pdfProgress.current}/{pdfProgress.total} Kartu...
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Download PDF Siap Cetak (A4)
                </>
              )}
            </Button>
          </div>
        </div>

        {/* INFO BANNER */}
        <div className="px-6 py-2 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-[11px] text-blue-800">
          <span className="flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-blue-600 shrink-0" />
            Format Standar: Ukuran CR-80 Vertikal (54 × 85.6 mm). QR Code memuat <strong>NIS murni</strong> untuk pembacaan instan di gerbang.
          </span>
          <span className="hidden sm:inline font-mono font-semibold text-blue-700">
            Total: {students.length} Kartu
          </span>
        </div>

        {/* PREVIEW CONTAINER */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100/70">
          <div
            ref={printAreaRef}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center"
          >
            {students.map((student) => {
              // MURNI HANYA NIS SISWA
              const qrPayload = student?.nis || "000000";

              return (
                <div
                  key={student.id}
                  className="batch-card-item flex flex-col items-center bg-white p-2 rounded-2xl shadow-md border border-slate-200"
                >
                  {activeSide === "front" ? (
                    <KartuPelajarFront
                      student={student}
                      school={school}
                      qrPayload={qrPayload}
                    />
                  ) : (
                    <KartuPelajarBack
                      student={student}
                      school={school}
                    />
                  )}
                  <p className="text-[10px] font-semibold text-slate-500 mt-2 text-center truncate max-w-[200px]">
                    {student.nama} (NIS: {student.nis})
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
