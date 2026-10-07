import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/store/useAuth";
import { apiGetSiswaListAdmin, apiAddSiswa, apiUpdateSiswa, apiDeleteSiswa, apiGetClasses, apiGetSettings, apiImportStudentsBulk } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Edit2, Trash2, Search, X, AlertCircle, CheckCircle2, CreditCard, Upload, Image as ImageIcon, FileSpreadsheet, Download, Printer, Radio } from "lucide-react";
import KartuPelajarModal from "@/components/siswa/KartuPelajarModal";
import CetakMassalModal from "@/components/siswa/CetakMassalModal";
import { KartuPelajarFront, KartuPelajarBack } from "@/components/siswa/KartuPelajarTemplate";
import * as XLSX from "xlsx";
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function AdminSiswa() {
  const { token } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>({
    name: "SMP NEGERI 1 NUSANTARA",
    npsn: "20104567",
    akreditasi: "A",
    alamat: "Jl. Pendidikan No. 123, Kota Pelajar",
    kepalaSekolah: "Drs. H. Mulyadi, M.Pd",
    nipKepalaSekolah: "196805121994031002"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKelas, setFilterKelas] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedCardStudent, setSelectedCardStudent] = useState<any | null>(null);
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMass, setIsUploadingMass] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [isDownloadingMass, setIsDownloadingMass] = useState(false);
  const downloadContainerRef = useRef<HTMLDivElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, foto: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchSiswa = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await apiGetSiswaListAdmin(token);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Gagal memuat data siswa.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClasses = async () => {
    if (!token) return;
    try {
      const res = await apiGetClasses(token);
      if (res.success && res.data) setClasses(res.data);
    } catch (err) {
      // Handle error implicitly
    }
  };

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await apiGetSettings(token);
      if (res.success && res.data) {
        setSchoolSettings({
          name: res.data.schoolName || "SMP NEGERI 1 NUSANTARA",
          npsn: res.data.npsn || "20104567",
          akreditasi: res.data.akreditasi || "A",
          alamat: res.data.address || "Jl. Pendidikan No. 123, Kota Pelajar",
          kepalaSekolah: res.data.kepalaSekolah || "Drs. H. Mulyadi, M.Pd",
          nipKepalaSekolah: res.data.nipKepalaSekolah || "196805121994031002",
          logoSekolah: res.data.logoSekolah,
          stempelSekolah: res.data.stempelSekolah,
          ttdKepalaSekolah: res.data.ttdKepalaSekolah
        });
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchSiswa();
    fetchClasses();
    fetchSettings();
  }, [token]);

  const handleOpenAdd = () => {
    setModalMode("add");
    setFormData({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (siswa: any) => {
    setModalMode("edit");
    setFormData(siswa);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data siswa ini?")) return;
    try {
      const res = await apiDeleteSiswa(token!, id);
      if (res.success) {
        fetchSiswa();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert("Gagal menghapus data.");
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 
        nama: "Ahmad Siswa", 
        nis: "2023001", 
        nisn: "0012345678", 
        rfid_uid: "0012849101",
        kelas: "7A", 
        jenis_kelamin: "Laki-laki", 
        tempat_lahir: "Jakarta",
        tanggal_lahir: "2010-05-15",
        golongan_darah: "O"
      },
      { 
        nama: "Budi Santoso", 
        nis: "2023002", 
        nisn: "0012345679", 
        rfid_uid: "0012849102",
        kelas: "7A", 
        jenis_kelamin: "Laki-laki", 
        tempat_lahir: "Bandung",
        tanggal_lahir: "2010-08-20",
        golongan_darah: "B"
      }
    ]);
    ws["!cols"] = [
      { wch: 26 }, // nama
      { wch: 14 }, // nis
      { wch: 16 }, // nisn
      { wch: 18 }, // rfid_uid
      { wch: 10 }, // kelas
      { wch: 15 }, // jenis_kelamin
      { wch: 18 }, // tempat_lahir
      { wch: 15 }, // tanggal_lahir
      { wch: 14 }, // golongan_darah
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
    XLSX.writeFile(wb, "Template_Upload_Siswa.xlsx");
  };

  const handleExportExcelSiswa = () => {
    if (filteredData.length === 0) {
      alert("Tidak ada data siswa untuk diekspor.");
      return;
    }

    const rows = filteredData.map((s, idx) => ({
      No: idx + 1,
      "Nama Siswa": s.nama,
      "NIS": s.nis || "-",
      "NISN": s.nisn || "-",
      "Nomor Kartu RFID (UID)": s.rfid_uid || "-",
      "Kelas": s.kelas_nama || "-",
      "Jenis Kelamin": s.jk === 'L' || s.jenis_kelamin === 'Laki-laki' ? 'Laki-laki' : 'Perempuan',
      "Tempat Lahir": s.tempat_lahir || "-",
      "Tanggal Lahir": s.tanggal_lahir || "-",
      "Gol. Darah": s.golongan_darah || "-",
      "Status": s.status || "Aktif",
      "Nama Wali": s.nama_wali || "-",
      "No. WhatsApp Wali": s.no_wa_wali || "-"
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 14 },
      { wch: 16 },
      { wch: 24 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 10 },
      { wch: 24 },
      { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
    XLSX.writeFile(wb, `Data_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleMassUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsUploadingMass(true);
    setUploadStats(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert("File Excel kosong");
          setIsUploadingMass(false);
          return;
        }

        const studentsPayload: any[] = [];
        let skippedEmpty = 0;

        for (const row of data as any[]) {
          const rawNama = row.nama || row.Nama || row["Nama Lengkap"] || "";
          if (!rawNama) {
            skippedEmpty++;
            continue;
          }

          // Temukan ID kelas berdasarkan nama kelas dari Excel
          let targetClassId = "";
          if (row.kelas) {
            const matchedClass = classes.find(c => 
              (c.name && c.name.toLowerCase() === String(row.kelas).toLowerCase()) ||
              (c.nama_kelas && c.nama_kelas.toLowerCase() === String(row.kelas).toLowerCase()) || 
              c.id === row.kelas
            );
            if (matchedClass) {
              targetClassId = matchedClass.id;
            }
          }

          const rawRfid = row.rfid_uid || row.RFID || row["Nomor RFID"] || row["No Kartu RFID"] || row["UID RFID"] || row["rfid"] || "";

          studentsPayload.push({
            nama: String(rawNama).trim(),
            nis: row.nis?.toString() || "",
            nisn: row.nisn?.toString() || "",
            rfid_uid: rawRfid ? String(rawRfid).trim() : "",
            kelas_id: targetClassId,
            jenis_kelamin: row.jenis_kelamin || "Laki-laki",
            tempat_lahir: row.tempat_lahir || "",
            tanggal_lahir: row.tanggal_lahir || "",
            golongan_darah: row.golongan_darah || "-",
            status: "Aktif",
            foto: ""
          });
        }

        if (studentsPayload.length === 0) {
          alert("Tidak ada baris data siswa yang valid dalam file Excel.");
          setIsUploadingMass(false);
          return;
        }

        const res = await apiImportStudentsBulk(token, studentsPayload);
        const successCount = res.success ? studentsPayload.length : 0;
        const failedCount = res.success ? skippedEmpty : studentsPayload.length + skippedEmpty;

        setUploadStats({ total: data.length, success: successCount, failed: failedCount });
        await fetchSiswa();
        
        // Reset input file agar bisa memilih file yang sama lagi jika perlu
        if (excelInputRef.current) {
          excelInputRef.current.value = "";
        }
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan saat memproses file Excel. Pastikan formatnya benar.");
      } finally {
        setIsUploadingMass(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let res;
      if (modalMode === "add") {
        res = await apiAddSiswa(token!, formData);
      } else {
        res = await apiUpdateSiswa(token!, formData.id, formData);
      }
      
      if (res.success) {
        setSuccessMsg(res.message);
        setIsModalOpen(false);
        fetchSiswa();
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

  // Fungsi untuk download massal per kelas
  const handleDownloadMassal = async () => {
    if (filterKelas === "all") {
      alert("Silakan pilih salah satu kelas terlebih dahulu di menu filter untuk download ID Card massal.");
      return;
    }
    
    const siswaToPrint = data.filter(item => item.kelas_id === filterKelas);
    if (siswaToPrint.length === 0) {
      alert("Tidak ada siswa di kelas ini.");
      return;
    }

    setIsDownloadingMass(true);
    
    try {
      // Tunggu sebentar agar komponen ter-render ke DOM
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!downloadContainerRef.current) {
        throw new Error("Container tidak ditemukan");
      }

      const zip = new JSZip();
      const folderName = `ID_Card_${classes.find(c => c.id === filterKelas)?.name || "Kelas"}`;
      const folder = zip.folder(folderName);

      if (!folder) throw new Error("Gagal membuat folder zip");

      const cardElements = downloadContainerRef.current.querySelectorAll('.card-export-target');
      
      // Loop over each element and convert to PNG
      for (let i = 0; i < cardElements.length; i++) {
        const element = cardElements[i] as HTMLElement;
        const studentName = element.getAttribute('data-name') || `Siswa_${i}`;
        const side = element.getAttribute('data-side') || 'Depan'; 
        
        const dataUrl = await toPng(element, {
          quality: 1,
          pixelRatio: 2, 
          skipFonts: false,
          cacheBust: true,
          style: {
            transform: 'scale(1)', 
          }
        });
        
        // Remove "data:image/png;base64,"
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        folder.file(`${studentName}_${side}.png`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folderName}.zip`);

    } catch (error) {
      console.error("Gagal mendownload ID Card:", error);
      alert("Terjadi kesalahan saat meng-generate ID Card. Pastikan tidak ada isu CORS pada gambar.");
    } finally {
      setIsDownloadingMass(false);
    }
  };

  const filteredData = data.filter(item => {
    const matchesSearch = item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.nis?.includes(searchTerm) || 
                          item.nisn?.includes(searchTerm) ||
                          item.rfid_uid?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKelas = filterKelas === "all" || item.kelas_id === filterKelas;
    return matchesSearch && matchesKelas;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Data Siswa</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola informasi master data siswa & nomor kartu RFID.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Upload Input */}
          <input
            type="file"
            ref={excelInputRef}
            className="hidden"
            accept=".xlsx, .xls, .csv"
            onChange={handleMassUpload}
          />
          
          <Button 
            variant="outline" 
            className="bg-white"
            onClick={handleDownloadTemplate}
          >
            <Download className="w-4 h-4 mr-2" />
            Template
          </Button>

          <Button 
            variant="outline" 
            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
            onClick={() => excelInputRef.current?.click()}
            disabled={isUploadingMass}
          >
            {isUploadingMass ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 mr-2" />
            )}
            Upload Excel
          </Button>

          <Button 
            variant="outline" 
            className="bg-white text-gray-700 hover:bg-gray-50"
            onClick={handleExportExcelSiswa}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
            Ekspor Excel
          </Button>

          <Button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Siswa
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center space-x-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {uploadStats && (
        <div className={`p-4 rounded-xl flex items-center justify-between shadow-sm ${uploadStats.failed === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-800'} border`}>
          <div className="flex items-center space-x-3">
            {uploadStats.failed === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <div>
              <p className="text-sm font-bold">Hasil Upload Massal</p>
              <p className="text-xs mt-0.5">Berhasil ditambahkan: {uploadStats.success} siswa, Gagal: {uploadStats.failed} siswa.</p>
            </div>
          </div>
          <button onClick={() => setUploadStats(null)} className="p-1 hover:bg-black/5 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center space-x-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Cari nama, NIS, atau NISN..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="w-full sm:w-auto flex items-center space-x-2">
            <select 
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border bg-white"
            >
              <option value="all">Semua Kelas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {filterKelas !== "all" && (
              <>
                <Button 
                  onClick={() => setIsBatchPrintModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 shadow-xs"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Cetak Massal ID Card (A4)
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleDownloadMassal}
                  disabled={isDownloadingMass}
                  className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 h-9"
                >
                  {isDownloadingMass ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Download ZIP
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama / Jenis Kelamin</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">NIS / NISN</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nomor Kartu RFID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kelas</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Memuat data...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    Tidak ada data siswa yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((siswa) => (
                  <tr key={siswa.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{siswa.nama}</div>
                      <div className="text-xs text-gray-500">{siswa.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">{siswa.nis || "-"}</div>
                      <div className="text-xs text-gray-500 font-mono">{siswa.nisn || "-"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {siswa.rfid_uid ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          <Radio className="w-3.5 h-3.5 mr-1 text-purple-600 shrink-0" />
                          {siswa.rfid_uid}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Belum dipasangkan</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-medium text-xs border border-blue-100">
                        {siswa.kelas_nama}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        siswa.status === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {siswa.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => setSelectedCardStudent({
                          id: siswa.id,
                          nama: siswa.nama,
                          nis: siswa.nis || "2023001",
                          nisn: siswa.nisn || "0087654321",
                          rfid_uid: siswa.rfid_uid,
                          kelas: siswa.kelas_nama || "Kelas 7A",
                          jenis_kelamin: siswa.jk === 'L' ? 'Laki-laki' : 'Perempuan',
                          golongan_darah: siswa.golongan_darah || "O",
                          tempat_lahir: siswa.tempat_lahir || "Jakarta",
                          tanggal_lahir: siswa.tanggal_lahir || "14 Mei 2011",
                          foto: siswa.foto || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
                          berlaku_hingga: "30 Juni 2027"
                        })}
                        title="Lihat & Cetak Kartu Pelajar Digital"
                        className="inline-flex items-center px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 mr-3 transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1" />
                        <span>Kartu</span>
                      </button>
                      <button onClick={() => handleOpenEdit(siswa)} title="Edit Siswa" className="text-blue-600 hover:text-blue-900 mr-3">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(siswa.id)} title="Hapus Siswa" className="text-red-600 hover:text-red-900">
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">
                {modalMode === "add" ? "Tambah Siswa" : "Edit Siswa"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* PHOTO UPLOAD */}
              <div className="flex flex-col items-center justify-center mb-6">
                <div 
                  className="relative w-24 h-32 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-blue-400 overflow-hidden group transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.foto ? (
                    <img src={formData.foto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400 group-hover:text-blue-500">
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-[10px] font-medium text-center px-2">Klik Upload<br/>Foto</span>
                    </div>
                  )}
                  {formData.foto && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-white text-xs font-semibold flex items-center"><Upload className="w-3 h-3 mr-1"/> Ganti</span>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/jpg" 
                  onChange={handlePhotoUpload}
                />
                <p className="text-xs text-gray-400 mt-2">Rasio 3:4 (Pas Foto)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input required type="text" value={formData.nama || ""} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempat Lahir</label>
                  <input type="text" value={formData.tempat_lahir || ""} onChange={e => setFormData({...formData, tempat_lahir: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border" placeholder="Contoh: Jakarta" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                  <input type="date" value={formData.tanggal_lahir || ""} onChange={e => setFormData({...formData, tanggal_lahir: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIS</label>
                  <input type="text" value={formData.nis || ""} onChange={e => setFormData({...formData, nis: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border font-mono" placeholder="2023001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NISN</label>
                  <input type="text" value={formData.nisn || ""} onChange={e => setFormData({...formData, nisn: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border font-mono" placeholder="0012345678" />
                </div>
              </div>

              {/* Nomor Kartu RFID */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Nomor Kartu RFID (UID)
                  </label>
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
                    placeholder="Contoh: 0012849101 (atau klik di sini & tempelkan kartu pada reader)" 
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  💡 Tips: Klik kolom di atas lalu tempelkan kartu RFID ke alat scanner USB sekolah untuk pengisian otomatis.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                  <select value={formData.jk || "L"} onChange={e => setFormData({...formData, jk: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border">
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gol. Darah</label>
                  <select value={formData.golongan_darah || "-"} onChange={e => setFormData({...formData, golongan_darah: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border">
                    <option value="-">Tidak Tahu</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                  <select required value={formData.kelas_id || ""} onChange={e => setFormData({...formData, kelas_id: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border">
                    <option value="" disabled>Pilih Kelas</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status || "Aktif"} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border">
                    <option value="Aktif">Aktif</option>
                    <option value="Inaktif">Inaktif</option>
                    <option value="Pindah">Pindah</option>
                    <option value="Lulus">Lulus</option>
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

      {/* MODAL KARTU PELAJAR DIGITAL */}
      {selectedCardStudent && (
        <KartuPelajarModal
          isOpen={!!selectedCardStudent}
          onClose={() => setSelectedCardStudent(null)}
          student={selectedCardStudent}
          school={schoolSettings}
        />
      )}

      {/* MODAL CETAK MASSAL ID CARD (GRID PDF A4 & BROWSER PRINT) */}
      {isBatchPrintModalOpen && filterKelas !== "all" && (
        <CetakMassalModal
          isOpen={isBatchPrintModalOpen}
          onClose={() => setIsBatchPrintModalOpen(false)}
          students={data.filter(item => item.kelas_id === filterKelas)}
          classNameTitle={classes.find(c => c.id === filterKelas)?.name || "Kelas"}
          school={schoolSettings}
        />
      )}

      {/* HIDDEN EXPORT MASSAL CONTAINER */}
      {isDownloadingMass && (
        <div ref={downloadContainerRef} className="fixed top-[-9999px] left-[-9999px] z-[-1] opacity-0 pointer-events-none">
          {data.filter(item => item.kelas_id === filterKelas).map(siswa => {
            // Murni hanya Nomor Induk Siswa (NIS)
            const qrPayload = String(siswa.nis || "000000").trim();

            return (
              <div key={siswa.id} className="flex flex-col gap-8 mb-8">
                {/* FRONT CARD (will be captured as image) */}
                <div className="card-export-target bg-white" data-name={siswa.nama} data-side="Depan" style={{ width: "256px", height: "406px", overflow: "hidden" }}>
                  <KartuPelajarFront 
                    student={siswa}
                    qrPayload={qrPayload}
                    school={schoolSettings}
                  />
                </div>

                {/* BACK CARD (will be captured as image) */}
                <div className="card-export-target bg-white" data-name={siswa.nama} data-side="Belakang" style={{ width: "256px", height: "406px", overflow: "hidden" }}>
                  <KartuPelajarBack 
                    student={siswa}
                    school={schoolSettings}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
