import React, { useState, useEffect } from "react";
import { 
  ClassGradeLegerReport, 
  StudentGradeRow, 
  apiGetClassGradeLeger, 
  apiResetClassGrades 
} from "@/services/api";
import { exportClassGradeLegerToExcel } from "@/utils/excelExport";
import PrintPreviewModal from "@/components/reports/PrintPreviewModal";
import InputNilaiModal from "@/components/reports/InputNilaiModal";
import { Button } from "@/components/ui/button";
import { 
  Award, 
  BookOpen, 
  Download, 
  Printer, 
  Search, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  GraduationCap, 
  Calculator, 
  Eye, 
  X, 
  Sparkles,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";

interface LegerNilaiTabProps {
  token: string;
  classes: { id: string; name: string }[];
  schoolSettings?: any;
}

export default function LegerNilaiTab({
  token,
  classes,
  schoolSettings
}: LegerNilaiTabProps) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || "");
  const [selectedSemester, setSelectedSemester] = useState<"ganjil" | "genap">("ganjil");
  const [selectedYear, setSelectedYear] = useState(2026);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeReport, setGradeReport] = useState<ClassGradeLegerReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync selectedClassId when classes change
  useEffect(() => {
    if (classes && classes.length > 0) {
      if (!selectedClassId || !classes.some(c => c.id === selectedClassId)) {
        setSelectedClassId(classes[0].id);
      }
    } else {
      setSelectedClassId("");
    }
  }, [classes]);

  // Modals
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<StudentGradeRow | null>(null);

  // Load report data
  const loadGradeReport = async () => {
    if (!token) return;
    if (!selectedClassId && classes.length === 0) {
      setGradeReport(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiGetClassGradeLeger(
        token,
        selectedClassId,
        selectedSemester,
        selectedYear
      );
      if (res.success && res.data) {
        setGradeReport(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat leger nilai", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGradeReport();
  }, [selectedClassId, selectedSemester, selectedYear, token]);

  const handleReset = async () => {
    if (window.confirm("Apakah Anda yakin ingin mereset seluruh data nilai kelas ini ke nilai bawaan?")) {
      setIsLoading(true);
      await apiResetClassGrades(token, selectedClassId, selectedSemester, selectedYear);
      await loadGradeReport();
      setSuccessMsg("Nilai kelas berhasil direset ke standar awal.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleExportExcel = () => {
    if (!gradeReport) return;
    exportClassGradeLegerToExcel(gradeReport, schoolSettings);
  };

  // Filter students by search
  const filteredStudents = gradeReport?.students.filter(st => 
    st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    st.nis.includes(searchQuery) ||
    st.nisn.includes(searchQuery)
  ) || [];

  return (
    <div className="space-y-5">
      {/* FILTER & CONTROL BAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Pilih Kelas */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Pilih Rombel / Kelas
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="text-xs font-bold bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-600 shadow-xs min-w-[140px]"
            >
              {classes.length === 0 ? (
                <option value="">(Belum ada rombel/kelas)</option>
              ) : (
                classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Pilih Semester */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as any)}
              className="text-xs font-bold bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-600 shadow-xs"
            >
              <option value="ganjil">Semester Ganjil</option>
              <option value="genap">Semester Genap</option>
            </select>
          </div>

          {/* Tahun Pelajaran */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Tahun Ajaran
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-bold bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-600 shadow-xs"
            >
              <option value={2026}>2026/2027</option>
              <option value={2025}>2025/2026</option>
            </select>
          </div>

          {/* Pencarian Siswa */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Cari Siswa
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama atau NIS..."
                className="text-xs bg-white border border-gray-300 rounded-xl pl-8 pr-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-600 shadow-xs w-44"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <Button
            type="button"
            onClick={() => setIsInputModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Input / Edit Nilai</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleExportExcel}
            className="text-xs font-semibold rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center space-x-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ekspor Excel</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPrintModalOpen(true)}
            className="text-xs font-semibold rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-gray-600" />
            <span>Cetak Dokumen</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            className="text-xs font-semibold text-gray-500 hover:text-rose-600 rounded-xl p-2"
            title="Reset nilai ke awal"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* STATISTIK RINGKASAN KELAS */}
      {gradeReport && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-medium">Total Siswa</p>
              <p className="text-base font-bold text-gray-900 leading-tight">
                {gradeReport.summary.totalSiswa} Siswa
              </p>
              <p className="text-[10px] text-gray-400">
                L: {gradeReport.summary.totalLaki} | P: {gradeReport.summary.totalPerempuan}
              </p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-medium">Rata-rata Kelas</p>
              <p className="text-base font-bold text-gray-900 leading-tight">
                {gradeReport.summary.rataRataKelas}
              </p>
              <p className="text-[10px] text-emerald-600 font-medium">
                KKTP Standar: {gradeReport.kktpStandar}
              </p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-medium">Peringkat 1 (Tertinggi)</p>
              <p className="text-base font-bold text-gray-900 leading-tight">
                {gradeReport.summary.nilaiTertinggi}
              </p>
              <p className="text-[10px] text-amber-700 font-medium truncate max-w-[120px]">
                {gradeReport.students.find(s => s.ranking === 1)?.name || "-"}
              </p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-medium">Ketuntasan Kelas</p>
              <p className="text-base font-bold text-gray-900 leading-tight">
                {gradeReport.summary.persentaseKetuntasan}%
              </p>
              <p className="text-[10px] text-purple-700 font-medium">
                Siswa Tuntas KKTP
              </p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center space-x-3 col-span-2 sm:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-medium">Wali Kelas</p>
              <p className="text-xs font-bold text-gray-900 leading-tight truncate max-w-[130px]" title={gradeReport.waliKelas}>
                {gradeReport.waliKelas}
              </p>
              <p className="text-[10px] text-gray-400 font-mono">
                NIP: {gradeReport.nipWaliKelas}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MASTER TABEL LEGER NILAI */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">
              Matriks Buku Leger Nilai & Peringkat Siswa ({gradeReport?.className})
            </h3>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            {filteredStudents.length} dari {gradeReport?.students.length || 0} Siswa
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-xs font-medium">Memuat data leger nilai siswa...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-center">
                  <th className="p-2.5 w-10 border-r border-gray-200" rowSpan={2}>No</th>
                  <th className="p-2.5 text-left min-w-[160px] border-r border-gray-200" rowSpan={2}>
                    Nama Siswa & NIS
                  </th>
                  <th className="p-2 w-8 border-r border-gray-200" rowSpan={2}>L/P</th>
                  <th className="p-2 border-r border-gray-200" colSpan={gradeReport?.subjects.length || 10}>
                    NILAI AKHIR MATA PELAJARAN (KKTP ≥ 75)
                  </th>
                  <th className="p-2 w-14 border-r border-gray-200" rowSpan={2}>Jumlah</th>
                  <th className="p-2 w-14 border-r border-gray-200" rowSpan={2}>Rata</th>
                  <th className="p-2 w-12 border-r border-gray-200" rowSpan={2}>Rank</th>
                  <th className="p-1 border-r border-gray-200" colSpan={3}>Presensi</th>
                  <th className="p-2 w-16 border-r border-gray-200" rowSpan={2}>Status</th>
                  <th className="p-2 w-16" rowSpan={2}>Aksi</th>
                </tr>
                <tr className="bg-gray-50 text-[10px] text-gray-600 font-semibold border-b border-gray-200 text-center">
                  {gradeReport?.subjects.map((sub) => (
                    <th key={sub.code} className="p-1.5 border-r border-gray-200 min-w-[42px]" title={`${sub.name} (KKTP: ${sub.kktp})`}>
                      {sub.code}
                    </th>
                  ))}
                  <th className="p-1 w-6 border-r border-gray-200 text-blue-700" title="Sakit">S</th>
                  <th className="p-1 w-6 border-r border-gray-200 text-amber-700" title="Izin">I</th>
                  <th className="p-1 w-6 border-r border-gray-200 text-rose-700" title="Alpa">A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={20} className="p-8 text-center text-gray-500 text-xs">
                      Tidak ditemukan siswa yang sesuai dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, idx) => {
                    const isRank1 = st.ranking === 1;
                    const isRank2 = st.ranking === 2;
                    const isRank3 = st.ranking === 3;

                    return (
                      <tr 
                        key={st.id} 
                        className={`hover:bg-blue-50/40 transition ${
                          isRank1 ? "bg-amber-50/40" : idx % 2 === 1 ? "bg-gray-50/50" : "bg-white"
                        }`}
                      >
                        <td className="p-2 text-center text-gray-500 font-medium border-r border-gray-200">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-gray-200">
                          <div className="flex items-center space-x-2">
                            {isRank1 && <span title="Juara 1">🥇</span>}
                            {isRank2 && <span title="Juara 2">🥈</span>}
                            {isRank3 && <span title="Juara 3">🥉</span>}
                            <div>
                              <div className="font-bold text-gray-900 leading-tight">{st.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono">NIS: {st.nis}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-1.5 text-center text-gray-600 font-medium border-r border-gray-200">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            st.jk === "L" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"
                          }`}>
                            {st.jk}
                          </span>
                        </td>

                        {/* Nilai Tiap Mapel */}
                        {gradeReport?.subjects.map((sub) => {
                          const g = st.subjectGrades[sub.code];
                          const score = g ? g.nilaiAkhir : 0;
                          const isBelow = score < sub.kktp;
                          return (
                            <td 
                              key={sub.code} 
                              className={`p-1.5 text-center font-mono text-xs border-r border-gray-200 ${
                                isBelow 
                                  ? "bg-rose-50 text-rose-700 font-bold" 
                                  : "text-gray-800"
                              }`}
                              title={`${sub.code}: ${score} (F1:${g?.formatif1 || 0}, F2:${g?.formatif2 || 0}, STS:${g?.sts || 0}, SAS:${g?.sas || 0})`}
                            >
                              {score}
                            </td>
                          );
                        })}

                        {/* Total & Rata */}
                        <td className="p-2 text-center font-bold text-blue-950 border-r border-gray-200 font-mono">
                          {st.totalNilai}
                        </td>
                        <td className="p-2 text-center font-bold text-gray-900 border-r border-gray-200 font-mono">
                          {st.rataRataNilai}
                        </td>

                        {/* Ranking */}
                        <td className="p-2 text-center border-r border-gray-200">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                            isRank1 ? "bg-amber-100 text-amber-900 border border-amber-300" :
                            isRank2 ? "bg-slate-200 text-slate-800" :
                            isRank3 ? "bg-amber-50 text-amber-800" : "text-gray-600"
                          }`}>
                            {st.ranking}
                          </span>
                        </td>

                        {/* Presensi */}
                        <td className="p-1 text-center text-blue-700 font-medium border-r border-gray-200 font-mono">
                          {st.presensi.sakit || "-"}
                        </td>
                        <td className="p-1 text-center text-amber-700 font-medium border-r border-gray-200 font-mono">
                          {st.presensi.izin || "-"}
                        </td>
                        <td className="p-1 text-center text-rose-700 font-bold border-r border-gray-200 font-mono">
                          {st.presensi.alpa || "-"}
                        </td>

                        {/* Status */}
                        <td className="p-2 text-center border-r border-gray-200">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            st.statusKelulusan === "Tuntas" 
                              ? "bg-emerald-100 text-emerald-800" 
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {st.statusKelulusan}
                          </span>
                        </td>

                        {/* Aksi Detail Rapor */}
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForDetail(st)}
                            className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                            title="Lihat Detail Rapor Siswa"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* BARIS RATA-RATA KELAS */}
                {gradeReport && filteredStudents.length > 0 && (
                  <tr className="bg-blue-50/70 font-bold border-t-2 border-blue-200 text-center text-gray-900">
                    <td className="p-2 text-center border-r border-gray-200" colSpan={3}>
                      RATA-RATA KELAS
                    </td>
                    {gradeReport.subjects.map((sub) => (
                      <td key={sub.code} className="p-1.5 border-r border-gray-200 font-mono text-blue-900">
                        {gradeReport.summary.subjectAverages[sub.code] || "-"}
                      </td>
                    ))}
                    <td className="p-2 border-r border-gray-200 font-mono text-blue-950">
                      {Math.round(gradeReport.summary.rataRataKelas * gradeReport.subjects.length)}
                    </td>
                    <td className="p-2 border-r border-gray-200 font-mono text-blue-950">
                      {gradeReport.summary.rataRataKelas}
                    </td>
                    <td className="p-2 border-r border-gray-200 font-mono" colSpan={5}>
                      {gradeReport.summary.persentaseKetuntasan}% Tuntas
                    </td>
                    <td className="p-2">-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL RAPOR SISWA MODAL */}
      {selectedStudentForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{selectedStudentForDetail.name}</h3>
                <p className="text-xs text-blue-200">
                  NIS: {selectedStudentForDetail.nis} • NISN: {selectedStudentForDetail.nisn} • Ranking: #{selectedStudentForDetail.ranking}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForDetail(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-center">
                  <span className="text-[11px] text-gray-500 block">Total Nilai</span>
                  <span className="text-lg font-black text-blue-950 font-mono">{selectedStudentForDetail.totalNilai}</span>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-center">
                  <span className="text-[11px] text-gray-500 block">Rata-rata Nilai</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">{selectedStudentForDetail.rataRataNilai}</span>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-center">
                  <span className="text-[11px] text-gray-500 block">Status Rapor</span>
                  <span className="text-sm font-bold text-emerald-700 block mt-1">
                    {selectedStudentForDetail.statusKelulusan}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                  Rincian Nilai Mata Pelajaran
                </h4>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-2">Mata Pelajaran</th>
                        <th className="p-2 text-center">Formatif</th>
                        <th className="p-2 text-center">STS</th>
                        <th className="p-2 text-center">SAS</th>
                        <th className="p-2 text-center">Nilai Akhir</th>
                        <th className="p-2 text-center">Predikat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {gradeReport?.subjects.map(sub => {
                        const g = selectedStudentForDetail.subjectGrades[sub.code];
                        return (
                          <tr key={sub.code} className="hover:bg-gray-50">
                            <td className="p-2">
                              <span className="font-semibold text-gray-900">{sub.name}</span>
                              <span className="text-[10px] text-gray-400 block font-mono">KKTP: {sub.kktp}</span>
                            </td>
                            <td className="p-2 text-center font-mono">
                              {g ? Math.round(((g.formatif1 + g.formatif2) / 2) * 10) / 10 : 0}
                            </td>
                            <td className="p-2 text-center font-mono">{g?.sts || 0}</td>
                            <td className="p-2 text-center font-mono">{g?.sas || 0}</td>
                            <td className="p-2 text-center font-bold font-mono text-blue-950">
                              {g?.nilaiAkhir || 0}
                            </td>
                            <td className="p-2 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                {g?.predikat || "B"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedStudentForDetail(null)}
                className="text-xs font-semibold rounded-xl"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INPUT NILAI */}
      {gradeReport && (
        <InputNilaiModal
          isOpen={isInputModalOpen}
          onClose={() => setIsInputModalOpen(false)}
          classReport={gradeReport}
          token={token}
          onSaved={loadGradeReport}
        />
      )}

      {/* MODAL CETAK RESMI */}
      {gradeReport && (
        <PrintPreviewModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          reportType="grade_leger"
          data={gradeReport}
          schoolSettings={schoolSettings}
        />
      )}
    </div>
  );
}
