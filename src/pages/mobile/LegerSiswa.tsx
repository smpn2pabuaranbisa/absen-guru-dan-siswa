import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/useAuth";
import { 
  apiGetClasses, 
  apiGetSemesterClassReport, 
  apiGetMonthlyClassReport,
  apiGetClassGradeLeger,
  SemesterClassAttendanceReport,
  MonthlyClassAttendanceReport,
  ClassGradeLegerReport,
  StudentGradeRow,
  apiGetSettings 
} from "@/services/api";
import { 
  exportSemesterClassReportToExcel, 
  exportClassMonthlyReportToExcel,
  exportClassGradeLegerToExcel 
} from "@/utils/excelExport";
import PrintPreviewModal from "@/components/reports/PrintPreviewModal";
import InputNilaiModal from "@/components/reports/InputNilaiModal";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
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
  ChevronDown,
  FileSpreadsheet,
  GraduationCap,
  Calculator,
  Eye,
  X,
  TrendingUp
} from "lucide-react";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function MobileLegerSiswa() {
  const navigate = useNavigate();
  const { token } = useAuth();

  // Mode: "nilai" | "semester" | "bulanan"
  const [activeMode, setActiveMode] = useState<"nilai" | "semester" | "bulanan">("nilai");

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<"ganjil" | "genap">("ganjil");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(2026);
  const [searchQuery, setSearchQuery] = useState("");

  const [gradeReport, setGradeReport] = useState<ClassGradeLegerReport | null>(null);
  const [semesterReport, setSemesterReport] = useState<SemesterClassAttendanceReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyClassAttendanceReport | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<StudentGradeRow | null>(null);

  // Load Classes & Settings
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
          } else {
            setSelectedClassId("");
          }
        }
        if (setRes.success && setRes.data) {
          setSchoolSettings(setRes.data);
        }
      } catch (err) {
        console.error("Gagal inisialisasi", err);
      }
    };
    init();
  }, [token]);

  // Load Report Data
  const fetchReport = async () => {
    if (!token) return;
    if (!selectedClassId && classes.length === 0) {
      setGradeReport(null);
      setSemesterReport(null);
      setMonthlyReport(null);
      return;
    }
    setIsLoading(true);
    try {
      if (activeMode === "nilai") {
        const res = await apiGetClassGradeLeger(token, selectedClassId, selectedSemester, selectedYear);
        if (res.success && res.data) {
          setGradeReport(res.data);
        }
      } else if (activeMode === "semester") {
        const res = await apiGetSemesterClassReport(token, selectedClassId, selectedSemester, selectedYear);
        if (res.success && res.data) {
          setSemesterReport(res.data);
        }
      } else {
        const res = await apiGetMonthlyClassReport(token, selectedClassId, selectedMonth, selectedYear);
        if (res.success && res.data) {
          setMonthlyReport(res.data);
        }
      }
    } catch (err) {
      console.error("Gagal memuat rekap leger", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [token, selectedClassId, selectedSemester, selectedMonth, selectedYear, activeMode]);

  // Handle Export Excel
  const handleExportExcel = () => {
    if (activeMode === "nilai" && gradeReport) {
      exportClassGradeLegerToExcel(gradeReport, schoolSettings);
      setSuccessToast("Buku Leger Nilai berhasil diunduh (.xlsx)");
    } else if (activeMode === "semester" && semesterReport) {
      exportSemesterClassReportToExcel(semesterReport, schoolSettings);
      setSuccessToast("Leger Presensi Semester berhasil diunduh (.xlsx)");
    } else if (activeMode === "bulanan" && monthlyReport) {
      exportClassMonthlyReportToExcel(monthlyReport, schoolSettings);
      setSuccessToast("Leger Bulanan berhasil diunduh (.xlsx)");
    }
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Filter siswa
  const filteredGradeStudents = gradeReport?.students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nis.includes(searchQuery)
  ) || [];

  const filteredSemesterStudents = semesterReport?.students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nis.includes(searchQuery)
  ) || [];

  const filteredMonthlyStudents = monthlyReport?.students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nis.includes(searchQuery)
  ) || [];

  return (
    <div className="space-y-4 pb-24">
      {/* APP BAR HEADER */}
      <div className="bg-white px-4 py-3.5 border-b border-gray-200 flex items-center justify-between -mx-4 -mt-4 mb-4 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center space-x-2.5">
          <button 
            type="button"
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 text-base leading-tight">
              {activeMode === "nilai" ? "Leger Nilai Siswa" : "Leger Presensi Siswa"}
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">
              {activeMode === "nilai" ? "Buku Induk Nilai & Ranking Rapor" : "Buku Induk & Rekap Absensi"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {activeMode === "nilai" && (
            <button
              type="button"
              onClick={() => setIsInputModalOpen(true)}
              className="p-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl flex items-center space-x-1 text-xs font-bold active:scale-95 transition border border-indigo-200"
              title="Input Nilai Mapel"
            >
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Input Nilai</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isLoading}
            className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl flex items-center space-x-1 text-xs font-semibold active:scale-95 transition border border-emerald-200"
            title="Unduh Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            disabled={isLoading}
            className="p-2 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-xl flex items-center space-x-1 text-xs font-semibold active:scale-95 transition border border-gray-200"
            title="Cetak Dokumen Resmi"
          >
            <Printer className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {successToast && (
        <div className="bg-emerald-600 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-md flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* MODE TABS (NILAI vs SEMESTER vs BULANAN) */}
      <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
        <button
          type="button"
          onClick={() => setActiveMode("nilai")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeMode === "nilai" 
              ? "bg-white text-amber-900 shadow-xs border border-amber-200" 
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Award className="w-3.5 h-3.5 text-amber-600" />
          <span>Leger Nilai</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode("semester")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeMode === "semester" 
              ? "bg-white text-blue-700 shadow-xs" 
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
          <span>Presensi Semester</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode("bulanan")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeMode === "bulanan" 
              ? "bg-white text-blue-700 shadow-xs" 
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Bulanan</span>
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {/* Pilih Kelas */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Rombel / Kelas
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-gray-800 focus:ring-2 focus:ring-blue-600"
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

          {/* Pilih Semester / Bulan */}
          {activeMode === "bulanan" ? (
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Bulan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-gray-800 focus:ring-2 focus:ring-blue-600"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value as any)}
                className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-gray-800 focus:ring-2 focus:ring-blue-600"
              >
                <option value="ganjil">Semester Ganjil</option>
                <option value="genap">Semester Genap</option>
              </select>
            </div>
          )}
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari siswa berdasarkan nama/NIS..."
            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      {activeMode === "nilai" && gradeReport && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-amber-800 font-semibold block">Rata-rata Kelas</span>
            <span className="text-base font-black text-amber-950 font-mono mt-0.5 block">
              {gradeReport.summary.rataRataKelas}
            </span>
          </div>

          <div className="bg-blue-50/70 border border-blue-200/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-blue-800 font-semibold block">Juara 1 (Tertinggi)</span>
            <span className="text-base font-black text-blue-950 font-mono mt-0.5 block">
              {gradeReport.summary.nilaiTertinggi}
            </span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-emerald-800 font-semibold block">Ketuntasan</span>
            <span className="text-base font-black text-emerald-950 font-mono mt-0.5 block">
              {gradeReport.summary.persentaseKetuntasan}%
            </span>
          </div>
        </div>
      )}

      {activeMode === "semester" && semesterReport && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50/70 border border-blue-200/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-blue-800 font-semibold block">Kehadiran</span>
            <span className="text-base font-black text-blue-950 font-mono mt-0.5 block">
              {semesterReport.summary.rataRataKehadiran}%
            </span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-amber-800 font-semibold block">Total Izin/Sakit</span>
            <span className="text-base font-black text-amber-950 font-mono mt-0.5 block">
              {semesterReport.summary.totalSakit + semesterReport.summary.totalIzin} hr
            </span>
          </div>

          <div className="bg-rose-50/70 border border-rose-200/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-rose-800 font-semibold block">Total Alpa</span>
            <span className="text-base font-black text-rose-950 font-mono mt-0.5 block">
              {semesterReport.summary.totalAlpa} hr
            </span>
          </div>
        </div>
      )}

      {/* STUDENT LIST CARDS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-gray-800">
            {activeMode === "nilai" 
              ? `Daftar Nilai & Peringkat (${filteredGradeStudents.length} Siswa)`
              : activeMode === "semester"
              ? `Daftar Rekap Semester (${filteredSemesterStudents.length} Siswa)`
              : `Daftar Rekap Bulanan (${filteredMonthlyStudents.length} Siswa)`}
          </span>
          <span className="text-[11px] text-gray-400">
            Kelas {classes.find(c => c.id === selectedClassId)?.name || selectedClassId}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-2 bg-white rounded-2xl border border-gray-200">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-xs font-medium">Memuat data...</p>
          </div>
        ) : activeMode === "nilai" ? (
          filteredGradeStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs bg-white rounded-2xl border border-gray-200">
              Tidak ada siswa ditemukan
            </div>
          ) : (
            filteredGradeStudents.map((st) => {
              const isRank1 = st.ranking === 1;
              const isRank2 = st.ranking === 2;
              const isRank3 = st.ranking === 3;

              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedStudentForDetail(st)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs active:scale-[0.99] space-y-2.5 ${
                    isRank1 ? "bg-amber-50/50 border-amber-200" :
                    isRank2 ? "bg-slate-50/70 border-slate-200" :
                    isRank3 ? "bg-amber-50/30 border-amber-100" :
                    "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isRank1 ? "bg-amber-100 text-amber-900 border border-amber-300" :
                        isRank2 ? "bg-slate-200 text-slate-800" :
                        isRank3 ? "bg-amber-100 text-amber-800" :
                        "bg-blue-50 text-blue-700"
                      }`}>
                        {isRank1 ? "🥇 1" : isRank2 ? "🥈 2" : isRank3 ? "🥉 3" : `#${st.ranking}`}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-xs leading-tight">{st.name}</h4>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">NIS: {st.nis} • {st.jk}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-blue-950 font-mono block">
                        Rata: {st.rataRataNilai}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        st.statusKelulusan === "Tuntas" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {st.statusKelulusan}
                      </span>
                    </div>
                  </div>

                  {/* KOTAK NILAI & PRESENSI */}
                  <div className="grid grid-cols-4 gap-1.5 bg-gray-50/80 p-2 rounded-xl text-center text-[10px]">
                    <div>
                      <span className="text-gray-400 block">Total Nilai</span>
                      <span className="font-black text-gray-900">{st.totalNilai}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Sakit (S)</span>
                      <span className="font-bold text-blue-700">{st.presensi.sakit} hr</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Izin (I)</span>
                      <span className="font-bold text-amber-700">{st.presensi.izin} hr</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Alpa (A)</span>
                      <span className="font-bold text-rose-700">{st.presensi.alpa} hr</span>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : activeMode === "semester" ? (
          filteredSemesterStudents.map((student, idx) => (
            <div 
              key={student.id} 
              className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs leading-tight">{student.name}</h4>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">NIS: {student.nis} • {student.jk}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                    student.persentase >= 90 ? "bg-emerald-50 text-emerald-700" :
                    student.persentase >= 80 ? "bg-blue-50 text-blue-700" :
                    "bg-rose-50 text-rose-700"
                  }`}>
                    {student.persentase}% • {student.predikat}
                  </span>
                </div>
              </div>

              {/* STATS KOTAK S / I / A / H */}
              <div className="grid grid-cols-4 gap-1.5 bg-gray-50 p-2 rounded-xl text-center text-[10px]">
                <div>
                  <span className="text-gray-400 block">Hadir</span>
                  <span className="font-bold text-emerald-700">{student.totalHadir} hr</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Sakit (S)</span>
                  <span className="font-bold text-blue-700">{student.totalSakit} hr</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Izin (I)</span>
                  <span className="font-bold text-amber-700">{student.totalIzin} hr</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Alpa (A)</span>
                  <span className="font-bold text-rose-700">{student.totalAlpa} hr</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          filteredMonthlyStudents.map((student, idx) => (
            <div 
              key={student.id} 
              className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs leading-tight">{student.name}</h4>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">NIS: {student.nis}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                  {student.persentase}% Hadir
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 bg-gray-50 p-2 rounded-xl text-center text-[10px]">
                <div>
                  <span className="text-gray-400 block">Hadir</span>
                  <span className="font-bold text-emerald-700">{student.totalHadir} hr</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Sakit (S)</span>
                  <span className="font-bold text-blue-700">{student.totalSakit} hr</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Izin (I)</span>
                  <span className="font-bold text-amber-700">{student.totalIzin} hr</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Alpa (A)</span>
                  <span className="font-bold text-rose-700">{student.totalAlpa} hr</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DETAIL NILAI SISWA (MOBILE) */}
      {selectedStudentForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[85vh]">
            <div className="px-4 py-3.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{selectedStudentForDetail.name}</h3>
                <p className="text-[11px] text-blue-200">
                  NIS: {selectedStudentForDetail.nis} • Peringkat #{selectedStudentForDetail.ranking}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForDetail(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-gray-50 p-2 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-500 block">Total</span>
                  <span className="font-black text-gray-900 font-mono">{selectedStudentForDetail.totalNilai}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-500 block">Rata-rata</span>
                  <span className="font-black text-emerald-700 font-mono">{selectedStudentForDetail.rataRataNilai}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-500 block">Status</span>
                  <span className="font-bold text-emerald-700 block">{selectedStudentForDetail.statusKelulusan}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nilai Mata Pelajaran
                </h4>
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {gradeReport?.subjects.map(sub => {
                    const g = selectedStudentForDetail.subjectGrades[sub.code];
                    return (
                      <div key={sub.code} className="p-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-gray-900">{sub.name}</span>
                          <span className="text-[10px] text-gray-400 block font-mono">
                            F: {g ? Math.round(((g.formatif1 + g.formatif2) / 2) * 10) / 10 : 0} • STS: {g?.sts || 0} • SAS: {g?.sas || 0}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black font-mono text-blue-950 text-sm">
                            {g?.nilaiAkhir || 0}
                          </span>
                          <span className="text-[10px] font-bold text-blue-600 block">
                            Predikat {g?.predikat || "B"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudentForDetail(null)}
                className="text-xs font-semibold rounded-xl"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INPUT NILAI (MOBILE) */}
      {gradeReport && token && (
        <InputNilaiModal
          isOpen={isInputModalOpen}
          onClose={() => setIsInputModalOpen(false)}
          classReport={gradeReport}
          token={token}
          onSaved={fetchReport}
        />
      )}

      {/* MODAL PRINT PREVIEW */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reportType={
          activeMode === "nilai" 
            ? "grade_leger" 
            : activeMode === "semester" 
            ? "semester_leger" 
            : "class_matrix"
        }
        data={
          activeMode === "nilai" 
            ? gradeReport 
            : activeMode === "semester" 
            ? semesterReport 
            : monthlyReport
        }
        schoolSettings={schoolSettings}
      />
    </div>
  );
}
