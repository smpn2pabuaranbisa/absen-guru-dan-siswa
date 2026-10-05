import React, { useState, useEffect } from "react";
import { useAuth } from "@/store/useAuth";
import { apiGetAbsensiSiswaAdmin, apiGetClassesAdmin } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Loader2, Search, AlertCircle, Download, FileSpreadsheet, FileText } from "lucide-react";

export default function AdminAbsensiSiswa() {
  const { token } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [filterKelas, setFilterKelas] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiGetAbsensiSiswaAdmin(token, selectedDate, filterKelas);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Gagal memuat data absensi siswa.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClasses = async () => {
    if (!token) return;
    try {
      const res = await apiGetClassesAdmin(token);
      if (res.success && res.data) setClasses(res.data);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [token, selectedDate, filterKelas]);

  const filteredData = data.filter(item => 
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.nis.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Rekapitulasi Absensi Siswa</h1>
          <p className="text-sm text-gray-500 mt-1">Pantau kehadiran siswa berdasarkan kelas dan tanggal.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="text-gray-700 bg-white">
            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> Export Excel
          </Button>
          <Button variant="outline" className="text-gray-700 bg-white">
            <FileText className="w-4 h-4 mr-2 text-red-600" /> Export PDF
          </Button>
        </div>
      </div>

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
              placeholder="Cari nama atau NIS..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-4">
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

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Tanggal:</label>
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Siswa</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kelas</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Waktu Absen</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bukti Foto</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Memuat data absensi...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                    Tidak ada data absensi untuk filter ini.
                  </td>
                </tr>
              ) : (
                filteredData.map((absen) => (
                  <tr key={absen.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{absen.nama}</div>
                      <div className="text-xs text-gray-500">{absen.nis}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{absen.kelas}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{absen.waktu}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        absen.status === 'Hadir' ? 'bg-green-100 text-green-800' : 
                        absen.status === 'Terlambat' ? 'bg-yellow-100 text-yellow-800' : 
                        absen.status === 'Izin' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {absen.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {absen.foto ? (
                        <a href={absen.foto} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Lihat Foto</a>
                      ) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
