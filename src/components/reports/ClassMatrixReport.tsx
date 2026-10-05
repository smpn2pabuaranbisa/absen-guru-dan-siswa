import React, { useState, useEffect } from "react";
import { useAuth } from "@/store/useAuth";
import { 
  apiGetClasses, 
  apiGetMonthlyClassReport, 
  MonthlyClassAttendanceReport,
  apiGetSettings
} from "@/services/api";
import { exportClassMonthlyReportToExcel } from "@/utils/excelExport";
import { Button } from "@/components/ui/button";
import { 
  FileSpreadsheet, 
  Printer, 
  RefreshCw, 
  Users, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  XCircle, 
  UserCheck, 
  Info,
  ChevronRight,
  BookOpen
} from "lucide-react";

interface ClassMatrixReportProps {
  onOpenPrintModal: (type: "class_matrix", data: MonthlyClassAttendanceReport) => void;
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function ClassMatrixReport({ onOpenPrintModal }: ClassMatrixReportProps) {
  const { token } = useAuth();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(8); // 8 = September (0-indexed)
  const [selectedYear, setSelectedYear] = useState(2026);
  
  const [report, setReport] = useState<MonthlyClassAttendanceReport | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchStudent, setSearchStudent] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const initClasses = async () => {
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
        console.error("Gagal inisialisasi kelas", err);
      }
    };
    initClasses();
  }, [token]);

  const fetchReport = async () => {
    if (!token) return;
    if (!selectedClassId && classes.length === 0) {
      setReport(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiGetMonthlyClassReport(token, selectedClassId, selectedMonth, selectedYear);
      if (res.success && res.data) {
        setReport(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat rekap bulanan", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchReport();
    }
  }, [selectedClassId, selectedMonth, selectedYear]);

  const handleExportExcel = () => {
    if (!report) return;
    exportClassMonthlyReportToExcel(report, schoolSettings);
    setNotification(`Rekap Presensi ${report.className} bulan ${report.bulanNama} berhasil diunduh dalam format Excel (.xlsx)`);
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredStudents = report?.students.filter(s => 
    s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.nis.includes(searchStudent) ||
    s.nisn.includes(searchStudent)
  ) || [];

  return (
    <div className="space-y-6">
      {/* FILTER & CONTROL PANEL */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Leger Matriks Rekapitulasi Presensi Bulanan (Tanggal 1–31)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Format standar ledger presensi kelas untuk arsip buku induk, wali kelas, guru BK, dan laporan Dinas Pendidikan.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={fetchReport}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="text-gray-700 bg-white border-gray-200 hover:bg-gray-50 text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              onClick={handleExportExcel}
              disabled={!report || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs h-9 font-medium"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Unduh Excel (.XLSX)
            </Button>
            <Button
              onClick={() => report && onOpenPrintModal("class_matrix", report)}
              disabled={!report || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-xs h-9 font-medium"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak / PDF Resmi
            </Button>
          </div>
        </div>

        {notification && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-lg text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Kelas</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {classes.length === 0 ? (
                <option value="">(Belum ada rombel/kelas)</option>
              ) : (
                classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Bulan Presensi</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {MONTHS.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tahun Pelajaran</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value={2026}>2026 (TA 2026/2027)</option>
              <option value={2025}>2025 (TA 2025/2026)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Cari Nama Siswa / NIS</label>
            <input
              type="text"
              placeholder="Ketik nama atau NIS..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* METADATA & KPI CARDS */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-gray-500 block">Total Siswa</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-extrabold text-gray-900">{report.summary.totalSiswa}</span>
              <span className="text-[10px] text-gray-500">({report.summary.totalLaki}L / {report.summary.totalPerempuan}P)</span>
            </div>
            <span className="text-[10px] text-blue-600 font-medium mt-1 block">Wali: {report.waliKelas}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-gray-500 block">Hari Efektif</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-extrabold text-gray-900">{report.hariEfektif}</span>
              <span className="text-[10px] text-gray-500">Hari Belajar</span>
            </div>
            <span className="text-[10px] text-gray-500 mt-1 block">{report.semester}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-gray-500 block">Rerata Kehadiran</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-xl font-extrabold ${report.summary.rataRataKehadiran >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {report.summary.rataRataKehadiran}%
              </span>
            </div>
            <span className="text-[10px] text-gray-500 mt-1 block">Tingkat Disiplin</span>
          </div>

          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-800 block">Total Hadir (H)</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-extrabold text-emerald-700">{report.summary.totalHadir}</span>
              <span className="text-[10px] text-emerald-600">Presensi</span>
            </div>
            <span className="text-[10px] text-emerald-700 mt-1 block">Tepat waktu</span>
          </div>

          <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-800 block">Terlambat (T)</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-extrabold text-amber-700">{report.summary.totalTerlambat}</span>
              <span className="text-[10px] text-amber-600">Kali</span>
            </div>
            <span className="text-[10px] text-amber-700 mt-1 block">Toleransi sekolah</span>
          </div>

          <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-rose-800 block">Alpa / Bolos (A)</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-extrabold text-rose-700">{report.summary.totalAlpa}</span>
              <span className="text-[10px] text-rose-600">Kali</span>
            </div>
            <span className="text-[10px] text-rose-700 mt-1 block">Tanpa keterangan</span>
          </div>
        </div>
      )}

      {/* MATRIX TABLE CONTAINER */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Matriks Presensi Harian Siswa — {report?.className || "Kelas"} ({report?.bulanNama} {report?.tahun})
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Geser tabel ke kanan untuk melihat rincian tanggal 1 sampai {report?.daysInMonth || 31}
            </p>
          </div>

          {/* KODE LEGEND */}
          <div className="flex items-center gap-2 flex-wrap text-[10px]">
            <span className="flex items-center gap-1 font-medium text-gray-700">
              <span className="w-3.5 h-3.5 rounded bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[9px]">H</span> Hadir
            </span>
            <span className="flex items-center gap-1 font-medium text-gray-700">
              <span className="w-3.5 h-3.5 rounded bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-[9px]">T</span> Terlambat
            </span>
            <span className="flex items-center gap-1 font-medium text-gray-700">
              <span className="w-3.5 h-3.5 rounded bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px]">S</span> Sakit
            </span>
            <span className="flex items-center gap-1 font-medium text-gray-700">
              <span className="w-3.5 h-3.5 rounded bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[9px]">I</span> Izin
            </span>
            <span className="flex items-center gap-1 font-medium text-gray-700">
              <span className="w-3.5 h-3.5 rounded bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-[9px]">A</span> Alpa
            </span>
            <span className="flex items-center gap-1 font-medium text-gray-700">
              <span className="w-3.5 h-3.5 rounded bg-gray-100 text-gray-400 font-bold flex items-center justify-center text-[9px]">-</span> Libur
            </span>
          </div>
        </div>

        {/* OVERFLOW TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="px-2.5 py-2 text-center w-8 sticky left-0 bg-gray-50 z-10 border-r border-gray-200">No</th>
                <th className="px-2.5 py-2 text-left w-20 sticky left-8 bg-gray-50 z-10 border-r border-gray-200">NIS</th>
                <th className="px-3 py-2 text-left min-w-[140px] sticky left-28 bg-gray-50 z-10 border-r border-gray-200">Nama Siswa</th>
                <th className="px-1.5 py-2 text-center w-8 border-r border-gray-200">JK</th>

                {/* Tanggal 1 s/d N */}
                {report && Array.from({ length: report.daysInMonth }, (_, i) => i + 1).map((d) => (
                  <th key={d} className="px-1 py-1.5 text-center w-7 text-[10px] font-medium border-r border-gray-100">
                    {d}
                  </th>
                ))}

                {/* Kolom Rekap */}
                <th className="px-2 py-2 text-center w-9 bg-emerald-50 text-emerald-800 border-r border-gray-200 font-bold">H</th>
                <th className="px-2 py-2 text-center w-9 bg-amber-50 text-amber-800 border-r border-gray-200 font-bold">T</th>
                <th className="px-2 py-2 text-center w-9 bg-blue-50 text-blue-800 border-r border-gray-200 font-bold">S</th>
                <th className="px-2 py-2 text-center w-9 bg-purple-50 text-purple-800 border-r border-gray-200 font-bold">I</th>
                <th className="px-2 py-2 text-center w-9 bg-rose-50 text-rose-800 border-r border-gray-200 font-bold">A</th>
                <th className="px-2.5 py-2 text-center w-14 bg-gray-100 text-gray-900 font-bold">% Hadir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10 + (report?.daysInMonth || 31)} className="text-center py-10 text-gray-500 text-xs">
                    Tidak ada siswa yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-2.5 py-2 text-center text-gray-500 sticky left-0 bg-white group-hover:bg-blue-50/30 border-r border-gray-100 text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="px-2.5 py-2 font-mono text-gray-600 sticky left-8 bg-white border-r border-gray-100 text-[11px]">
                      {student.nis}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900 sticky left-28 bg-white border-r border-gray-100 truncate max-w-[160px]">
                      {student.name}
                    </td>
                    <td className="px-1.5 py-2 text-center text-gray-500 border-r border-gray-100 text-[11px]">
                      {student.jk}
                    </td>

                    {/* Sel Tanggal 1 s/d N */}
                    {report && Array.from({ length: report.daysInMonth }, (_, i) => i + 1).map((d) => {
                      const st = student.dailyStatus[d] || "-";
                      const isWeekend = st === "L";
                      
                      let cellClass = "text-gray-400 bg-gray-50/60";
                      if (st === "H") cellClass = "bg-emerald-50 text-emerald-700 font-semibold";
                      else if (st === "T") cellClass = "bg-amber-50 text-amber-700 font-bold";
                      else if (st === "S") cellClass = "bg-blue-50 text-blue-700 font-semibold";
                      else if (st === "I") cellClass = "bg-purple-50 text-purple-700 font-semibold";
                      else if (st === "A") cellClass = "bg-rose-100 text-rose-700 font-extrabold";

                      return (
                        <td key={d} className={`px-0.5 py-1.5 text-center text-[10px] border-r border-gray-100 ${cellClass}`}>
                          {isWeekend ? "-" : st}
                        </td>
                      );
                    })}

                    {/* Total Rekap Siswa */}
                    <td className="px-1.5 py-2 text-center font-bold text-emerald-700 bg-emerald-50/40 border-r border-gray-100">
                      {student.totalHadir}
                    </td>
                    <td className="px-1.5 py-2 text-center font-semibold text-amber-700 bg-amber-50/40 border-r border-gray-100">
                      {student.totalTerlambat}
                    </td>
                    <td className="px-1.5 py-2 text-center font-semibold text-blue-700 bg-blue-50/40 border-r border-gray-100">
                      {student.totalSakit}
                    </td>
                    <td className="px-1.5 py-2 text-center font-semibold text-purple-700 bg-purple-50/40 border-r border-gray-100">
                      {student.totalIzin}
                    </td>
                    <td className="px-1.5 py-2 text-center font-bold text-rose-700 bg-rose-50/40 border-r border-gray-100">
                      {student.totalAlpa}
                    </td>
                    <td className="px-2 py-2 text-center font-extrabold bg-gray-50/70">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        student.persentase >= 90 ? 'bg-emerald-100 text-emerald-800' :
                        student.persentase >= 75 ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {student.persentase}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* FOOTER TOTAL HARIAN */}
            {report && (
              <tfoot>
                <tr className="bg-gray-100 font-bold text-gray-800 border-t-2 border-gray-300">
                  <td colSpan={4} className="px-3 py-2.5 text-right sticky left-0 bg-gray-100 z-10 border-r border-gray-200">
                    TOTAL HADIR KELAS HARIAN:
                  </td>
                  {Array.from({ length: report.daysInMonth }, (_, i) => i + 1).map((d) => {
                    let totalDayHadir = 0;
                    report.students.forEach(s => {
                      if (s.dailyStatus[d] === "H" || s.dailyStatus[d] === "T") totalDayHadir++;
                    });
                    const isWeekend = report.students[0]?.dailyStatus[d] === "L";
                    return (
                      <td key={d} className="px-0.5 py-2 text-center text-[10px] border-r border-gray-200 text-gray-700">
                        {isWeekend ? "-" : totalDayHadir}
                      </td>
                    );
                  })}
                  <td className="px-1.5 py-2 text-center text-emerald-800 bg-emerald-100/70 border-r border-gray-200">
                    {report.summary.totalHadir}
                  </td>
                  <td className="px-1.5 py-2 text-center text-amber-800 bg-amber-100/70 border-r border-gray-200">
                    {report.summary.totalTerlambat}
                  </td>
                  <td className="px-1.5 py-2 text-center text-blue-800 bg-blue-100/70 border-r border-gray-200">
                    {report.summary.totalSakit}
                  </td>
                  <td className="px-1.5 py-2 text-center text-purple-800 bg-purple-100/70 border-r border-gray-200">
                    {report.summary.totalIzin}
                  </td>
                  <td className="px-1.5 py-2 text-center text-rose-800 bg-rose-100/70 border-r border-gray-200">
                    {report.summary.totalAlpa}
                  </td>
                  <td className="px-2 py-2 text-center text-blue-900 bg-blue-100/70 font-extrabold">
                    {report.summary.rataRataKehadiran}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* CATATAN DAN KETERANGAN */}
        {report && (
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="flex items-start gap-2 max-w-xl">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-gray-600 leading-relaxed">
                <span className="font-semibold text-gray-800">Catatan Wali Kelas:</span> {report.catatanWaliKelas}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="bg-white text-emerald-700 hover:bg-emerald-50 border-emerald-300 text-xs h-8"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Unduh XLSX
              </Button>
              <Button
                size="sm"
                onClick={() => onOpenPrintModal("class_matrix", report)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> Cetak / PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
