import React, { useState, useEffect } from "react";
import { useAuth } from "@/store/useAuth";
import { 
  apiGetMonthlyTeacherReport, 
  apiGetSettings,
  TeacherMonthlyAttendanceRow 
} from "@/services/api";
import { exportTeacherReportToExcel } from "@/utils/excelExport";
import { Button } from "@/components/ui/button";
import { 
  FileSpreadsheet, 
  Printer, 
  RefreshCw, 
  Award, 
  UserCheck, 
  Clock, 
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

interface TeacherMonthlyReportProps {
  onOpenPrintModal: (type: "teacher_report", data: any) => void;
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function TeacherMonthlyReport({ onOpenPrintModal }: TeacherMonthlyReportProps) {
  const { token } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(8); // Sept
  const [selectedYear, setSelectedYear] = useState(2026);
  const [data, setData] = useState<any>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const fetchTeacherReport = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [repRes, setRes] = await Promise.all([
        apiGetMonthlyTeacherReport(token, selectedMonth, selectedYear),
        apiGetSettings(token)
      ]);
      if (repRes.success && repRes.data) {
        setData(repRes.data);
      }
      if (setRes.success && setRes.data) {
        setSchoolSettings(setRes.data);
      }
    } catch (err) {
      console.error("Gagal mengambil rekap guru", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherReport();
  }, [selectedMonth, selectedYear, token]);

  const handleExportExcel = () => {
    if (!data) return;
    exportTeacherReportToExcel(data, schoolSettings);
    setNotification(`Rekap Presensi Guru ${data.bulanNama} ${data.tahun} berhasil diunduh format Excel (.xlsx)`);
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredTeachers = data?.teachers?.filter((t: TeacherMonthlyAttendanceRow) => 
    t.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.nip.includes(searchTerm) ||
    t.mapel.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* FILTER & CONTROL PANEL */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              Rekapitulasi Kehadiran & Kedisiplinan Guru / Tenaga Kependidikan
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Laporan evaluasi jam mengajar, kedisiplinan waktu datang/pulang, dinas luar, serta izin/cuti bulanan.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={fetchTeacherReport}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="text-gray-700 bg-white border-gray-200 hover:bg-gray-50 text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              onClick={handleExportExcel}
              disabled={!data || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs h-9 font-medium"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Unduh Excel (.XLSX)
            </Button>
            <Button
              onClick={() => data && onOpenPrintModal("teacher_report", data)}
              disabled={!data || isLoading}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Cari Guru / NIP</label>
            <input
              type="text"
              placeholder="Ketik nama, NIP, atau mapel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* KPI METRICS */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-xs text-gray-500 font-medium">Total Tenaga Pendidik</span>
            <div className="text-2xl font-black text-gray-900 mt-1">{data.totalGuru} Guru</div>
            <span className="text-[11px] text-gray-500 mt-0.5 block">Periode {data.bulanNama} {data.tahun}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-xs text-gray-500 font-medium">Jumlah Hari Kerja</span>
            <div className="text-2xl font-black text-blue-600 mt-1">{data.hariKerja} Hari</div>
            <span className="text-[11px] text-gray-500 mt-0.5 block">Hari dinas efektif</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-xs text-gray-500 font-medium">Rata-rata Kehadiran</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{data.rataRataKehadiran}%</div>
            <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">Indeks Kedisiplinan Tinggi</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-xs text-gray-500 font-medium">Status Pengarsipan</span>
            <div className="text-sm font-bold text-gray-900 mt-2 flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Siap Cetak SKP
            </div>
            <span className="text-[11px] text-gray-500 mt-0.5 block">Format resmi dinas</span>
          </div>
        </div>
      )}

      {/* TEACHER TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">
            Daftar Kehadiran Guru & Karyawan — {data?.bulanNama} {data?.tahun}
          </h3>
          <span className="text-xs text-gray-500">Menampilkan {filteredTeachers.length} Guru</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="px-3 py-2.5 text-center w-10">No</th>
                <th className="px-4 py-2.5 text-left">Nama Lengkap & NIP</th>
                <th className="px-3 py-2.5 text-left">Mata Pelajaran</th>
                <th className="px-3 py-2.5 text-center">Hari Kerja</th>
                <th className="px-3 py-2.5 text-center bg-emerald-50 text-emerald-800">Hadir</th>
                <th className="px-3 py-2.5 text-center bg-amber-50 text-amber-800">Terlambat</th>
                <th className="px-3 py-2.5 text-center bg-purple-50 text-purple-800">Izin/Cuti</th>
                <th className="px-3 py-2.5 text-center bg-blue-50 text-blue-800">Sakit</th>
                <th className="px-3 py-2.5 text-center bg-rose-50 text-rose-800">Alpa</th>
                <th className="px-3 py-2.5 text-center">% Kehadiran</th>
                <th className="px-3 py-2.5 text-center">Evaluasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTeachers.map((teacher: TeacherMonthlyAttendanceRow, idx: number) => (
                <tr key={teacher.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-3 py-3 text-center text-gray-500 font-medium">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{teacher.nama}</div>
                    <div className="text-[11px] text-gray-500 font-mono mt-0.5">NIP: {teacher.nip}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-700 font-medium">{teacher.mapel}</td>
                  <td className="px-3 py-3 text-center text-gray-600">{teacher.hariKerja}</td>
                  <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50/30">{teacher.hadir}</td>
                  <td className="px-3 py-3 text-center font-semibold text-amber-700 bg-amber-50/30">{teacher.terlambat}</td>
                  <td className="px-3 py-3 text-center font-medium text-purple-700 bg-purple-50/30">{teacher.izin + teacher.cuti}</td>
                  <td className="px-3 py-3 text-center font-medium text-blue-700 bg-blue-50/30">{teacher.sakit}</td>
                  <td className="px-3 py-3 text-center font-bold text-rose-700 bg-rose-50/30">{teacher.alpa}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                      teacher.persentase >= 95 ? 'bg-emerald-100 text-emerald-800' :
                      teacher.persentase >= 85 ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {teacher.persentase}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-[11px] text-gray-700 font-medium bg-gray-100 px-2 py-0.5 rounded">
                      {teacher.keterangan}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
