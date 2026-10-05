import React, { useState, useEffect } from "react";
import { useAuth } from "@/store/useAuth";
import { apiGetLeaveRequestsAdmin, apiApproveLeaveRequest, apiRejectLeaveRequest } from "@/services/api";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Check, 
  X, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Calendar, 
  User, 
  Paperclip 
} from "lucide-react";

export default function AdminIzin() {
  const { token } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("Pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiGetLeaveRequestsAdmin(token, filterRole, filterStatus);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Gagal memuat data pengajuan izin.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, filterRole, filterStatus]);

  const handleApprove = async (id: string) => {
    if (!confirm("Setujui pengajuan izin ini?")) return;
    setActionLoading(id);
    try {
      const res = await apiApproveLeaveRequest(token!, id);
      if (res.success) {
        setSuccessMsg(res.message);
        if (selectedDetail && selectedDetail.id === id) {
          setSelectedDetail({ ...selectedDetail, status: "Disetujui" });
        }
        fetchData();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert("Gagal menyetujui.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Tolak pengajuan izin ini?")) return;
    setActionLoading(id);
    try {
      const res = await apiRejectLeaveRequest(token!, id);
      if (res.success) {
        setSuccessMsg(res.message);
        if (selectedDetail && selectedDetail.id === id) {
          setSelectedDetail({ ...selectedDetail, status: "Ditolak" });
        }
        fetchData();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert("Gagal menolak.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredData = data.filter(item => 
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.alasan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Persetujuan Izin & Cuti</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola dan verifikasi surat pengajuan izin, sakit, atau cuti dari Guru dan Siswa.</p>
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
        <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full lg:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Cari nama atau alasan..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-4">
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="block w-full sm:w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border bg-white"
            >
              <option value="all">Semua Peran</option>
              <option value="guru">Guru</option>
              <option value="siswa">Siswa</option>
            </select>

            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full sm:w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border bg-white"
            >
              <option value="all">Semua Status</option>
              <option value="Pending">Menunggu (Pending)</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Ditolak">Ditolak</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pemohon</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Jenis Izin</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Alasan</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Lampiran</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Memuat data pengajuan izin...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    Tidak ada pengajuan izin yang ditemukan untuk filter ini.
                  </td>
                </tr>
              ) : (
                filteredData.map((izin) => (
                  <tr key={izin.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{izin.nama}</div>
                      <div className="text-xs text-gray-500">{izin.peran} {izin.kelas ? `• ${izin.kelas}` : ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        izin.jenis_izin === 'Sakit' ? 'bg-red-100 text-red-800' : 
                        izin.jenis_izin === 'Cuti' ? 'bg-blue-100 text-blue-800' : 
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {izin.jenis_izin}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">{izin.tanggal_mulai}</div>
                      {izin.tanggal_mulai !== izin.tanggal_selesai && (
                        <div className="text-xs text-gray-500">s/d {izin.tanggal_selesai}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-sm text-gray-800 truncate" title={izin.alasan}>{izin.alasan}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {izin.lampiran ? (
                        <button 
                          onClick={() => setSelectedDetail(izin)}
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline font-medium text-xs bg-blue-50 px-2 py-1 rounded"
                        >
                          <Paperclip className="w-3 h-3 mr-1" /> Lampiran
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        izin.status === 'Disetujui' ? 'bg-green-100 text-green-800' : 
                        izin.status === 'Ditolak' ? 'bg-red-100 text-red-800' : 
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {izin.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-600 hover:text-gray-900"
                        onClick={() => setSelectedDetail(izin)}
                        title="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {izin.status === 'Pending' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                            onClick={() => handleApprove(izin.id)}
                            disabled={actionLoading === izin.id}
                          >
                            {actionLoading === izin.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Setujui
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleReject(izin.id)}
                            disabled={actionLoading === izin.id}
                          >
                            {actionLoading === izin.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1" />} Tolak
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">
                  Detail Pengajuan Izin
                </h2>
              </div>
              <button 
                onClick={() => setSelectedDetail(null)} 
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <div className="text-xs text-gray-500 uppercase font-semibold">Pemohon</div>
                  <div className="text-base font-bold text-gray-900">{selectedDetail.nama}</div>
                  <div className="text-xs text-gray-600">{selectedDetail.peran} {selectedDetail.kelas ? `• ${selectedDetail.kelas}` : ''}</div>
                </div>
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  selectedDetail.status === 'Disetujui' ? 'bg-green-100 text-green-800' : 
                  selectedDetail.status === 'Ditolak' ? 'bg-red-100 text-red-800' : 
                  'bg-amber-100 text-amber-800'
                }`}>
                  {selectedDetail.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-xs text-gray-500 font-semibold mb-1">Jenis Izin</div>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                    selectedDetail.jenis_izin === 'Sakit' ? 'bg-red-100 text-red-800' : 
                    selectedDetail.jenis_izin === 'Cuti' ? 'bg-blue-100 text-blue-800' : 
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedDetail.jenis_izin}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-xs text-gray-500 font-semibold mb-1">Rentang Tanggal</div>
                  <div className="text-xs font-medium text-gray-900">{selectedDetail.tanggal_mulai}</div>
                  {selectedDetail.tanggal_mulai !== selectedDetail.tanggal_selesai && (
                    <div className="text-xs text-gray-500">s/d {selectedDetail.tanggal_selesai}</div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Alasan Pengajuan</label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-800 leading-relaxed">
                  {selectedDetail.alasan}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Lampiran / Surat Dokter</label>
                {selectedDetail.lampiran ? (
                  <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Paperclip className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-900">surat-keterangan-izin.jpg</span>
                    </div>
                    <a 
                      href={selectedDetail.lampiran} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-1 rounded border border-blue-200 shadow-xs"
                    >
                      Buka Berkas
                    </a>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-xs text-gray-500 text-center">
                    Tidak ada lampiran dokumen yang disertakan.
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedDetail(null)}
              >
                Tutup
              </Button>
              
              {selectedDetail.status === 'Pending' ? (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleReject(selectedDetail.id)}
                    disabled={actionLoading === selectedDetail.id}
                  >
                    {actionLoading === selectedDetail.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1" />} Tolak
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprove(selectedDetail.id)}
                    disabled={actionLoading === selectedDetail.id}
                  >
                    {actionLoading === selectedDetail.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Setujui
                  </Button>
                </div>
              ) : (
                <span className="text-xs font-medium text-gray-500">
                  Status pengajuan: <strong>{selectedDetail.status}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
