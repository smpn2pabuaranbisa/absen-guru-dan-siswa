import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/store/useAuth";
import { apiGetReportAdmin, apiGetSettings } from "@/services/api";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  AlertCircle, 
  FileSpreadsheet, 
  FileText, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Printer, 
  Calendar, 
  Download, 
  BookOpen, 
  BarChart3, 
  Award,
  GraduationCap
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

import ClassMatrixReport from "@/components/reports/ClassMatrixReport";
import TeacherMonthlyReport from "@/components/reports/TeacherMonthlyReport";
import PrintPreviewModal from "@/components/reports/PrintPreviewModal";
import { exportGeneralReportToExcel } from "@/utils/excelExport";

const PIE_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];

export default function AdminLaporan() {
  const { token } = useAuth();

  // Tab State: 'class_matrix' | 'general_report' | 'teacher_report'
  const [activeTab, setActiveTab] = useState<"class_matrix" | "general_report" | "teacher_report">("class_matrix");

  // Print Preview Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printReportType, setPrintReportType] = useState<"class_matrix" | "teacher_report" | "general_report">("class_matrix");
  const [printData, setPrintData] = useState<any>(null);

  // General Report State
  const [data, setData] = useState<any>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [filterRole, setFilterRole] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchGeneralReport = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const [res, setRes] = await Promise.all([
        apiGetReportAdmin(token, startDate, endDate, filterRole),
        apiGetSettings(token)
      ]);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message);
      }
      if (setRes.success && setRes.data) {
        setSchoolSettings(setRes.data);
      }
    } catch (err) {
      setError("Gagal memuat data laporan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGeneralReport();
  }, [token]);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGeneralReport();
  };

  const handleQuickPeriod = (days: number | "month") => {
    const end = new Date();
    const start = new Date();
    if (days === "month") {
      start.setDate(1);
    } else {
      start.setDate(end.getDate() - days);
    }
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const handleOpenPrint = (type: "class_matrix" | "teacher_report" | "general_report", reportData: any) => {
    setPrintReportType(type);
    setPrintData(reportData);
    setIsPrintModalOpen(true);
  };

  // EXPORT EXCEL FOR GENERAL REPORT (XLSX)
  const handleExportGeneralExcel = () => {
    if (!data) return;
    exportGeneralReportToExcel(data, startDate, endDate, filterRole, schoolSettings);
    setSuccessMsg("Laporan Presensi Sekolah berhasil diekspor ke Microsoft Excel (.xlsx)");
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const filteredTableData = data?.tableData?.filter((item: any) => 
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.role.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const pieData = data?.summary ? [
    { name: 'Hadir', value: data.summary.hadir },
    { name: 'Terlambat', value: data.summary.terlambat },
    { name: 'Izin', value: data.summary.izin },
    { name: 'Sakit', value: data.summary.sakit },
    { name: 'Alpa', value: data.summary.alpa },
  ] : [];

  const totalPresensi = data?.summary ? 
    (data.summary.hadir + data.summary.terlambat + data.summary.izin + data.summary.sakit + data.summary.alpa) : 0;
  
  const presentRate = totalPresensi > 0 ? 
    Math.round(((data.summary.hadir + data.summary.terlambat) / totalPresensi) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Laporan & Rekapitulasi Presensi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ekspor rekapitulasi buku induk/leger kelas (XLSX & PDF), grafik tren sekolah, dan kedisiplinan guru.
          </p>
        </div>

        {/* TAB TOGGLE BUTTONS */}
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("class_matrix")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "class_matrix"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Leger Bulanan Kelas</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
              activeTab === "class_matrix" ? "bg-blue-700 text-white" : "bg-blue-100 text-blue-700"
            }`}>
              Dinas
            </span>
          </button>

          <button
            onClick={() => setActiveTab("general_report")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "general_report"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Rekap Umum & Grafik</span>
          </button>

          <button
            onClick={() => setActiveTab("teacher_report")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "teacher_report"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Disiplin Guru</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-3 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* TAB 1: LEGER MATRIKS KELAS STANDAR DINAS */}
      {activeTab === "class_matrix" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 leading-tight">
                  Buku Leger Semester (Rekap Rapor Induk)
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Tersedia rekapitulasi kehadiran per semester lengkap dengan predikat dan siap salin ke format e-Rapor / Dapodik.
                </p>
              </div>
            </div>
            <Link
              to="/admin/leger"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs whitespace-nowrap self-start sm:self-auto"
            >
              Buka Buku Leger Semester →
            </Link>
          </div>
          <ClassMatrixReport onOpenPrintModal={handleOpenPrint} />
        </div>
      )}

      {/* TAB 3: REKAP GURU */}
      {activeTab === "teacher_report" && (
        <TeacherMonthlyReport onOpenPrintModal={handleOpenPrint} />
      )}

      {/* TAB 2: REKAPITULASI UMUM & ANALISIS TREN */}
      {activeTab === "general_report" && (
        <div className="space-y-6">
          {/* ACTION BUTTONS & FILTER */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Filter Analisis & Rekap Sekolah</h3>
                <p className="text-xs text-gray-500 mt-0.5">Pilih rentang tanggal dan kategori peran untuk mengekspor data komprehensif.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleExportGeneralExcel}
                  disabled={!data || isLoading}
                  variant="outline" 
                  className="text-gray-700 bg-white shadow-sm border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs h-9"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Export Excel (.XLSX)
                </Button>
                <Button 
                  onClick={() => data && handleOpenPrint("general_report", data)}
                  disabled={!data || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-xs h-9"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak / PDF Resmi
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pilih Rentang Periode</span>
              <div className="flex items-center space-x-2 text-xs">
                <button 
                  type="button" 
                  onClick={() => handleQuickPeriod("month")}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded transition-colors"
                >
                  Bulan Ini
                </button>
                <button 
                  type="button" 
                  onClick={() => handleQuickPeriod(30)}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded transition-colors"
                >
                  30 Hari Terakhir
                </button>
                <button 
                  type="button" 
                  onClick={() => handleQuickPeriod(7)}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded transition-colors"
                >
                  7 Hari Terakhir
                </button>
              </div>
            </div>

            <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-medium text-gray-700 mb-1">Periode Awal</label>
                <input 
                  type="date" 
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs bg-white"
                />
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-medium text-gray-700 mb-1">Periode Akhir</label>
                <input 
                  type="date" 
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs bg-white"
                />
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-medium text-gray-700 mb-1">Kategori Peran</label>
                <select 
                  value={filterRole}
                  onChange={e => setFilterRole(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs bg-white"
                >
                  <option value="all">Semua (Guru & Siswa)</option>
                  <option value="guru">Hanya Tenaga Guru</option>
                  <option value="siswa">Hanya Peserta Didik (Siswa)</option>
                </select>
              </div>
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto min-w-[130px] text-xs h-9">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Muat Laporan"}
              </Button>
            </form>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center space-x-3 shadow-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {data && !isLoading && (
            <>
              {/* KPI METRIC SUMMARY CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total Hadir</p>
                    <p className="text-xl font-bold text-gray-900">{data.summary.hadir}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Terlambat</p>
                    <p className="text-xl font-bold text-gray-900">{data.summary.terlambat}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Izin & Sakit</p>
                    <p className="text-xl font-bold text-gray-900">{data.summary.izin + data.summary.sakit}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-red-50 text-red-600">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total Alpa</p>
                    <p className="text-xl font-bold text-gray-900">{data.summary.alpa}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3 col-span-2 md:col-span-1">
                  <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Tingkat Kehadiran</p>
                    <p className="text-xl font-bold text-emerald-600">{presentRate}%</p>
                  </div>
                </div>
              </div>

              {/* VISUAL CHARTS SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2 text-blue-600" />
                    Tren Kehadiran Mingguan (Jumlah Orang)
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                        <RechartsTooltip />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Hadir" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Terlambat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="TidakHadir" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 w-full text-left">
                    Distribusi Status Presensi
                  </h3>
                  <div className="h-48 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs w-full pt-2 border-t border-gray-100">
                    {pieData.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx] }}></span>
                          <span className="text-gray-600">{item.name}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* TABLE REKAPITULASI */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Rincian Data Presensi Individu</h3>
                    <p className="text-xs text-gray-500">Daftar akumulasi kehadiran guru dan siswa pada rentang periode terpilih.</p>
                  </div>
                  <div className="relative max-w-xs w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Cari nama atau peran..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                        <th className="px-4 py-3 text-center w-12">No</th>
                        <th className="px-4 py-3">Nama Lengkap</th>
                        <th className="px-4 py-3 text-center">Peran</th>
                        <th className="px-4 py-3 text-center">Hadir</th>
                        <th className="px-4 py-3 text-center">Terlambat</th>
                        <th className="px-4 py-3 text-center">Izin/Sakit</th>
                        <th className="px-4 py-3 text-center">Alpa</th>
                        <th className="px-4 py-3 text-center">Persentase</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTableData.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-gray-500 text-xs">
                            Tidak ada data presensi yang sesuai.
                          </td>
                        </tr>
                      ) : (
                        filteredTableData.map((row: any, idx: number) => (
                          <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-4 py-3 text-center text-gray-500">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{row.nama}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                row.role.toLowerCase() === 'guru' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {row.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-emerald-600">{row.total_hadir}</td>
                            <td className="px-4 py-3 text-center text-amber-600">{row.total_terlambat}</td>
                            <td className="px-4 py-3 text-center text-blue-600">{row.total_izin}</td>
                            <td className="px-4 py-3 text-center font-bold text-rose-600">{row.total_alpa}</td>
                            <td className="px-4 py-3 text-center font-bold">{row.persentase}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL PRINT / PDF PREVIEW */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reportType={printReportType}
        data={printData}
        schoolSettings={schoolSettings}
      />
    </div>
  );
}
