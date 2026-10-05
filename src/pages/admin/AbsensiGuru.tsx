import React, { useState, useEffect } from "react";
import { useAuth } from "@/store/useAuth";
import { 
  apiGetAbsensiGuruAdmin, 
  apiGetPresensiMengajarList, 
  apiGetClassesAdmin, 
  apiGetGuruList 
} from "@/services/api";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Search, 
  AlertCircle, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  BookOpen, 
  Camera, 
  Clock, 
  CheckCircle2, 
  Eye, 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  Filter
} from "lucide-react";
import { PresensiMengajar } from "@/types";
import DetailPresensiKBMModal from "@/components/guru/DetailPresensiKBMModal";

export default function AdminAbsensiGuru() {
  const { token } = useAuth();
  
  // Tab Switcher: "gerbang" (harian GPS) atau "kbm" (per kelas & mata pelajaran)
  const [activeTab, setActiveTab] = useState<"gerbang" | "kbm">("kbm");

  // Data Gerbang Harian
  const [dataGerbang, setDataGerbang] = useState<any[]>([]);
  const [isLoadingGerbang, setIsLoadingGerbang] = useState(true);

  // Data KBM di Kelas
  const [dataKBM, setDataKBM] = useState<PresensiMengajar[]>([]);
  const [isLoadingKBM, setIsLoadingKBM] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [guruList, setGuruList] = useState<any[]>([]);
  const [filterKelas, setFilterKelas] = useState("all");
  const [filterGuru, setFilterGuru] = useState("all");
  const [selectedKbmForDetail, setSelectedKbmForDetail] = useState<PresensiMengajar | null>(null);

  const [error, setError] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDataGerbang = async () => {
    if (!token) return;
    setIsLoadingGerbang(true);
    setError(null);
    try {
      const res = await apiGetAbsensiGuruAdmin(token, selectedDate);
      if (res.success && res.data) {
        setDataGerbang(res.data);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Gagal memuat data absensi gerbang guru.");
    } finally {
      setIsLoadingGerbang(false);
    }
  };

  const fetchDataKBM = async () => {
    if (!token) return;
    setIsLoadingKBM(true);
    try {
      const [resKbm, resClasses, resGuru] = await Promise.all([
        apiGetPresensiMengajarList(token, {
          tanggal: selectedDate,
          kelasId: filterKelas,
          guruId: filterGuru,
          search: searchTerm
        }),
        apiGetClassesAdmin(token),
        apiGetGuruList(token)
      ]);

      if (resKbm.success && resKbm.data) {
        setDataKBM(resKbm.data);
      }
      if (resClasses.success && resClasses.data) {
        setClasses(resClasses.data);
      }
      if (resGuru.success && resGuru.data) {
        setGuruList(resGuru.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingKBM(false);
    }
  };

  useEffect(() => {
    if (activeTab === "gerbang") {
      fetchDataGerbang();
    } else {
      fetchDataKBM();
    }
  }, [token, selectedDate, activeTab, filterKelas, filterGuru]);

  const filteredDataGerbang = dataGerbang.filter(item => 
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.nip.includes(searchTerm)
  );

  const filteredDataKBM = dataKBM.filter(item => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || 
      item.guru_nama.toLowerCase().includes(q) || 
      item.kelas_nama.toLowerCase().includes(q) || 
      item.mata_pelajaran.toLowerCase().includes(q) || 
      item.topik_materi.toLowerCase().includes(q);
    return matchSearch;
  });

  const totalKBM = filteredDataKBM.length;
  const selesaiKBM = filteredDataKBM.filter(k => k.status === "Selesai").length;
  const ongoingKBM = filteredDataKBM.filter(k => k.status === "Sedang Mengajar").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Presensi Guru & Jurnal KBM</h1>
          <p className="text-sm text-gray-500 mt-1">Pantau kehadiran guru gerbang (GPS) dan presensi mengajar di kelas per mata pelajaran (Bukti Foto KBM).</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => alert("Mengunduh Rekap Presensi & Jurnal KBM...")}
            className="text-gray-700 bg-white shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> Export Excel
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.print()}
            className="text-gray-700 bg-white shadow-xs"
          >
            <FileText className="w-4 h-4 mr-2 text-red-600" /> Cetak Rekap
          </Button>
        </div>
      </div>

      {/* TAB SWITCHER */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl max-w-lg border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("kbm")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition ${
            activeTab === "kbm"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span>Presensi Mengajar di Kelas (KBM)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gerbang")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition ${
            activeTab === "gerbang"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-4 h-4 text-slate-600" />
          <span>Absensi Gerbang (GPS)</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center space-x-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KONTEN TAB 1: PRESENSI MENGAJAR DI KELAS PER MATA PELAJARAN (KBM) */}
      {/* ========================================================================= */}
      {activeTab === "kbm" && (
        <div className="space-y-4">
          {/* STATS KBM CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Total Sesi KBM Tercatat</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalKBM}</p>
              </div>
              <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Sedang Berlangsung di Kelas</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{ongoingKBM}</p>
              </div>
              <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Selesai Mengajar</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{selesaiKBM}</p>
              </div>
              <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* TABLE CONTAINER & FILTER */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-3 items-center justify-between bg-gray-50/50">
              <div className="relative w-full md:max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Cari guru, kelas, mapel, materi..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="w-full md:w-auto flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Tanggal:</label>
                  <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Kelas:</label>
                  <select
                    value={filterKelas}
                    onChange={(e) => setFilterKelas(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Semua Kelas</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Guru:</label>
                  <select
                    value={filterGuru}
                    onChange={(e) => setFilterGuru(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Semua Guru</option>
                    {guruList.map(g => (
                      <option key={g.id} value={g.id}>{g.nama}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Foto KBM</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Guru Pengampu</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kelas & Mapel</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Waktu Masuk / Selesai</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Jurnal / Topik Materi</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoadingKBM ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                        <p className="mt-2 text-sm text-gray-500">Memuat presensi mengajar kelas...</p>
                      </td>
                    </tr>
                  ) : filteredDataKBM.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                        Belum ada data presensi mengajar di kelas untuk filter tanggal ini.
                      </td>
                    </tr>
                  ) : (
                    filteredDataKBM.map((kbm) => (
                      <tr key={kbm.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedKbmForDetail(kbm)}
                            className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-300 shadow-xs flex-shrink-0 group cursor-pointer block"
                            title="Klik untuk memperbesar bukti foto KBM"
                          >
                            <img
                              src={kbm.foto_kbm}
                              alt="Bukti KBM"
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </button>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{kbm.guru_nama}</div>
                          <div className="text-xs text-gray-500">NIP. {kbm.nip || "-"}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 mb-1">
                            {kbm.kelas_nama}
                          </span>
                          <div className="text-xs font-bold text-gray-800">{kbm.mata_pelajaran}</div>
                          <div className="text-[11px] text-gray-400">Jadwal: {kbm.jam_jadwal}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs">
                          <div className="font-semibold text-gray-800">
                            Masuk: <span className="text-blue-700">{kbm.jam_masuk_kelas}</span>
                          </div>
                          <div className="text-gray-500 mt-0.5">
                            Selesai: <span className="text-emerald-700 font-semibold">{kbm.jam_selesai_kelas || "Masih mengajar"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs font-medium text-gray-800 max-w-xs line-clamp-2">
                            {kbm.topik_materi}
                          </div>
                          {kbm.catatan_khusus && (
                            <div className="text-[11px] text-gray-500 mt-1 italic line-clamp-1">
                              Ket: {kbm.catatan_khusus}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            kbm.status === 'Selesai' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-blue-100 text-blue-800 animate-pulse'
                          }`}>
                            {kbm.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedKbmForDetail(kbm)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Bukti Watermark
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KONTEN TAB 2: ABSENSI GERBANG / HARIAN (GPS) */}
      {/* ========================================================================= */}
      {activeTab === "gerbang" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
            <div className="relative w-full max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Cari nama atau NIP..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div className="w-full sm:w-auto flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Tanggal:</label>
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama / NIP</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Jam Datang</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Jam Pulang</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status Gerbang</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Lokasi GPS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoadingGerbang ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                      <p className="mt-2 text-sm text-gray-500">Memuat data absensi...</p>
                    </td>
                  </tr>
                ) : filteredDataGerbang.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                      Tidak ada data absensi gerbang untuk tanggal ini.
                    </td>
                  </tr>
                ) : (
                  filteredDataGerbang.map((absen) => (
                    <tr key={absen.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{absen.nama}</div>
                        <div className="text-xs text-gray-500">{absen.nip}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{absen.jam_datang}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{absen.jam_pulang}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          absen.status === 'Hadir' ? 'bg-green-100 text-green-800' : 
                          absen.status === 'Terlambat' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {absen.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {absen.lokasi}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DETAIL BUKTI KBM WATERMARK */}
      {selectedKbmForDetail && (
        <DetailPresensiKBMModal
          isOpen={!!selectedKbmForDetail}
          onClose={() => setSelectedKbmForDetail(null)}
          data={selectedKbmForDetail}
        />
      )}
    </div>
  );
}

