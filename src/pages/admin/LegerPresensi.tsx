import React, { useState, useEffect } from "react";
import { useAuth } from "@/store/useAuth";
import { 
  apiGetClasses, 
  apiGetSemesterClassReport, 
  SemesterClassAttendanceReport,
  MonthlyClassAttendanceReport,
  apiGetSettings 
} from "@/services/api";
import { exportSemesterClassReportToExcel } from "@/utils/excelExport";
import ClassMatrixReport from "@/components/reports/ClassMatrixReport";
import PrintPreviewModal from "@/components/reports/PrintPreviewModal";
import LegerNilaiTab from "@/components/reports/LegerNilaiTab";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Calendar, 
  Download, 
  Printer, 
  Search, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Award, 
  FileSpreadsheet, 
  GraduationCap 
} from "lucide-react";

export default function AdminLegerPresensi() {
  const { token } = useAuth();

  // Mode switcher: "nilai" | "semester" | "bulanan"
  const [activeMode, setActiveMode] = useState<"nilai" | "semester" | "bulanan">("nilai");

  // State Semester Leger
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("C1");
  const [selectedSemester, setSelectedSemester] = useState<"ganjil" | "genap">("ganjil");
  const [selectedYear, setSelectedYear] = useState(2026);
  const [searchQuery, setSearchQuery] = useState("");
  const [semesterReport, setSemesterReport] = useState<SemesterClassAttendanceReport | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Print modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printType, setPrintType] = useState<"semester_leger" | "class_matrix">("semester_leger");
  const [printData, setPrintData] = useState<any>(null);

  // Load initial classes & settings
  useEffect(() => {
    const init = async () => {
      if (!token) return;
      try {
        const [clsRes, setRes] = await Promise.all([
          apiGetClasses(token),
          apiGetSettings(token)
        ]);
        if (clsRes.success && clsRes.data) {
          setClasses(clsRes.data);
          if (clsRes.data.length > 0) {
            setSelectedClassId(clsRes.data[0].id);
          }
        }
        if (setRes.success && setRes.data) {
          setSchoolSettings(setRes.data);
        }
      } catch (err) {
        console.error("Gagal memuat data awal", err);
      }
    };
    init();
  }, [token]);

  // Load Semester Leger data
  const fetchSemesterReport = async () => {
    if (!token || !selectedClassId) return;
    setIsLoading(true);
    try {
      const res = await apiGetSemesterClassReport(token, selectedClassId, selectedSemester, selectedYear);
      if (res.success && res.data) {
        setSemesterReport(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat rekap semester", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeMode === "semester") {
      fetchSemesterReport();
    }
  }, [token, selectedClassId, selectedSemester, selectedYear, activeMode]);

  // Filter siswa berdasarkan pencarian
  const filteredStudents = semesterReport?.students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nis.includes(searchQuery) ||
    s.nisn.includes(searchQuery)
  ) || [];

  // Export Excel Leger Semester
  const handleExportSemesterExcel = () => {
    if (!semesterReport) return;
    exportSemesterClassReportToExcel(semesterReport, schoolSettings);
    setSuccessMsg("Leger Presensi Siswa (Format Rapor) berhasil diekspor ke Microsoft Excel (.xlsx)");
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Open Print modal for Semester Leger
  const handlePrintSemester = () => {
    if (!semesterReport) return;
    setPrintType("semester_leger");
    setPrintData(semesterReport);
    setIsPrintModalOpen(true);
  };

  // Callback from ClassMatrixReport (mode bulanan)
  const handleOpenMatrixPrint = (type: "class_matrix", data: MonthlyClassAttendanceReport) => {
    setPrintType("class_matrix");
    setPrintData(data);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Buku Leger Presensi Siswa
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Buku Induk & Rapor
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Rekapitulasi resmi kehadiran siswa per semester untuk pengisian e-Rapor dan arsip buku induk sekolah.
          </p>
        </div>

        {/* MODE SWITCHER */}
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-xs self-start sm:self-auto flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveMode("nilai")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === "nilai"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Leger Nilai (Point 2)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("semester")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === "semester"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Leger Presensi Semester (Point 1)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("bulanan")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === "bulanan"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Presensi Bulanan (Matriks)</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-3 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {/* RENDER CONTENT BERDASARKAN MODE */}
      {activeMode === "nilai" ? (
        token && <LegerNilaiTab token={token} classes={classes} schoolSettings={schoolSettings} />
      ) : activeMode === "bulanan" ? (
        <ClassMatrixReport onOpenPrintModal={handleOpenMatrixPrint} />
      ) : (
        <div className="space-y-6">
          {/* FILTER CONTROL CARD */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                {/* PILIH KELAS */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Pilih Kelas
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-blue-500 focus:border-blue-500 font-medium"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PILIH SEMESTER */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Semester
                  </label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value as "ganjil" | "genap")}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-blue-500 focus:border-blue-500 font-medium"
                  >
                    <option value="ganjil">Semester Ganjil (Juli - Des)</option>
                    <option value="genap">Semester Genap (Jan - Jun)</option>
                  </select>
                </div>

                {/* TAHUN AJARAN */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tahun Pelajaran
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-blue-500 focus:border-blue-500 font-medium"
                  >
                    <option value={2026}>2026/2027</option>
                    <option value={2025}>2025/2026</option>
                    <option value={2024}>2024/2025</option>
                  </select>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2 lg:pt-0">
                <Button
                  type="button"
                  onClick={fetchSemesterReport}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="text-xs h-9"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                  Segarkan
                </Button>

                <Button
                  type="button"
                  onClick={handleExportSemesterExcel}
                  disabled={!semesterReport || isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                  Ekspor Excel (.xlsx)
                </Button>

                <Button
                  type="button"
                  onClick={handlePrintSemester}
                  disabled={!semesterReport || isLoading}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-100 text-xs h-9 font-semibold"
                >
                  <Printer className="w-4 h-4 mr-1.5 text-gray-700" />
                  Cetak / PDF
                </Button>
              </div>
            </div>

            {/* SEARCH SISWA */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari siswa berdasarkan nama atau NIS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-gray-50 focus:bg-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {semesterReport && (
                <div className="text-xs text-gray-500 hidden sm:block">
                  Wali Kelas: <span className="font-semibold text-gray-800">{semesterReport.waliKelas}</span> (NIP. {semesterReport.nipWaliKelas})
                </div>
              )}
            </div>
          </div>

          {/* STATS SUMMARY TILES */}
          {semesterReport && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Total Siswa</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {semesterReport.summary.totalSiswa}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  L: {semesterReport.summary.totalLaki} | P: {semesterReport.summary.totalPerempuan}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Rata-rata Hadir</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-700 mt-2">
                  {semesterReport.summary.rataRataKehadiran}%
                </p>
                <p className="text-[11px] text-emerald-600 mt-0.5">
                  Ketuntasan Disiplin
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Total Sakit (S)</span>
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-800 mt-2">
                  {semesterReport.summary.totalSakit}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Hari kumulatif kelas
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Total Izin (I)</span>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-amber-800 mt-2">
                  {semesterReport.summary.totalIzin}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Hari kumulatif kelas
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Total Alpa (A)</span>
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                </div>
                <p className="text-2xl font-bold text-rose-800 mt-2">
                  {semesterReport.summary.totalAlpa}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Tanpa keterangan
                </p>
              </div>
            </div>
          )}

          {/* TABEL LEGER SEMESTER */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Daftar Rekapitulasi Rapor Siswa — {semesterReport?.className}
                </h2>
                <p className="text-xs text-gray-500">
                  {semesterReport?.semester} ({semesterReport?.tahunAjaran}) • {semesterReport?.totalHariEfektif} Hari Efektif
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                <span>Hadir</span>
                <span className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-full ml-1"></span>
                <span>Sakit</span>
                <span className="inline-block w-2.5 h-2.5 bg-amber-500 rounded-full ml-1"></span>
                <span>Izin</span>
                <span className="inline-block w-2.5 h-2.5 bg-rose-500 rounded-full ml-1"></span>
                <span>Alpa</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-700 uppercase text-[10px] font-bold border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-center w-10" rowSpan={2}>No</th>
                    <th scope="col" className="px-3 py-3 w-24" rowSpan={2}>NIS / NISN</th>
                    <th scope="col" className="px-3 py-3 min-w-[180px]" rowSpan={2}>Nama Siswa</th>
                    <th scope="col" className="px-2 py-3 text-center w-8" rowSpan={2}>L/P</th>
                    <th scope="col" className="px-2 py-2 text-center bg-gray-100 border-x border-gray-200" colSpan={semesterReport?.monthsList.length || 6}>
                      Rincian Kehadiran Per Bulan
                    </th>
                    <th scope="col" className="px-2 py-2 text-center bg-blue-50 text-blue-900 border-r border-gray-200" colSpan={4}>
                      Akumulasi e-Rapor
                    </th>
                    <th scope="col" className="px-3 py-3 text-center w-16" rowSpan={2}>% Hadir</th>
                    <th scope="col" className="px-3 py-3 text-center w-28" rowSpan={2}>Predikat</th>
                  </tr>
                  <tr className="bg-gray-100/70 border-b border-gray-200">
                    {semesterReport?.monthsList.map((m, idx) => (
                      <th key={idx} className="px-2 py-1.5 text-center text-[10px] border-r border-gray-200">
                        {m.substring(0, 3)}
                      </th>
                    ))}
                    <th className="px-2 py-1.5 text-center text-emerald-800 bg-blue-50/50">H</th>
                    <th className="px-2 py-1.5 text-center text-blue-800 bg-blue-50/50">S</th>
                    <th className="px-2 py-1.5 text-center text-amber-800 bg-blue-50/50">I</th>
                    <th className="px-2 py-1.5 text-center text-rose-800 bg-blue-50/50 border-r border-gray-200">A</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={16} className="px-4 py-12 text-center text-gray-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        Memuat data Leger Siswa...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="px-4 py-8 text-center text-gray-500">
                        Tidak ada siswa yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-3 py-3 text-center text-gray-500 font-medium">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-mono text-gray-800 text-[11px]">{student.nis}</div>
                          <div className="font-mono text-gray-400 text-[10px]">{student.nisn}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-semibold text-gray-900 block">{student.name}</span>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            student.jk === "L" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"
                          }`}>
                            {student.jk}
                          </span>
                        </td>
                        {student.monthlyBreakdown.map((m, mIdx) => (
                          <td key={mIdx} className="px-2 py-3 text-center border-r border-gray-100 text-[11px]">
                            {m.sakit > 0 || m.izin > 0 || m.alpa > 0 ? (
                              <span className="font-semibold text-rose-700">
                                {m.sakit > 0 ? `S:${m.sakit} ` : ""}{m.izin > 0 ? `I:${m.izin} ` : ""}{m.alpa > 0 ? `A:${m.alpa}` : ""}
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-bold">✓</span>
                            )}
                          </td>
                        ))}
                        <td className="px-2 py-3 text-center font-bold text-emerald-800 bg-emerald-50/20">
                          {student.totalHadir}
                        </td>
                        <td className="px-2 py-3 text-center font-bold text-blue-800 bg-blue-50/20">
                          {student.totalSakit > 0 ? student.totalSakit : "-"}
                        </td>
                        <td className="px-2 py-3 text-center font-bold text-amber-800 bg-amber-50/20">
                          {student.totalIzin > 0 ? student.totalIzin : "-"}
                        </td>
                        <td className="px-2 py-3 text-center font-bold text-rose-800 bg-rose-50/20 border-r border-gray-100">
                          {student.totalAlpa > 0 ? student.totalAlpa : "-"}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-gray-900">
                          {student.persentase}%
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            student.predikat === "Sangat Baik" 
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                              : student.predikat === "Baik"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}>
                            {student.predikat}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* CARD FOOTER */}
            {semesterReport && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">Catatan e-Rapor:</span>
                  <span>{semesterReport.catatanWaliKelas}</span>
                </div>
                <div>
                  Menampilkan {filteredStudents.length} dari {semesterReport.summary.totalSiswa} siswa
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reportType={printType}
        data={printData}
        schoolSettings={schoolSettings}
      />
    </div>
  );
}
