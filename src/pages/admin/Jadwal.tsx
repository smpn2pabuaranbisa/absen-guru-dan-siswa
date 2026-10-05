import React, { useState, useEffect } from "react";
import { useAuth } from "@/store/useAuth";
import { 
  apiGetSchedulesAdmin, 
  apiAddSchedule, 
  apiUpdateSchedule, 
  apiDeleteSchedule, 
  apiGetClassesAdmin, 
  apiGetGuruList 
} from "@/services/api";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Edit2, Trash2, Search, X, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminJadwal() {
  const { token } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [guruList, setGuruList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterKelas, setFilterKelas] = useState("all");
  const [filterHari, setFilterHari] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const hariList = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [resJadwal, resKelas, resGuru] = await Promise.all([
        apiGetSchedulesAdmin(token),
        apiGetClassesAdmin(token),
        apiGetGuruList(token)
      ]);
      
      if (resJadwal.success && resJadwal.data) setData(resJadwal.data);
      else setError(resJadwal.message);

      if (resKelas.success && resKelas.data) setClasses(resKelas.data);
      if (resGuru.success && resGuru.data) setGuruList(resGuru.data);
      
    } catch (err) {
      setError("Gagal memuat data jadwal.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleOpenAdd = () => {
    setModalMode("add");
    setFormData({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (jadwal: any) => {
    setModalMode("edit");
    setFormData(jadwal);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) return;
    try {
      const res = await apiDeleteSchedule(token!, id);
      if (res.success) {
        fetchData();
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
        res = await apiAddSchedule(token!, formData);
      } else {
        res = await apiUpdateSchedule(token!, formData.id, formData);
      }
      
      if (res.success) {
        setSuccessMsg(res.message);
        setIsModalOpen(false);
        fetchData();
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

  const filteredData = data.filter(item => {
    const matchesKelas = filterKelas === "all" || item.kelas_id === filterKelas;
    const matchesHari = filterHari === "all" || item.hari === filterHari;
    return matchesKelas && matchesHari;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Jadwal Mengajar</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola jadwal pelajaran untuk setiap kelas.</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Jadwal
        </Button>
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
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
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

            <select 
              value={filterHari}
              onChange={(e) => setFilterHari(e.target.value)}
              className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border bg-white"
            >
              <option value="all">Semua Hari</option>
              {hariList.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hari & Waktu</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Mata Pelajaran</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kelas</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Guru Pengampu</th>
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
                    Tidak ada jadwal yang ditemukan untuk filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredData.map((jadwal) => (
                  <tr key={jadwal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{jadwal.hari}</div>
                      <div className="text-xs text-gray-500">{jadwal.jam_mulai} - {jadwal.jam_selesai}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{jadwal.mata_pelajaran}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-medium text-xs border border-blue-100">
                        {jadwal.kelas_nama || (classes.find(c => c.id === jadwal.kelas_id)?.name || "-")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {jadwal.guru_nama || (guruList.find(g => g.id === jadwal.guru_id)?.nama || "-")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleOpenEdit(jadwal)} className="text-blue-600 hover:text-blue-900 mr-4">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(jadwal.id)} className="text-red-600 hover:text-red-900">
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
                {modalMode === "add" ? "Tambah Jadwal" : "Edit Jadwal"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                  <select required value={formData.kelas_id || ""} onChange={e => setFormData({...formData, kelas_id: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border bg-white">
                    <option value="" disabled>Pilih Kelas</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hari</label>
                  <select required value={formData.hari || "Senin"} onChange={e => setFormData({...formData, hari: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border bg-white">
                    {hariList.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Mulai</label>
                  <input required type="time" value={formData.jam_mulai || ""} onChange={e => setFormData({...formData, jam_mulai: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Selesai</label>
                  <input required type="time" value={formData.jam_selesai || ""} onChange={e => setFormData({...formData, jam_selesai: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
                <input required type="text" placeholder="Misal: Matematika Dasar" value={formData.mata_pelajaran || ""} onChange={e => setFormData({...formData, mata_pelajaran: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guru Pengampu</label>
                <select required value={formData.guru_id || ""} onChange={e => setFormData({...formData, guru_id: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border bg-white">
                  <option value="" disabled>Pilih Guru</option>
                  {guruList.map(g => (
                    <option key={g.id} value={g.id}>{g.nama} ({g.mata_pelajaran})</option>
                  ))}
                </select>
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
