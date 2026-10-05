import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/store/useAuth";
import { apiGetGuruList, apiAddGuru, apiUpdateGuru, apiDeleteGuru } from "@/services/api";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Upload, 
  Download, 
  FileSpreadsheet,
  Info,
  Radio
} from "lucide-react";
import * as XLSX from "xlsx";

export default function AdminGuru() {
  const { token } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // State untuk Mass Upload Excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMass, setIsUploadingMass] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ total: number; success: number; failed: number } | null>(null);

  const fetchGuru = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await apiGetGuruList(token);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Gagal memuat data guru.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuru();
  }, [token]);

  // Download Template Excel Data Guru
  const downloadExcelTemplate = () => {
    const sampleData = [
      {
        nama: "Bambang Sudarmono, S.Pd.",
        nip: "198205122008011015",
        nuptk: "4538760662200023",
        rfid_uid: "1098234501",
        email: "bambang.sudarmono@sekolah.sch.id",
        no_hp: "081234567891",
        jabatan: "Guru Tetap",
        mata_pelajaran: "Matematika",
        status: "Aktif"
      },
      {
        nama: "Nurul Hidayati, M.Pd.",
        nip: "198811202014022003",
        nuptk: "7645766668210042",
        rfid_uid: "1098234502",
        email: "nurul.hidayati@sekolah.sch.id",
        no_hp: "085678912345",
        jabatan: "Wali Kelas",
        mata_pelajaran: "Bahasa Indonesia",
        status: "Aktif"
      },
      {
        nama: "Dra. Siti Aminah",
        nip: "197509142000032001",
        nuptk: "1234567890123456",
        rfid_uid: "1098234503",
        email: "siti.aminah@sekolah.sch.id",
        no_hp: "082345678901",
        jabatan: "Guru Tetap",
        mata_pelajaran: "Fisika",
        status: "Aktif"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    
    // Atur lebar kolom agar rapi saat dibuka di Excel
    ws["!cols"] = [
      { wch: 30 }, // nama
      { wch: 22 }, // nip
      { wch: 20 }, // nuptk
      { wch: 20 }, // rfid_uid
      { wch: 32 }, // email
      { wch: 16 }, // no_hp
      { wch: 20 }, // jabatan
      { wch: 22 }, // mata_pelajaran
      { wch: 12 }, // status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Guru");
    XLSX.writeFile(wb, "Template_Data_Guru.xlsx");
  };

  // Ekspor Data Guru Aktif ke Excel
  const exportCurrentGuruToExcel = () => {
    if (data.length === 0) {
      alert("Belum ada data guru untuk diekspor.");
      return;
    }

    const exportRows = data.map((g, idx) => ({
      No: idx + 1,
      "Nama Lengkap": g.nama,
      NIP: g.nip || "-",
      NUPTK: g.nuptk || "-",
      "Nomor Kartu RFID (UID)": g.rfid_uid || "-",
      Email: g.email || "-",
      "No. HP / WA": g.no_hp || "-",
      Jabatan: g.jabatan || "-",
      "Mata Pelajaran": g.mata_pelajaran || "-",
      Status: g.status || "Aktif",
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 22 },
      { wch: 20 },
      { wch: 24 },
      { wch: 30 },
      { wch: 16 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Guru");
    XLSX.writeFile(wb, `Data_Guru_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Handler Upload Massal File Excel
  const handleMassUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsUploadingMass(true);
    setUploadStats(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
          alert("File Excel kosong atau format tabel tidak ditemukan.");
          setIsUploadingMass(false);
          return;
        }

        let successCount = 0;
        let failedCount = 0;

        for (const row of rows as any[]) {
          try {
            // Ambil data dengan toleransi format nama kolom
            const rawNama = row.nama || row.Nama || row["Nama Lengkap"] || "";
            if (!rawNama) {
              failedCount++;
              continue;
            }

            const rawNip = row.nip || row.NIP || "";
            const rawNuptk = row.nuptk || row.NUPTK || "";
            const rawRfid = row.rfid_uid || row.RFID || row["Nomor RFID"] || row["No Kartu RFID"] || row["UID RFID"] || row["rfid"] || "";
            const rawEmail = row.email || row.Email || "";
            const rawHp = row.no_hp || row["No. HP"] || row["Nomor HP"] || row.Telepon || "";
            const rawJabatan = row.jabatan || row.Jabatan || "Guru Mata Pelajaran";
            const rawMapel = row.mata_pelajaran || row.Mapel || row["Mata Pelajaran"] || "-";
            const rawStatus = row.status || row.Status || "Aktif";

            const payload = {
              nama: String(rawNama).trim(),
              nip: rawNip ? String(rawNip).trim() : "",
              nuptk: rawNuptk ? String(rawNuptk).trim() : "",
              rfid_uid: rawRfid ? String(rawRfid).trim() : "",
              email: rawEmail 
                ? String(rawEmail).trim() 
                : `${String(rawNama).toLowerCase().replace(/[^a-z0-9]/g, "")}@sekolah.sch.id`,
              no_hp: rawHp ? String(rawHp).trim() : "",
              jabatan: String(rawJabatan).trim(),
              mata_pelajaran: String(rawMapel).trim(),
              status: rawStatus === "Inaktif" || rawStatus === "Cuti" ? rawStatus : "Aktif",
            };

            const res = await apiAddGuru(token, payload);
            if (res.success) {
              successCount++;
            } else {
              failedCount++;
            }
          } catch (err) {
            console.error("Gagal menambahkan baris guru:", row, err);
            failedCount++;
          }
        }

        setUploadStats({ total: rows.length, success: successCount, failed: failedCount });
        fetchGuru();

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan saat memproses file Excel. Pastikan menggunakan format .xlsx atau .xls yang valid.");
      } finally {
        setIsUploadingMass(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleOpenAdd = () => {
    setModalMode("add");
    setFormData({ status: "Aktif" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (guru: any) => {
    setModalMode("edit");
    setFormData(guru);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data guru ini?")) return;
    try {
      const res = await apiDeleteGuru(token!, id);
      if (res.success) {
        fetchGuru();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert("Gagal menghapus data.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let res;
      if (modalMode === "add") {
        res = await apiAddGuru(token!, formData);
      } else {
        res = await apiUpdateGuru(token!, formData.id, formData);
      }
      
      if (res.success) {
        setSuccessMsg(res.message);
        setIsModalOpen(false);
        fetchGuru();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = data.filter(item => 
    item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.nip?.includes(searchTerm) ||
    item.rfid_uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.mata_pelajaran?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER SECTION DENGAN ACTION BUTTONS */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Data Guru</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola master data pendidik, unggah data massal dari Excel, dan ekspor data.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Input file tersembunyi untuk Excel */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleMassUpload}
            accept=".xlsx, .xls"
            className="hidden"
          />

          {/* Unduh Template Excel */}
          <Button
            type="button"
            variant="outline"
            onClick={downloadExcelTemplate}
            className="text-gray-700 hover:text-gray-900 bg-white border-gray-300 shadow-sm text-xs sm:text-sm"
          >
            <Download className="w-4 h-4 mr-1.5 text-blue-600" />
            Unduh Template
          </Button>

          {/* Unggah Excel Massal */}
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingMass}
            className="text-gray-700 hover:text-gray-900 bg-white border-gray-300 shadow-sm text-xs sm:text-sm"
          >
            {isUploadingMass ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin text-blue-600" />
            ) : (
              <Upload className="w-4 h-4 mr-1.5 text-emerald-600" />
            )}
            {isUploadingMass ? "Mengimpor..." : "Unggah Excel"}
          </Button>

          {/* Ekspor Data Guru */}
          <Button
            type="button"
            variant="outline"
            onClick={exportCurrentGuruToExcel}
            className="text-gray-700 hover:text-gray-900 bg-white border-gray-300 shadow-sm text-xs sm:text-sm hidden sm:inline-flex"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-green-700" />
            Ekspor Excel
          </Button>

          {/* Tambah Guru Manual */}
          <Button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Guru
          </Button>
        </div>
      </div>

      {/* BANNER HASIL IMPORT MASSAL */}
      {uploadStats && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl flex items-start justify-between shadow-sm animate-in fade-in duration-300">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Proses Impor Data Guru Selesai!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Total data: <strong>{uploadStats.total}</strong> baris | Berhasil diimpor: <strong className="text-emerald-800">{uploadStats.success}</strong>
                {uploadStats.failed > 0 && (
                  <span className="text-amber-700 ml-1">
                    | Gagal: <strong>{uploadStats.failed}</strong> (pastikan nama tidak kosong)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setUploadStats(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ALERT PETUNJUK RINGKAS UPLOAD EXCEL */}
      <div className="bg-blue-50/70 border border-blue-100 text-blue-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            Tip: Klik <strong>Unduh Template</strong> untuk mendapatkan berkas contoh format Excel (.xlsx), isi kolom data pendidik, lalu tekan <strong>Unggah Excel</strong>.
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center space-x-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center space-x-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="relative w-full max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Cari nama, NIP, atau mata pelajaran..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Total Terdaftar: <strong className="text-gray-900">{filteredData.length}</strong> guru
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama / Kontak</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">NIP / Jabatan</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Mapel</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Memuat data...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                    Tidak ada data guru yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((guru) => (
                  <tr key={guru.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                          {guru.nama.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{guru.nama}</div>
                          <div className="text-sm text-gray-500">{guru.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium font-mono">{guru.nip || "-"}</div>
                      <div className="text-xs text-gray-500">{guru.jabatan}</div>
                      {guru.rfid_uid && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            <Radio className="w-3 h-3 mr-1 text-purple-500 shrink-0" />
                            {guru.rfid_uid}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {guru.mata_pelajaran}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        guru.status === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {guru.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleOpenEdit(guru)} className="text-blue-600 hover:text-blue-900 mr-4">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(guru.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">
                {modalMode === "add" ? "Tambah Guru" : "Edit Guru"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                  <input required type="text" value={formData.nama || ""} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIP</label>
                  <input type="text" value={formData.nip || ""} onChange={e => setFormData({...formData, nip: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NUPTK</label>
                  <input type="text" value={formData.nuptk || ""} onChange={e => setFormData({...formData, nuptk: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border font-mono" />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Nomor Kartu RFID (UID)</label>
                    <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-medium border border-purple-100">
                      Tap Reader atau Ketik Manual
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-500">
                      <Radio className="w-4 h-4" />
                    </div>
                    <input 
                      type="text" 
                      value={formData.rfid_uid || ""} 
                      onChange={e => setFormData({...formData, rfid_uid: e.target.value})} 
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm font-mono" 
                      placeholder="Contoh: 1098234501 (atau klik di sini & tempelkan kartu pada scanner)" 
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    💡 Tips: Klik kolom di atas lalu tap kartu RFID guru pada scanner USB untuk pengisian instan.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input required type="email" value={formData.email || ""} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
                  <input type="tel" value={formData.no_hp || ""} onChange={e => setFormData({...formData, no_hp: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                  <input type="text" value={formData.jabatan || ""} onChange={e => setFormData({...formData, jabatan: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
                  <input type="text" value={formData.mata_pelajaran || ""} onChange={e => setFormData({...formData, mata_pelajaran: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status || "Aktif"} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border">
                    <option value="Aktif">Aktif</option>
                    <option value="Inaktif">Inaktif</option>
                    <option value="Cuti">Cuti</option>
                  </select>
                </div>
              </div>
            </form>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 min-w-[100px]">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
