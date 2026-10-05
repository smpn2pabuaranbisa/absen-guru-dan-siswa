import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGetAdminDashboard } from "@/services/api";
import { useAuth } from "@/store/useAuth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2, Users, UserCheck, UserX, Clock, FileText, AlertCircle } from "lucide-react";

export default function AdminDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!token) return;
      try {
        setIsLoading(true);
        const res = await apiGetAdminDashboard(token);
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.message);
        }
      } catch (err) {
        setError("Gagal memuat data dashboard.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-500 font-medium">Memuat Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl flex items-start space-x-3 shadow-sm max-w-2xl mx-auto mt-10">
        <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-lg">Gagal Memuat Data</h3>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Admin</h1>
          <p className="text-gray-500 mt-1">Ringkasan absensi Guru dan Siswa hari ini.</p>
        </div>
      </div>

      {/* METRICS - GURU */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Statistik Guru (Hari Ini)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card className="bg-white">
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-gray-500">Total Guru</CardTitle>
              <Users className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-bold text-gray-900">{data.statsGuru.total}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-100">
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-green-700">Hadir</CardTitle>
              <UserCheck className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-bold text-green-700">{data.statsGuru.hadir}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-yellow-50 border-yellow-100">
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-yellow-700">Terlambat</CardTitle>
              <Clock className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-bold text-yellow-700">{data.statsGuru.terlambat}</div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-100">
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-purple-700">Izin/Sakit</CardTitle>
              <FileText className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-bold text-purple-700">{data.statsGuru.izin + data.statsGuru.sakit}</div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-100">
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-red-700">Belum Hadir/Alpa</CardTitle>
              <UserX className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-bold text-red-700">{data.statsGuru.belum_hadir + data.statsGuru.alpa}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* METRICS - SISWA */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Statistik Siswa (Hari Ini)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-gray-500">Total Siswa</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-xl font-bold">{data.statsSiswa.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-gray-500">Siswa Hadir</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-xl font-bold text-green-600">{data.statsSiswa.hadir}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-gray-500">Siswa Izin/Sakit</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-xl font-bold text-blue-600">{data.statsSiswa.izin + data.statsSiswa.sakit}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-gray-500">Siswa Alpa</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-xl font-bold text-red-600">{data.statsSiswa.alpa}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* CHART */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Tren Kehadiran Mingguan (Guru)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip 
                      cursor={{fill: '#f9fafb'}}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                    <Bar dataKey="Hadir" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                    <Bar dataKey="TidakHadir" name="Tidak Hadir" fill="#f87171" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LISTS */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex justify-between items-center">
                <span>Absensi Terbaru</span>
                <span className="text-xs font-normal text-blue-600 cursor-pointer hover:underline">Lihat Semua</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="divide-y divide-gray-100">
                {data.recentAttendance.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center px-6 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{item.time}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        item.status === 'Hadir' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex justify-between items-center">
                <span>Pengajuan Izin Terbaru</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="divide-y divide-gray-100">
                {data.recentLeaves.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center px-6 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.date} • {item.type}</p>
                    </div>
                    <div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
                        item.status === 'Menunggu' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
