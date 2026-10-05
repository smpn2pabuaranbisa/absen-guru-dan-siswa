import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Printer, 
  X, 
  Settings2, 
  FileText, 
  Check, 
  Stamp, 
  FileSpreadsheet,
  Building,
  HelpCircle,
  Image as ImageIcon
} from "lucide-react";
import { 
  MonthlyClassAttendanceReport, 
  SemesterClassAttendanceReport,
  ClassGradeLegerReport,
  apiUpdateSettings
} from "@/services/api";
import { KopLogoKiri, KopLogoKanan } from "@/components/common/OfficialLogos";

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: "class_matrix" | "semester_leger" | "grade_leger" | "teacher_report" | "general_report";
  data: any;
  schoolSettings?: any;
}

export default function PrintPreviewModal({
  isOpen,
  onClose,
  reportType,
  data,
  schoolSettings
}: PrintPreviewModalProps) {
  const [orientation, setOrientation] = useState<"landscape" | "portrait">(
    reportType === "class_matrix" || reportType === "semester_leger" || reportType === "grade_leger" ? "landscape" : "portrait"
  );
  const [paperSize, setPaperSize] = useState<"A4" | "F4">("A4");
  const [showSchoolStamp, setShowSchoolStamp] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [showLeftLogo, setShowLeftLogo] = useState(true);
  const [showRightLogo, setShowRightLogo] = useState(true);
  const [localLogoDinas, setLocalLogoDinas] = useState<string | null>(schoolSettings?.logoDinas || null);

  useEffect(() => {
    setLocalLogoDinas(schoolSettings?.logoDinas || null);
  }, [schoolSettings?.logoDinas]);

  const handleUploadLeftLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setLocalLogoDinas(base64);
        setShowLeftLogo(true);
        try {
          const token = typeof window !== "undefined" ? localStorage.getItem("token") || "admin-mock-token" : "admin-mock-token";
          await apiUpdateSettings(token, { logoDinas: base64 });
        } catch (err) {
          console.error("Gagal menyimpan logo kiri:", err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLeftLogo = async () => {
    setLocalLogoDinas(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "admin-mock-token" : "admin-mock-token";
      await apiUpdateSettings(token, { logoDinas: null });
    } catch (err) {
      console.error("Gagal menghapus logo kiri:", err);
    }
  };

  const effectiveSettings = {
    ...schoolSettings,
    logoDinas: localLogoDinas
  };
  const [customNotes, setCustomNotes] = useState(
    data?.catatanWaliKelas || "Kehadiran siswa kelas ini secara keseluruhan memenuhi standar ketuntasan disiplin. Siswa dengan alpa dan keterlambatan telah diberikan konseling pembinaan."
  );

  useEffect(() => {
    if (reportType === "class_matrix" || reportType === "semester_leger" || reportType === "grade_leger") {
      setOrientation("landscape");
    } else {
      setOrientation("portrait");
    }
  }, [reportType]);

  useEffect(() => {
    if (data?.catatanWaliKelas) {
      setCustomNotes(data.catatanWaliKelas);
    }
  }, [data]);

  if (!isOpen || !data) return null;

  const schoolName = schoolSettings?.schoolName || "SMP NEGERI 1 NUSANTARA";
  const npsn = schoolSettings?.npsn || "20104567";
  const akreditasi = schoolSettings?.akreditasi || "A";
  const address = schoolSettings?.address || "Jl. Pendidikan No. 123, Kota Pelajar";
  const phone = schoolSettings?.phone || "021-5551234";
  const email = schoolSettings?.email || "info@smpn1nusantara.sch.id";
  const kepalaSekolah = schoolSettings?.kepalaSekolah || "Drs. H. Mulyadi, M.Pd";
  const nipKepalaSekolah = schoolSettings?.nipKepalaSekolah || "196805121994031002";
  const ttdKepalaSekolah = effectiveSettings?.ttdKepalaSekolah || null;
  const stempelSekolah = effectiveSettings?.stempelSekolah || null;

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Pratinjau Dokumen Cetak / Arsip Dinas Pendidikan
              </h2>
              <p className="text-[11px] text-gray-500">
                Format resmi ber-KOP surat sekolah, leger kehadiran bulanan, dan lembar pengesahan.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRINT CUSTOMIZATION TOOLBAR */}
        <div className="px-5 py-2.5 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between gap-3 flex-wrap text-xs shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-700">Orientasi:</span>
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setOrientation("landscape")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    orientation === "landscape" ? "bg-blue-600 text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Landscape (Matriks)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("portrait")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    orientation === "portrait" ? "bg-blue-600 text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Portrait (Ringkas)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-700">Ukuran Kertas:</span>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as any)}
                className="bg-white border border-gray-200 text-gray-800 rounded px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-blue-500"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="F4">F4 / Folio (215 × 330 mm)</option>
              </select>
            </div>

            {/* Logo Kiri (Input Manual) */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showLeftLogo}
                  onChange={(e) => setShowLeftLogo(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-gray-700 font-medium">Logo Kiri (Manual)</span>
              </label>

              {localLogoDinas ? (
                <button
                  type="button"
                  onClick={handleRemoveLeftLogo}
                  className="text-[10px] text-red-600 hover:text-red-800 font-medium ml-0.5 underline"
                  title="Hapus logo kiri"
                >
                  Hapus
                </button>
              ) : (
                <label className="text-[10px] text-blue-600 hover:text-blue-800 font-bold ml-0.5 cursor-pointer hover:underline" title="Unggah file logo kiri secara manual">
                  <span>+ Unggah</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadLeftLogo}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showRightLogo}
                onChange={(e) => setShowRightLogo(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-gray-700 font-medium">Logo Sekolah</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSchoolStamp}
                onChange={(e) => setShowSchoolStamp(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-gray-700 font-medium">Stempel Sekolah Digital</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={(e) => setShowSignatures(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-gray-700 font-medium">Tanda Tangan Digital</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 hidden sm:inline">
              Gunakan opsi <em>"Save as PDF"</em> pada printer browser
            </span>
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8 px-3.5 text-xs font-semibold"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak / Unduh PDF
            </Button>
          </div>
        </div>

        {/* DOCUMENT PREVIEW CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-200/70 flex justify-center">
          {/* THE PRINTABLE PAPER SHEET */}
          <div
            id="print-area"
            className={`bg-white shadow-xl rounded-sm p-8 sm:p-10 text-gray-900 border border-gray-300 transition-all ${
              orientation === "landscape" ? "w-full max-w-[1080px]" : "w-full max-w-[800px]"
            }`}
          >
            {/* KOP SURAT RESMI */}
            <div className="border-b-[3px] border-gray-900 pb-3 mb-4">
              <div className="flex items-center justify-between gap-4">
                {/* Sisi Kiri KOP (Input Manual Saja - Hanya tampil jika diunggah dan opsi aktif) */}
                {showLeftLogo && effectiveSettings?.logoDinas ? (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                    <KopLogoKiri settings={effectiveSettings} className="w-full h-full" />
                  </div>
                ) : (
                  <div className="w-16 sm:w-20 shrink-0" />
                )}

                <div className="text-center flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    PEMERINTAH DAERAH PROVINSI / KABUPATEN
                  </h4>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray-800">
                    DINAS PENDIDIKAN DAN KEBUDAYAAN
                  </h3>
                  <h1 className="text-lg sm:text-xl font-black uppercase text-gray-950 tracking-tight mt-0.5">
                    {schoolName}
                  </h1>
                  <p className="text-[10px] sm:text-[11px] text-gray-600 mt-0.5 leading-snug">
                    {address} | Telp: {phone} | NPSN: {npsn} | Akreditasi: {akreditasi}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Website: {schoolSettings?.website || "https://smpn1nusantara.sch.id"} | Email: {email}
                  </p>
                </div>

                {/* Logo Resmi Sekolah */}
                {showRightLogo ? (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                    <KopLogoKanan settings={schoolSettings} className="w-full h-full" />
                  </div>
                ) : (
                  <div className="w-16 sm:w-20 shrink-0" />
                )}
              </div>
              <div className="border-t border-gray-900 mt-2"></div>
            </div>

            {/* RENDER TEMPLATE BERDASARKAN TIPE */}
            {reportType === "class_matrix" && (
              <ClassMatrixPrintView
                report={data as MonthlyClassAttendanceReport}
                orientation={orientation}
                showSchoolStamp={showSchoolStamp}
                showSignatures={showSignatures}
                customNotes={customNotes}
                kepalaSekolah={kepalaSekolah}
                nipKepalaSekolah={nipKepalaSekolah}
                todayStr={todayStr}
                ttdKepalaSekolah={ttdKepalaSekolah}
                stempelSekolah={stempelSekolah}
              />
            )}

            {reportType === "semester_leger" && (
              <SemesterLegerPrintView
                report={data as SemesterClassAttendanceReport}
                showSchoolStamp={showSchoolStamp}
                showSignatures={showSignatures}
                customNotes={customNotes}
                kepalaSekolah={kepalaSekolah}
                nipKepalaSekolah={nipKepalaSekolah}
                todayStr={todayStr}
                ttdKepalaSekolah={ttdKepalaSekolah}
                stempelSekolah={stempelSekolah}
              />
            )}

            {reportType === "grade_leger" && (
              <GradeLegerPrintView
                report={data as ClassGradeLegerReport}
                showSchoolStamp={showSchoolStamp}
                showSignatures={showSignatures}
                customNotes={customNotes}
                kepalaSekolah={kepalaSekolah}
                nipKepalaSekolah={nipKepalaSekolah}
                todayStr={todayStr}
                ttdKepalaSekolah={ttdKepalaSekolah}
                stempelSekolah={stempelSekolah}
              />
            )}

            {reportType === "teacher_report" && (
              <TeacherReportPrintView
                data={data}
                showSchoolStamp={showSchoolStamp}
                showSignatures={showSignatures}
                kepalaSekolah={kepalaSekolah}
                nipKepalaSekolah={nipKepalaSekolah}
                todayStr={todayStr}
                ttdKepalaSekolah={ttdKepalaSekolah}
                stempelSekolah={stempelSekolah}
              />
            )}

            {reportType === "general_report" && (
              <GeneralReportPrintView
                data={data}
                showSchoolStamp={showSchoolStamp}
                showSignatures={showSignatures}
                kepalaSekolah={kepalaSekolah}
                nipKepalaSekolah={nipKepalaSekolah}
                todayStr={todayStr}
                ttdKepalaSekolah={ttdKepalaSekolah}
                stempelSekolah={stempelSekolah}
              />
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500">
            Dokumen siap diarsipkan ke format PDF atau dicetak langsung via printer.
          </div>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8"
            >
              Tutup Pratinjau
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-xs h-8 font-semibold"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak Sekarang
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------
// SUB-TEMPLATE 1: LEGER MATRIKS KELAS BULANAN
// ----------------------------------------------------
function ClassMatrixPrintView({
  report,
  orientation,
  showSchoolStamp,
  showSignatures,
  customNotes,
  kepalaSekolah,
  nipKepalaSekolah,
  todayStr,
  ttdKepalaSekolah,
  stempelSekolah
}: {
  report: MonthlyClassAttendanceReport;
  orientation: "landscape" | "portrait";
  showSchoolStamp: boolean;
  showSignatures: boolean;
  customNotes: string;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
  todayStr: string;
  ttdKepalaSekolah?: string | null;
  stempelSekolah?: string | null;
}) {
  return (
    <div className="space-y-4">
      {/* JUDUL DOKUMEN */}
      <div className="text-center">
        <h2 className="text-sm sm:text-base font-black uppercase text-gray-900 tracking-wide underline underline-offset-4">
          LEGER REKAPITULASI PRESENSI SISWA (BULANAN)
        </h2>
        <p className="text-xs text-gray-600 mt-1 font-medium">
          Tahun Pelajaran {report.tahunAjaran} — {report.semester}
        </p>
      </div>

      {/* METADATA INFORMASI KELAS */}
      <div className="grid grid-cols-2 text-xs border border-gray-300 rounded p-2.5 bg-gray-50/50">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 text-gray-600">Kelas / Rombel</span>
            <span className="font-bold text-gray-900">: {report.className}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-gray-600">Wali Kelas</span>
            <span className="font-bold text-gray-900">: {report.waliKelas}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-gray-600">NIP Wali Kelas</span>
            <span className="font-mono text-gray-800">: {report.nipWaliKelas}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 text-gray-600">Bulan Presensi</span>
            <span className="font-bold text-gray-900">: {report.bulanNama} {report.tahun}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-gray-600">Hari Belajar Efektif</span>
            <span className="font-bold text-gray-900">: {report.hariEfektif} Hari</span>
          </div>
          <div className="flex">
            <span className="w-28 text-gray-600">Total Siswa</span>
            <span className="font-bold text-gray-900">: {report.summary.totalSiswa} Siswa (L: {report.summary.totalLaki}, P: {report.summary.totalPerempuan})</span>
          </div>
        </div>
      </div>

      {/* TABEL MATRIKS TANGGAL 1 s/d 31 */}
      <div className="overflow-x-auto border border-gray-400">
        <table className="w-full border-collapse text-[10px] text-center">
          <thead>
            <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-400">
              <th className="border-r border-gray-400 px-1 py-1.5 w-6">No</th>
              <th className="border-r border-gray-400 px-1.5 py-1.5 text-left w-16">NIS</th>
              <th className="border-r border-gray-400 px-2 py-1.5 text-left min-w-[120px]">Nama Lengkap Siswa</th>
              <th className="border-r border-gray-400 px-1 py-1.5 w-5">JK</th>

              {/* Tanggal 1 s/d N */}
              {Array.from({ length: report.daysInMonth }, (_, i) => i + 1).map((d) => (
                <th key={d} className="border-r border-gray-300 px-0.5 py-1 w-5 font-semibold text-[9px]">
                  {d}
                </th>
              ))}

              <th className="border-r border-gray-400 px-1 py-1 w-6 bg-emerald-50">H</th>
              <th className="border-r border-gray-400 px-1 py-1 w-6 bg-amber-50">T</th>
              <th className="border-r border-gray-400 px-1 py-1 w-6 bg-blue-50">S</th>
              <th className="border-r border-gray-400 px-1 py-1 w-6 bg-purple-50">I</th>
              <th className="border-r border-gray-400 px-1 py-1 w-6 bg-rose-50">A</th>
              <th className="px-1.5 py-1 w-11 bg-gray-100 font-bold">%</th>
            </tr>
          </thead>
          <tbody>
            {report.students.map((student, idx) => (
              <tr key={student.id} className="border-b border-gray-300 hover:bg-gray-50/50">
                <td className="border-r border-gray-400 py-1">{idx + 1}</td>
                <td className="border-r border-gray-400 px-1.5 py-1 text-left font-mono">{student.nis}</td>
                <td className="border-r border-gray-400 px-2 py-1 text-left font-medium truncate max-w-[130px]">{student.name}</td>
                <td className="border-r border-gray-400 py-1">{student.jk}</td>

                {Array.from({ length: report.daysInMonth }, (_, i) => i + 1).map((d) => {
                  const st = student.dailyStatus[d] || "-";
                  const isWeekend = st === "L";
                  return (
                    <td key={d} className={`border-r border-gray-300 py-1 text-[9px] ${
                      st === 'H' ? 'text-emerald-800' :
                      st === 'T' ? 'text-amber-800 font-bold' :
                      st === 'S' ? 'text-blue-800 font-bold' :
                      st === 'I' ? 'text-purple-800 font-bold' :
                      st === 'A' ? 'text-rose-700 font-black bg-rose-50' :
                      'text-gray-400'
                    }`}>
                      {isWeekend ? "-" : st}
                    </td>
                  );
                })}

                <td className="border-r border-gray-400 py-1 font-bold text-emerald-800">{student.totalHadir}</td>
                <td className="border-r border-gray-400 py-1 font-semibold text-amber-800">{student.totalTerlambat}</td>
                <td className="border-r border-gray-400 py-1 font-semibold text-blue-800">{student.totalSakit}</td>
                <td className="border-r border-gray-400 py-1 font-semibold text-purple-800">{student.totalIzin}</td>
                <td className="border-r border-gray-400 py-1 font-bold text-rose-800">{student.totalAlpa}</td>
                <td className="py-1 font-bold">{student.persentase}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-400">
              <td colSpan={4} className="border-r border-gray-400 px-2 py-1 text-right">TOTAL KELAS:</td>
              {Array.from({ length: report.daysInMonth }, (_, i) => i + 1).map((d) => {
                let daySum = 0;
                report.students.forEach(s => {
                  if (s.dailyStatus[d] === "H" || s.dailyStatus[d] === "T") daySum++;
                });
                const isWeekend = report.students[0]?.dailyStatus[d] === "L";
                return (
                  <td key={d} className="border-r border-gray-300 py-1 text-[9px]">
                    {isWeekend ? "-" : daySum}
                  </td>
                );
              })}
              <td className="border-r border-gray-400 py-1">{report.summary.totalHadir}</td>
              <td className="border-r border-gray-400 py-1">{report.summary.totalTerlambat}</td>
              <td className="border-r border-gray-400 py-1">{report.summary.totalSakit}</td>
              <td className="border-r border-gray-400 py-1">{report.summary.totalIzin}</td>
              <td className="border-r border-gray-400 py-1">{report.summary.totalAlpa}</td>
              <td className="py-1">{report.summary.rataRataKehadiran}%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* KETERANGAN KODE & CATATAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1">
        <div className="border border-gray-300 rounded p-2 bg-gray-50/60 space-y-1">
          <span className="font-bold text-gray-800 block">Keterangan Singkatan:</span>
          <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-700">
            <span><strong>H</strong> : Hadir Tepat Waktu</span>
            <span><strong>T</strong> : Terlambat</span>
            <span><strong>S</strong> : Sakit (Surat)</span>
            <span><strong>I</strong> : Izin Resmi</span>
            <span><strong>A</strong> : Alpa / Bolos</span>
            <span><strong>-</strong> : Libur Belajar</span>
          </div>
        </div>

        <div className="border border-gray-300 rounded p-2 bg-gray-50/60">
          <span className="font-bold text-gray-800 block">Catatan Evaluasi / Pembinaan:</span>
          <p className="text-[10px] text-gray-600 mt-0.5 leading-relaxed italic">
            "{customNotes}"
          </p>
        </div>
      </div>

      {/* LEMBAR PENGESAHAN 2 PIHAK (KEPALA SEKOLAH & WALI KELAS) */}
      <div className="pt-6 flex justify-between items-start text-xs text-gray-800 px-6">
        {/* 1. Kepala Sekolah (dengan Stempel di Sebelah Kiri Menempel Ujung Tanda Tangan) */}
        <div className="text-center w-64 relative">
          <p className="text-gray-600">Mengetahui,<br />Kepala Sekolah,</p>

          <div className="h-16 flex items-center justify-center relative">
            {/* STEMPEL SEKOLAH DIGITAL (CAP BASAH): Di sebelah kiri, menempel & menindih sedikit ujung kiri tanda tangan */}
            {showSchoolStamp && (
              stempelSekolah ? (
                <div 
                  className="absolute z-10 flex items-center justify-center pointer-events-none select-none opacity-85"
                  style={{
                    left: "calc(50% - 38px)",
                    top: "50%",
                    transform: "translate(-50%, -50%) rotate(-8deg)",
                    width: "88px",
                    height: "88px"
                  }}
                >
                  <img 
                    src={stempelSekolah} 
                    alt="Stempel Sekolah" 
                    className="w-full h-full object-contain" 
                    style={{ mixBlendMode: "multiply" }}
                  />
                </div>
              ) : (
                <div 
                  className="absolute z-10 rounded-full border-[3px] border-indigo-700/85 text-indigo-800/85 flex flex-col items-center justify-center text-center p-1.5 pointer-events-none select-none shadow-xs"
                  style={{
                    left: "calc(50% - 38px)",
                    top: "50%",
                    transform: "translate(-50%, -50%) rotate(-8deg)",
                    width: "88px",
                    height: "88px"
                  }}
                >
                  <span className="text-[7px] font-black uppercase tracking-wider">DINAS PENDIDIKAN</span>
                  <span className="text-[8px] font-black uppercase my-0.5">★ RESMI ★</span>
                  <span className="text-[7px] font-black uppercase leading-none">SMP NEGERI 1</span>
                </div>
              )
            )}

            {/* TANDA TANGAN KEPALA SEKOLAH */}
            <div className="relative z-20 flex items-center justify-center">
              {showSignatures && (
                ttdKepalaSekolah ? (
                  <img src={ttdKepalaSekolah} alt="TTD Kepala Sekolah" className="max-h-16 max-w-32 object-contain" />
                ) : (
                  <span className="font-serif italic text-blue-900 text-base font-bold select-none opacity-80">
                    {kepalaSekolah.replace(/^(Drs\.|Dr\.|H\.|Hj\.|Prof\.)\s*/i, '').split(',')[0]}
                  </span>
                )
              )}
            </div>
          </div>

          <p className="font-bold text-gray-900 border-b border-gray-900 pb-0.5 inline-block relative z-20">
            {kepalaSekolah}
          </p>
          <p className="text-[10px] text-gray-600 font-mono relative z-20">NIP. {nipKepalaSekolah}</p>
        </div>

        {/* 2. Wali Kelas */}
        <div className="text-center w-64">
          <p className="text-gray-600">Kota Pelajar, {todayStr}<br />Wali Kelas {report.className},</p>
          <div className="h-16 flex items-center justify-center">
            {showSignatures && (
              <span className="font-serif italic text-blue-900 text-sm font-bold select-none opacity-80">
                {report.waliKelas.split(" ")[0]}
              </span>
            )}
          </div>
          <p className="font-bold text-gray-900 border-b border-gray-900 pb-0.5 inline-block">
            {report.waliKelas}
          </p>
          <p className="text-[10px] text-gray-600 font-mono">NIP. {report.nipWaliKelas}</p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// SUB-TEMPLATE 2: LAPORAN GURU / PEGAWAI BULANAN
// ----------------------------------------------------
function TeacherReportPrintView({
  data,
  showSchoolStamp,
  showSignatures,
  kepalaSekolah,
  nipKepalaSekolah,
  todayStr,
  ttdKepalaSekolah,
  stempelSekolah
}: any) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-base font-black uppercase text-gray-900 tracking-wide underline underline-offset-4">
          REKAPITULASI PRESENSI & KEDISIPLINAN GURU / TENAGA KEPENDIDIKAN
        </h2>
        <p className="text-xs text-gray-600 mt-1 font-medium">
          Periode: Bulan {data?.bulanNama} {data?.tahun} | Jumlah Hari Kerja: {data?.hariKerja} Hari
        </p>
      </div>

      <table className="w-full border-collapse border border-gray-400 text-xs text-center">
        <thead>
          <tr className="bg-gray-100 font-bold text-gray-800 border-b border-gray-400">
            <th className="border-r border-gray-400 p-2 w-8">No</th>
            <th className="border-r border-gray-400 p-2 text-left">Nama Guru & NIP</th>
            <th className="border-r border-gray-400 p-2 text-left">Mata Pelajaran</th>
            <th className="border-r border-gray-400 p-2 w-16">Hari Kerja</th>
            <th className="border-r border-gray-400 p-2 w-14">Hadir</th>
            <th className="border-r border-gray-400 p-2 w-14">Terlambat</th>
            <th className="border-r border-gray-400 p-2 w-14">Izin/Cuti</th>
            <th className="border-r border-gray-400 p-2 w-14">Sakit</th>
            <th className="border-r border-gray-400 p-2 w-14">Alpa</th>
            <th className="border-r border-gray-400 p-2 w-20">% Disiplin</th>
            <th className="p-2 w-28">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {data?.teachers?.map((t: any, idx: number) => (
            <tr key={t.id} className="border-b border-gray-300">
              <td className="border-r border-gray-400 p-2">{idx + 1}</td>
              <td className="border-r border-gray-400 p-2 text-left">
                <div className="font-semibold text-gray-900">{t.nama}</div>
                <div className="text-[10px] text-gray-500 font-mono">NIP: {t.nip}</div>
              </td>
              <td className="border-r border-gray-400 p-2 text-left">{t.mapel}</td>
              <td className="border-r border-gray-400 p-2">{t.hariKerja}</td>
              <td className="border-r border-gray-400 p-2 font-bold text-emerald-800">{t.hadir}</td>
              <td className="border-r border-gray-400 p-2 font-semibold text-amber-800">{t.terlambat}</td>
              <td className="border-r border-gray-400 p-2">{t.izin + t.cuti}</td>
              <td className="border-r border-gray-400 p-2">{t.sakit}</td>
              <td className="border-r border-gray-400 p-2 font-bold text-rose-800">{t.alpa}</td>
              <td className="border-r border-gray-400 p-2 font-bold">{t.persentase}%</td>
              <td className="p-2 text-[11px]">{t.keterangan}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PENGESAHAN KEPALA SEKOLAH */}
      <div className="pt-8 flex justify-end text-xs text-gray-800">
        <div className="text-center w-64 relative">
          <p className="text-gray-600">Kota Pelajar, {todayStr}<br />Kepala Sekolah,</p>

          <div className="h-16 flex items-center justify-center relative">
            {/* STEMPEL SEKOLAH DIGITAL (CAP BASAH): Di sebelah kiri, menempel & menindih sedikit ujung kiri tanda tangan */}
            {showSchoolStamp && (
              stempelSekolah ? (
                <div 
                  className="absolute z-10 flex items-center justify-center pointer-events-none select-none opacity-85"
                  style={{
                    left: "calc(50% - 38px)",
                    top: "50%",
                    transform: "translate(-50%, -50%) rotate(-8deg)",
                    width: "88px",
                    height: "88px"
                  }}
                >
                  <img 
                    src={stempelSekolah} 
                    alt="Stempel Sekolah" 
                    className="w-full h-full object-contain" 
                    style={{ mixBlendMode: "multiply" }}
                  />
                </div>
              ) : (
                <div 
                  className="absolute z-10 rounded-full border-[3px] border-indigo-700/85 text-indigo-800/85 flex flex-col items-center justify-center text-center p-1.5 pointer-events-none select-none shadow-xs"
                  style={{
                    left: "calc(50% - 38px)",
                    top: "50%",
                    transform: "translate(-50%, -50%) rotate(-8deg)",
                    width: "88px",
                    height: "88px"
                  }}
                >
                  <span className="text-[7px] font-black uppercase tracking-wider">DINAS PENDIDIKAN</span>
                  <span className="text-[8px] font-black uppercase my-0.5">★ RESMI ★</span>
                  <span className="text-[7px] font-black uppercase leading-none">SMP NEGERI 1</span>
                </div>
              )
            )}

            {/* TANDA TANGAN */}
            <div className="relative z-20 flex items-center justify-center">
              {showSignatures && (
                ttdKepalaSekolah ? (
                  <img src={ttdKepalaSekolah} alt="TTD Kepala Sekolah" className="max-h-16 max-w-32 object-contain" />
                ) : (
                  <span className="font-serif italic text-blue-900 text-base font-bold select-none opacity-80">
                    {kepalaSekolah.replace(/^(Drs\.|Dr\.|H\.|Hj\.|Prof\.)\s*/i, '').split(',')[0]}
                  </span>
                )
              )}
            </div>
          </div>
          <p className="font-bold text-gray-900 border-b border-gray-900 pb-0.5 inline-block relative z-20">
            {kepalaSekolah}
          </p>
          <p className="text-[10px] text-gray-600 font-mono relative z-20">NIP. {nipKepalaSekolah}</p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// SUB-TEMPLATE 3: LAPORAN REKAPITULASI UMUM
// ----------------------------------------------------
function GeneralReportPrintView({
  data,
  showSchoolStamp,
  showSignatures,
  kepalaSekolah,
  nipKepalaSekolah,
  todayStr,
  ttdKepalaSekolah,
  stempelSekolah
}: any) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-base font-black uppercase text-gray-900 tracking-wide underline underline-offset-4">
          LAPORAN REKAPITULASI KEHADIRAN SEKOLAH
        </h2>
        <p className="text-xs text-gray-600 mt-1 font-medium">
          Dihasilkan secara otomatis oleh Sistem Presensi Digital Sekolah
        </p>
      </div>

      <table className="w-full border-collapse border border-gray-400 text-xs">
        <thead>
          <tr className="bg-gray-100 font-bold text-gray-800 border-b border-gray-400">
            <th className="border-r border-gray-400 p-2 text-center w-8">No</th>
            <th className="border-r border-gray-400 p-2 text-left">Nama Lengkap</th>
            <th className="border-r border-gray-400 p-2 text-center w-20">Peran</th>
            <th className="border-r border-gray-400 p-2 text-center w-16">Hadir</th>
            <th className="border-r border-gray-400 p-2 text-center w-16">Terlambat</th>
            <th className="border-r border-gray-400 p-2 text-center w-16">Izin/Sakit</th>
            <th className="border-r border-gray-400 p-2 text-center w-16">Alpa</th>
            <th className="p-2 text-center w-20">% Kehadiran</th>
          </tr>
        </thead>
        <tbody>
          {data?.tableData?.map((row: any, idx: number) => (
            <tr key={row.id} className="border-b border-gray-300">
              <td className="border-r border-gray-400 p-2 text-center">{idx + 1}</td>
              <td className="border-r border-gray-400 p-2 text-left font-medium">{row.nama}</td>
              <td className="border-r border-gray-400 p-2 text-center">{row.role}</td>
              <td className="border-r border-gray-400 p-2 text-center font-bold text-emerald-800">{row.total_hadir}</td>
              <td className="border-r border-gray-400 p-2 text-center text-amber-800">{row.total_terlambat}</td>
              <td className="border-r border-gray-400 p-2 text-center">{row.total_izin}</td>
              <td className="border-r border-gray-400 p-2 text-center font-bold text-rose-800">{row.total_alpa}</td>
              <td className="p-2 text-center font-bold">{row.persentase}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pt-8 flex justify-between items-start text-xs text-gray-800">
        <div className="text-center w-52">
          <p className="text-gray-600 mb-14">Staf Administrasi & Absensi,</p>
          <p className="font-bold border-b border-gray-900 pb-0.5">Admin Tata Usaha</p>
          <p className="text-[10px] text-gray-600">NIP. 198207142008012009</p>
        </div>

        <div className="text-center w-52 relative">
          <p className="text-gray-600">Kota Pelajar, {todayStr}<br />Mengetahui, Kepala Sekolah</p>

          <div className="h-14 flex items-center justify-center relative">
            {/* STEMPEL SEKOLAH DIGITAL (CAP BASAH): Di sebelah kiri, menempel & menindih sedikit ujung kiri tanda tangan */}
            {showSchoolStamp && (
              stempelSekolah ? (
                <div 
                  className="absolute z-10 flex items-center justify-center pointer-events-none select-none opacity-85"
                  style={{
                    left: "calc(50% - 34px)",
                    top: "50%",
                    transform: "translate(-50%, -50%) rotate(-8deg)",
                    width: "80px",
                    height: "80px"
                  }}
                >
                  <img 
                    src={stempelSekolah} 
                    alt="Stempel Sekolah" 
                    className="w-full h-full object-contain" 
                    style={{ mixBlendMode: "multiply" }}
                  />
                </div>
              ) : (
                <div 
                  className="absolute z-10 rounded-full border-2 border-indigo-700/85 text-indigo-800/85 flex flex-col items-center justify-center text-center p-1 pointer-events-none select-none"
                  style={{
                    left: "calc(50% - 34px)",
                    top: "50%",
                    transform: "translate(-50%, -50%) rotate(-8deg)",
                    width: "80px",
                    height: "80px"
                  }}
                >
                  <span className="text-[6px] font-black uppercase">DINAS PENDIDIKAN</span>
                  <span className="text-[7px] font-black uppercase my-0.5">★ RESMI ★</span>
                  <span className="text-[6px] font-black uppercase">SMP NEGERI 1</span>
                </div>
              )
            )}

            {/* TANDA TANGAN */}
            <div className="relative z-20 flex items-center justify-center">
              {showSignatures && (
                ttdKepalaSekolah ? (
                  <img src={ttdKepalaSekolah} alt="TTD Kepala Sekolah" className="max-h-14 max-w-28 object-contain" />
                ) : (
                  <span className="font-serif italic text-blue-900 text-sm font-bold select-none opacity-80">
                    {kepalaSekolah.replace(/^(Drs\.|Dr\.|H\.|Hj\.|Prof\.)\s*/i, '').split(',')[0]}
                  </span>
                )
              )}
            </div>
          </div>

          <p className="font-bold border-b border-gray-900 pb-0.5 relative z-20">{kepalaSekolah}</p>
          <p className="text-[10px] text-gray-600 relative z-20">NIP. {nipKepalaSekolah}</p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// SUB-TEMPLATE 4: BUKU LEGER SEMESTER SISWA (REKAP RAPOR)
// ----------------------------------------------------
function SemesterLegerPrintView({
  report,
  showSchoolStamp,
  showSignatures,
  customNotes,
  kepalaSekolah,
  nipKepalaSekolah,
  todayStr,
  ttdKepalaSekolah,
  stempelSekolah
}: {
  report: SemesterClassAttendanceReport;
  showSchoolStamp: boolean;
  showSignatures: boolean;
  customNotes: string;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
  todayStr: string;
  ttdKepalaSekolah?: string | null;
  stempelSekolah?: string | null;
}) {
  return (
    <div className="space-y-4">
      {/* JUDUL DOKUMEN */}
      <div className="text-center">
        <h2 className="text-sm sm:text-base font-black uppercase text-gray-900 tracking-wide underline underline-offset-4">
          LEGER REKAPITULASI PRESENSI SISWA (REKAP RAPOR INDUK)
        </h2>
        <p className="text-xs text-gray-600 mt-1 font-medium">
          Tahun Pelajaran {report.tahunAjaran} — {report.semester}
        </p>
      </div>

      {/* METADATA KELAS */}
      <div className="grid grid-cols-2 text-xs text-gray-800 border-b border-gray-300 pb-3 gap-2">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 text-gray-600 font-medium">Kelas</span>
            <span className="font-bold">: {report.className}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-gray-600 font-medium">Wali Kelas</span>
            <span className="font-semibold">: {report.waliKelas}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-gray-600 font-medium">NIP Wali Kelas</span>
            <span>: {report.nipWaliKelas}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex">
            <span className="w-32 text-gray-600 font-medium">Total Hari Efektif</span>
            <span className="font-bold">: {report.totalHariEfektif} Hari</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600 font-medium">Jumlah Siswa</span>
            <span>: {report.summary.totalSiswa} Siswa (L: {report.summary.totalLaki}, P: {report.summary.totalPerempuan})</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600 font-medium">Rata-rata Hadir</span>
            <span className="font-bold text-emerald-700">: {report.summary.rataRataKehadiran}%</span>
          </div>
        </div>
      </div>

      {/* TABEL LEGER SEMESTER */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100 text-gray-900 font-bold border-b border-gray-400">
              <th className="border-r border-gray-400 p-1.5 text-center w-8" rowSpan={2}>No</th>
              <th className="border-r border-gray-400 p-1.5 text-center w-16" rowSpan={2}>NIS</th>
              <th className="border-r border-gray-400 p-1.5 text-left min-w-[140px]" rowSpan={2}>Nama Siswa</th>
              <th className="border-r border-gray-400 p-1.5 text-center w-8" rowSpan={2}>L/P</th>
              <th className="border-r border-gray-400 p-1 text-center bg-gray-200" colSpan={report.monthsList.length}>
                Rincian Kehadiran Per Bulan
              </th>
              <th className="border-r border-gray-400 p-1 text-center bg-blue-100/70" colSpan={4}>
                Akumulasi 1 Semester (Rapor)
              </th>
              <th className="border-r border-gray-400 p-1.5 text-center w-12" rowSpan={2}>% Hadir</th>
              <th className="p-1.5 text-center w-24" rowSpan={2}>Predikat</th>
            </tr>
            <tr className="bg-gray-50 text-gray-800 text-[9px] font-semibold border-b border-gray-400">
              {report.monthsList.map((m, i) => (
                <th key={i} className="border-r border-gray-400 p-1 text-center">
                  {m.substring(0, 3)}
                </th>
              ))}
              <th className="border-r border-gray-400 p-1 text-center text-emerald-800 bg-blue-50/50">H</th>
              <th className="border-r border-gray-400 p-1 text-center text-blue-800 bg-blue-50/50">S</th>
              <th className="border-r border-gray-400 p-1 text-center text-amber-800 bg-blue-50/50">I</th>
              <th className="border-r border-gray-400 p-1 text-center text-rose-800 bg-blue-50/50">A</th>
            </tr>
          </thead>
          <tbody>
            {report.students.map((student, idx) => (
              <tr 
                key={student.id} 
                className={`border-b border-gray-300 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
              >
                <td className="border-r border-gray-400 p-1 text-center">{idx + 1}</td>
                <td className="border-r border-gray-400 p-1 text-center font-mono text-[9px]">{student.nis}</td>
                <td className="border-r border-gray-400 p-1 font-semibold text-gray-900 whitespace-nowrap">{student.name}</td>
                <td className="border-r border-gray-400 p-1 text-center">{student.jk}</td>
                {student.monthlyBreakdown.map((m, mIdx) => (
                  <td key={mIdx} className="border-r border-gray-400 p-1 text-center text-[9px]">
                    {m.sakit > 0 || m.izin > 0 || m.alpa > 0 ? (
                      <span className="font-semibold text-rose-700">
                        {m.sakit > 0 ? `S:${m.sakit} ` : ""}{m.izin > 0 ? `I:${m.izin} ` : ""}{m.alpa > 0 ? `A:${m.alpa}` : ""}
                      </span>
                    ) : (
                      <span className="text-emerald-700">✓</span>
                    )}
                  </td>
                ))}
                <td className="border-r border-gray-400 p-1 text-center font-bold text-emerald-800 bg-emerald-50/30">
                  {student.totalHadir}
                </td>
                <td className="border-r border-gray-400 p-1 text-center font-bold text-blue-800">
                  {student.totalSakit || "-"}
                </td>
                <td className="border-r border-gray-400 p-1 text-center font-bold text-amber-800">
                  {student.totalIzin || "-"}
                </td>
                <td className="border-r border-gray-400 p-1 text-center font-bold text-rose-800">
                  {student.totalAlpa || "-"}
                </td>
                <td className="border-r border-gray-400 p-1 text-center font-bold">
                  {student.persentase}%
                </td>
                <td className="p-1 text-center">
                  <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                    student.predikat === "Sangat Baik" 
                      ? "bg-emerald-100 text-emerald-800" 
                      : student.predikat === "Baik"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-rose-100 text-rose-800"
                  }`}>
                    {student.predikat}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CATATAN RESMI */}
      <div className="border border-gray-300 p-2.5 rounded text-xs bg-gray-50/50">
        <p className="font-bold text-gray-800 mb-0.5">Catatan Pembinaan / Rekomendasi Rapor:</p>
        <p className="text-gray-700 italic">{customNotes}</p>
      </div>

      {/* TANDA TANGAN FORMAL */}
      {showSignatures && (
        <div className="pt-6 flex justify-between items-start text-xs text-gray-800">
          <div className="text-center w-56 relative">
            <p className="text-gray-600">Mengetahui,<br />Kepala Sekolah</p>

            <div className="h-14 flex items-center justify-center relative">
              {/* STEMPEL SEKOLAH DIGITAL (CAP BASAH): Di sebelah kiri, menempel & menindih sedikit ujung kiri tanda tangan */}
              {showSchoolStamp && (
                stempelSekolah ? (
                  <div 
                    className="absolute z-10 flex items-center justify-center pointer-events-none select-none opacity-85"
                    style={{
                      left: "calc(50% - 34px)",
                      top: "50%",
                      transform: "translate(-50%, -50%) rotate(-8deg)",
                      width: "80px",
                      height: "80px"
                    }}
                  >
                    <img 
                      src={stempelSekolah} 
                      alt="Stempel Sekolah" 
                      className="w-full h-full object-contain" 
                      style={{ mixBlendMode: "multiply" }}
                    />
                  </div>
                ) : (
                  <div 
                    className="absolute z-10 rounded-full border-2 border-indigo-700/80 text-indigo-800/80 flex flex-col items-center justify-center text-center p-1 pointer-events-none select-none"
                    style={{
                      left: "calc(50% - 34px)",
                      top: "50%",
                      transform: "translate(-50%, -50%) rotate(-8deg)",
                      width: "80px",
                      height: "80px"
                    }}
                  >
                    <span className="text-[6px] font-black uppercase">DINAS PENDIDIKAN</span>
                    <span className="text-[7px] font-black uppercase my-0.5">★ RESMI ★</span>
                    <span className="text-[6px] font-black uppercase">SMP NEGERI 1</span>
                  </div>
                )
              )}

              {/* TANDA TANGAN */}
              <div className="relative z-20 flex items-center justify-center">
                {showSignatures && (
                  ttdKepalaSekolah ? (
                    <img src={ttdKepalaSekolah} alt="TTD Kepala Sekolah" className="max-h-14 max-w-28 object-contain" />
                  ) : (
                    <span className="font-serif italic text-blue-900 text-sm font-bold select-none opacity-80">
                      {kepalaSekolah.replace(/^(Drs\.|Dr\.|H\.|Hj\.|Prof\.)\s*/i, '').split(',')[0]}
                    </span>
                  )
                )}
              </div>
            </div>

            <p className="font-bold border-b border-gray-900 pb-0.5 relative z-20">{kepalaSekolah}</p>
            <p className="text-[10px] text-gray-600 relative z-20">NIP. {nipKepalaSekolah}</p>
          </div>

          <div className="text-center w-56">
            <p className="text-gray-600 mb-14">Kota Pelajar, {todayStr}<br />Wali Kelas {report.className}</p>
            <p className="font-bold border-b border-gray-900 pb-0.5">{report.waliKelas}</p>
            <p className="text-[10px] text-gray-600">NIP. {report.nipWaliKelas}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// SUB-TEMPLATE 5: LEGER NILAI SISWA (BUKU INDUK RAPOR)
// ----------------------------------------------------
function GradeLegerPrintView({
  report,
  showSchoolStamp,
  showSignatures,
  customNotes,
  kepalaSekolah,
  nipKepalaSekolah,
  todayStr,
  ttdKepalaSekolah,
  stempelSekolah
}: any) {
  if (!report) return null;

  return (
    <div className="space-y-3 font-sans text-gray-900">
      {/* JUDUL DOKUMEN */}
      <div className="text-center space-y-0.5">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-950 underline underline-offset-2">
          BUKU LEGER NILAI HASIL BELAJAR SISWA (BUKU INDUK RAPOR)
        </h2>
        <p className="text-[11px] font-bold text-gray-700">
          {report.kurikulum?.toUpperCase()} • TAHUN PELAJARAN {report.tahunAjaran}
        </p>
      </div>

      {/* METADATA INFORMASI KELAS */}
      <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 border border-gray-300 p-2.5 rounded">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 text-gray-600 font-medium">Kelas</span>
            <span className="font-bold">: {report.className}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-gray-600 font-medium">Wali Kelas</span>
            <span>: {report.waliKelas} (NIP. {report.nipWaliKelas})</span>
          </div>
          <div className="flex">
            <span className="w-28 text-gray-600 font-medium">Kurikulum</span>
            <span className="font-semibold">: {report.kurikulum}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 text-gray-600 font-medium">Semester</span>
            <span className="font-bold">: {report.semester}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-gray-600 font-medium">KKTP Standar</span>
            <span className="font-bold text-blue-900">: {report.kktpStandar}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-gray-600 font-medium">Jumlah Siswa</span>
            <span>: {report.summary?.totalSiswa} Siswa (L: {report.summary?.totalLaki}, P: {report.summary?.totalPerempuan})</span>
          </div>
        </div>
      </div>

      {/* TABEL MASTER LEGER NILAI */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400 text-[10px] leading-tight">
          <thead>
            <tr className="bg-gray-100 text-gray-900 font-bold border-b border-gray-400 text-center">
              <th className="border-r border-gray-400 p-1 w-6" rowSpan={2}>No</th>
              <th className="border-r border-gray-400 p-1 w-14" rowSpan={2}>NIS</th>
              <th className="border-r border-gray-400 p-1 text-left w-36" rowSpan={2}>Nama Siswa</th>
              <th className="border-r border-gray-400 p-1 w-6" rowSpan={2}>L/P</th>
              <th className="border-r border-gray-400 p-1" colSpan={report.subjects?.length}>
                NILAI AKHIR MATA PELAJARAN
              </th>
              <th className="border-r border-gray-400 p-1 w-10" rowSpan={2}>Jml</th>
              <th className="border-r border-gray-400 p-1 w-10" rowSpan={2}>Rata</th>
              <th className="border-r border-gray-400 p-1 w-8" rowSpan={2}>Rank</th>
              <th className="border-r border-gray-400 p-1" colSpan={3}>Presensi</th>
              <th className="p-1 w-12" rowSpan={2}>Status</th>
            </tr>
            <tr className="bg-gray-50 text-[9px] text-gray-700 font-semibold border-b border-gray-400 text-center">
              {report.subjects?.map((sub: any) => (
                <th key={sub.code} className="border-r border-gray-400 p-1 w-8" title={sub.name}>
                  {sub.code}
                </th>
              ))}
              <th className="border-r border-gray-400 p-0.5 w-5 text-blue-900">S</th>
              <th className="border-r border-gray-400 p-0.5 w-5 text-amber-900">I</th>
              <th className="border-r border-gray-400 p-0.5 w-5 text-rose-900">A</th>
            </tr>
            {/* BARIS KKTP */}
            <tr className="bg-blue-50/60 text-[9px] text-blue-950 font-bold border-b border-gray-400 text-center">
              <td className="border-r border-gray-400 p-0.5" colSpan={4}>KKTP MINIMAL</td>
              {report.subjects?.map((sub: any) => (
                <td key={sub.code} className="border-r border-gray-400 p-0.5 font-bold">
                  {sub.kktp}
                </td>
              ))}
              <td className="border-r border-gray-400 p-0.5" colSpan={6}>-</td>
            </tr>
          </thead>
          <tbody>
            {report.students?.map((st: any, idx: number) => {
              const isTop3 = st.ranking <= 3;
              return (
                <tr 
                  key={st.id} 
                  className={`border-b border-gray-300 ${
                    isTop3 ? "bg-amber-50/40 font-semibold" : idx % 2 === 1 ? "bg-gray-50/50" : ""
                  }`}
                >
                  <td className="border-r border-gray-400 p-1 text-center">{idx + 1}</td>
                  <td className="border-r border-gray-400 p-1 text-center font-mono text-[9px]">{st.nis}</td>
                  <td className="border-r border-gray-400 p-1 text-left whitespace-nowrap font-medium">
                    {st.name}
                  </td>
                  <td className="border-r border-gray-400 p-1 text-center">{st.jk}</td>
                  {report.subjects?.map((sub: any) => {
                    const grade = st.subjectGrades?.[sub.code];
                    const val = grade ? grade.nilaiAkhir : 0;
                    const isBelow = val < sub.kktp;
                    return (
                      <td 
                        key={sub.code} 
                        className={`border-r border-gray-400 p-1 text-center ${
                          isBelow ? "text-rose-700 font-bold bg-rose-50" : ""
                        }`}
                      >
                        {val}
                      </td>
                    );
                  })}
                  <td className="border-r border-gray-400 p-1 text-center font-bold text-blue-950">
                    {st.totalNilai}
                  </td>
                  <td className="border-r border-gray-400 p-1 text-center font-bold">
                    {st.rataRataNilai}
                  </td>
                  <td className={`border-r border-gray-400 p-1 text-center font-black ${
                    st.ranking === 1 ? "text-amber-700 bg-amber-100/60" :
                    st.ranking === 2 ? "text-slate-700 bg-slate-100" :
                    st.ranking === 3 ? "text-amber-900 bg-amber-50" : ""
                  }`}>
                    {st.ranking}
                  </td>
                  <td className="border-r border-gray-400 p-1 text-center text-blue-800">
                    {st.presensi?.sakit || "-"}
                  </td>
                  <td className="border-r border-gray-400 p-1 text-center text-amber-800">
                    {st.presensi?.izin || "-"}
                  </td>
                  <td className="border-r border-gray-400 p-1 text-center font-bold text-rose-800">
                    {st.presensi?.alpa || "-"}
                  </td>
                  <td className="p-1 text-center text-[9px] font-bold">
                    <span className={st.statusKelulusan === "Tuntas" ? "text-emerald-700" : "text-rose-700"}>
                      {st.statusKelulusan}
                    </span>
                  </td>
                </tr>
              );
            })}

            {/* RATA-RATA KELAS PER MAPEL */}
            <tr className="bg-gray-100 font-bold border-t border-gray-400 text-center">
              <td className="border-r border-gray-400 p-1 text-center" colSpan={4}>
                RATA-RATA KELAS
              </td>
              {report.subjects?.map((sub: any) => (
                <td key={sub.code} className="border-r border-gray-400 p-1 text-blue-950">
                  {report.summary?.subjectAverages?.[sub.code] || "-"}
                </td>
              ))}
              <td className="border-r border-gray-400 p-1">
                {Math.round((report.summary?.rataRataKelas || 0) * (report.subjects?.length || 1))}
              </td>
              <td className="border-r border-gray-400 p-1 text-blue-950">
                {report.summary?.rataRataKelas}
              </td>
              <td className="border-r border-gray-400 p-1" colSpan={4}>
                {report.summary?.persentaseKetuntasan}% Tuntas
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* STATISTIK & KETERANGAN MAPEL */}
      <div className="grid grid-cols-2 gap-3 text-[10px] pt-1">
        <div className="border border-gray-300 p-2 rounded bg-gray-50/60 space-y-1">
          <span className="font-bold text-gray-900 block">Keterangan Mata Pelajaran & KKTP:</span>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-gray-700 text-[9px]">
            {report.subjects?.map((sub: any) => (
              <span key={sub.code}>
                <strong>{sub.code}</strong>: {sub.name} (KKTP: {sub.kktp})
              </span>
            ))}
          </div>
        </div>

        <div className="border border-gray-300 p-2 rounded bg-gray-50/60 space-y-1">
          <span className="font-bold text-gray-900 block">Ringkasan Ketuntasan Kelas:</span>
          <div className="space-y-0.5 text-gray-700 text-[9px]">
            <p>• Nilai Tertinggi: <strong>{report.summary?.nilaiTertinggi}</strong> (Juara 1)</p>
            <p>• Nilai Terendah: <strong>{report.summary?.nilaiTerendah}</strong></p>
            <p>• Tingkat Ketuntasan Belajar Kelas: <strong>{report.summary?.persentaseKetuntasan}%</strong></p>
            <p className="italic text-gray-600 mt-1">"{customNotes}"</p>
          </div>
        </div>
      </div>

      {/* LEMBAR PENGESAHAN KEPALA SEKOLAH & WALI KELAS */}
      {showSignatures && (
        <div className="pt-6 flex justify-between items-start text-xs text-gray-800">
          <div className="text-center w-60 relative">
            <p className="text-gray-600">Mengetahui,<br />Kepala Sekolah</p>

            <div className="h-14 flex items-center justify-center relative">
              {/* STEMPEL SEKOLAH DIGITAL (CAP BASAH): Di sebelah kiri, menempel & menindih sedikit ujung kiri tanda tangan */}
              {showSchoolStamp && (
                stempelSekolah ? (
                  <div 
                    className="absolute z-10 flex items-center justify-center pointer-events-none select-none opacity-85"
                    style={{
                      left: "calc(50% - 36px)",
                      top: "50%",
                      transform: "translate(-50%, -50%) rotate(-8deg)",
                      width: "84px",
                      height: "84px"
                    }}
                  >
                    <img 
                      src={stempelSekolah} 
                      alt="Stempel Sekolah" 
                      className="w-full h-full object-contain" 
                      style={{ mixBlendMode: "multiply" }}
                    />
                  </div>
                ) : (
                  <div 
                    className="absolute z-10 rounded-full border-2 border-indigo-700/80 text-indigo-800/80 flex flex-col items-center justify-center text-center p-1 pointer-events-none select-none"
                    style={{
                      left: "calc(50% - 36px)",
                      top: "50%",
                      transform: "translate(-50%, -50%) rotate(-8deg)",
                      width: "84px",
                      height: "84px"
                    }}
                  >
                    <span className="text-[6px] font-black uppercase">DINAS PENDIDIKAN</span>
                    <span className="text-[7px] font-black uppercase my-0.5">★ RESMI ★</span>
                    <span className="text-[6px] font-black uppercase">SMP NEGERI 1</span>
                  </div>
                )
              )}

              {/* TANDA TANGAN */}
              <div className="relative z-20 flex items-center justify-center">
                {showSignatures && (
                  ttdKepalaSekolah ? (
                    <img src={ttdKepalaSekolah} alt="TTD Kepala Sekolah" className="max-h-14 max-w-28 object-contain" />
                  ) : (
                    <span className="font-serif italic text-blue-900 text-sm font-bold select-none opacity-80">
                      {kepalaSekolah.replace(/^(Drs\.|Dr\.|H\.|Hj\.|Prof\.)\s*/i, '').split(',')[0]}
                    </span>
                  )
                )}
              </div>
            </div>

            <p className="font-bold border-b border-gray-900 pb-0.5 relative z-20">{kepalaSekolah}</p>
            <p className="text-[10px] text-gray-600 relative z-20">NIP. {nipKepalaSekolah}</p>
          </div>

          <div className="text-center w-60">
            <p className="text-gray-600 mb-14">Kota Pelajar, {todayStr}<br />Wali Kelas {report.className}</p>
            <p className="font-bold border-b border-gray-900 pb-0.5">{report.waliKelas}</p>
            <p className="text-[10px] text-gray-600">NIP. {report.nipWaliKelas}</p>
          </div>
        </div>
      )}
    </div>
  );
}

