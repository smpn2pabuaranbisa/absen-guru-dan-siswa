import { useState, useEffect } from "react";
import { useAuth } from "@/store/useAuth";
import { apiGetTeacherHistory } from "@/services/api";
import { Loader2, AlertCircle, Calendar, Clock, Download, FileText, FileSpreadsheet, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type FilterType = "hari_ini" | "minggu_ini" | "bulan_ini";

interface HistoryRecord {
  id: string;
  tanggal: string;
  jam_datang: string;
  jam_pulang: string;
  status: string;
  keterangan: string;
}

export default function MobileRiwayat() {
  const { token, user } = useAuth();
  const [filter, setFilter] = useState<FilterType>("minggu_ini");
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Download Modal State
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadMonth, setDownloadMonth] = useState<number>(new Date().getMonth() + 1);
  const [downloadYear, setDownloadYear] = useState<number>(new Date().getFullYear());
  const [downloadFormat, setDownloadFormat] = useState<"pdf" | "csv">("pdf");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiGetTeacherHistory(token, filter);
        if (res.success && res.data) {
          setHistory(res.data);
        } else {
          setError(res.message);
        }
      } catch (err) {
        setError("Gagal memuat riwayat absensi.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [token, filter]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Hadir":
        return "bg-green-100 text-green-700 border-green-200";
      case "Terlambat":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Sakit":
      case "Izin":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Alpa":
      default:
        return "bg-red-100 text-red-700 border-red-200";
    }
  };

  const handleDownload = async () => {
    if (!token) return;
    setIsDownloading(true);
    
    try {
      // Dalam implementasi nyata, kirim bulan & tahun sebagai parameter
      // const res = await apiGetTeacherHistory(token, `bulan_${downloadYear}_${downloadMonth}`);
      
      // Untuk simulasi, kita gunakan data history yang ada atau panggil API ulang
      const res = await apiGetTeacherHistory(token, "bulan_ini"); 
      const dataToDownload = res.data || [];
      
      const monthName = new Date(downloadYear, downloadMonth - 1).toLocaleString('id-ID', { month: 'long' });
      const fileName = `Absensi_${user?.name?.replace(/\s+/g, '_') || 'Guru'}_${monthName}_${downloadYear}`;

      if (downloadFormat === "csv") {
        // Generate CSV
        let csvContent = "Tanggal,Jam Datang,Jam Pulang,Status,Keterangan\n";
        dataToDownload.forEach(row => {
          csvContent += `"${row.tanggal}","${row.jam_datang}","${row.jam_pulang}","${row.status}","${row.keterangan}"\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${fileName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Generate PDF Directly using jsPDF
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(16);
        doc.text("Laporan Kehadiran Guru", 105, 20, { align: "center" });
        
        doc.setFontSize(11);
        doc.text(`Bulan: ${monthName} ${downloadYear}`, 105, 28, { align: "center" });
        doc.text(`Nama: ${user?.name || 'Guru'}`, 14, 40);
        
        // Table data preparation
        const tableColumn = ["No", "Tanggal", "Jam Datang", "Jam Pulang", "Status", "Keterangan"];
        const tableRows = dataToDownload.map((row, idx) => [
          (idx + 1).toString(),
          formatDate(row.tanggal),
          row.jam_datang,
          row.jam_pulang,
          row.status,
          row.keterangan || "-"
        ]);

        if (tableRows.length === 0) {
          tableRows.push([{ content: 'Tidak ada data absensi untuk bulan ini.', colSpan: 6, styles: { halign: 'center', fontStyle: 'italic' } }]);
        }

        // Draw Table
        autoTable(doc, {
          startY: 45,
          head: [tableColumn],
          body: tableRows,
          theme: "grid",
          headStyles: { fillColor: [243, 244, 246], textColor: 0, fontStyle: 'bold', halign: 'center' },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 40 },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center' }
          }
        });

        // Signatures
        const finalY = (doc as any).lastAutoTable.finalY || 45;
        doc.text("Mengetahui,", 160, finalY + 20);
        doc.setFont("helvetica", "bold");
        doc.text(user?.name || 'Guru', 160, finalY + 45);
        
        doc.save(`${fileName}.pdf`);
      }
      
      setIsDownloadModalOpen(false);
      setIsDownloading(false);
    } catch (err) {
      console.error(err);
      setIsDownloading(false);
      alert("Gagal mengunduh laporan absensi");
    }
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const months = [
    { value: 1, label: "Januari" }, { value: 2, label: "Februari" }, { value: 3, label: "Maret" },
    { value: 4, label: "April" }, { value: 5, label: "Mei" }, { value: 6, label: "Juni" },
    { value: 7, label: "Juli" }, { value: 8, label: "Agustus" }, { value: 9, label: "September" },
    { value: 10, label: "Oktober" }, { value: 11, label: "November" }, { value: 12, label: "Desember" }
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-24">
      <header className="bg-white px-4 py-4 border-b border-gray-200 flex items-center justify-between shadow-sm sticky top-0 z-10 print:hidden">
        <h1 className="text-lg font-bold text-gray-900">Riwayat Absensi</h1>
        <button 
          onClick={() => setIsDownloadModalOpen(true)}
          className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Unduh</span>
        </button>
      </header>

      <main className="flex-1 p-4 space-y-4 print:hidden">
        {/* FILTER */}
        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex space-x-2 overflow-x-auto hide-scrollbar">
          {(["hari_ini", "minggu_ini", "bulan_ini"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
                filter === f 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              )}
            >
              {f === "hari_ini" ? "Hari Ini" : f === "minggu_ini" ? "Minggu Ini" : "Bulan Ini"}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start space-x-3 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm leading-snug">{error}</p>
          </div>
        )}

        {/* LIST */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-500">Memuat riwayat...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Belum ada riwayat</p>
            <p className="text-sm text-gray-400 mt-1">Tidak ada data absensi untuk periode ini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div key={record.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2 text-sm font-medium text-gray-900">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>{formatDate(record.tanggal)}</span>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${getStatusBadge(record.status)}`}>
                    {record.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> Jam Datang
                    </span>
                    <p className="text-sm font-bold text-gray-900">{record.jam_datang}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> Jam Pulang
                    </span>
                    <p className="text-sm font-bold text-gray-900">{record.jam_pulang}</p>
                  </div>
                </div>

                {record.keterangan && record.keterangan !== "-" && (
                  <div className="text-xs text-gray-600 bg-gray-50/50 p-2 rounded-md border border-gray-100">
                    <span className="font-semibold text-gray-700">Keterangan:</span> {record.keterangan}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DOWNLOAD */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <Download className="w-5 h-5 mr-2 text-blue-600" />
                Unduh Absensi
              </h2>
              <button 
                onClick={() => setIsDownloadModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">Bulan</label>
                  <select 
                    value={downloadMonth}
                    onChange={(e) => setDownloadMonth(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">Tahun</label>
                  <select 
                    value={downloadYear}
                    onChange={(e) => setDownloadYear(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-gray-600">Format Laporan</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDownloadFormat("pdf")}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-colors relative",
                      downloadFormat === "pdf" ? "border-blue-600 bg-blue-50/50" : "border-gray-200 hover:border-blue-200"
                    )}
                  >
                    {downloadFormat === "pdf" && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <FileText className={cn("w-8 h-8 mb-2", downloadFormat === "pdf" ? "text-blue-600" : "text-gray-400")} />
                    <span className="text-sm font-semibold text-gray-900">PDF</span>
                  </button>
                  <button
                    onClick={() => setDownloadFormat("csv")}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-colors relative",
                      downloadFormat === "csv" ? "border-green-600 bg-green-50/50" : "border-gray-200 hover:border-green-200"
                    )}
                  >
                    {downloadFormat === "csv" && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <FileSpreadsheet className={cn("w-8 h-8 mb-2", downloadFormat === "csv" ? "text-green-600" : "text-gray-400")} />
                    <span className="text-sm font-semibold text-gray-900">CSV Excel</span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center transition-colors disabled:opacity-70"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Menyiapkan...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Unduh Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

