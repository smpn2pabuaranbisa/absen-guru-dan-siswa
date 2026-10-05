import React, { useState, useEffect } from "react";
import { Calendar, CheckCircle2, Clock, AlertTriangle, FileText, ChevronRight } from "lucide-react";
import { useAuth } from "@/store/useAuth";
import { apiGetWaliStudentDetail } from "@/services/api";

export default function WaliRiwayat() {
  const { user } = useAuth();
  const student = user?.student_data;

  const [studentDetail, setStudentDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student?.id) return;
    apiGetWaliStudentDetail(student.id).then((res) => {
      if (res.success && res.data) {
        setStudentDetail(res.data);
      }
      setLoading(false);
    });
  }, [student?.id]);

  const stats = studentDetail?.statsBulanIni;
  const history = studentDetail?.riwayat || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-slate-800">
          Riwayat Presensi Ananda
        </h2>
        <p className="text-xs text-slate-500">
          Laporan kehadiran lengkap {student?.nama}
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Bulan Ini (September 2026)
          </span>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {stats?.persentase ?? 95}% Kehadiran
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
            <span className="block font-bold text-base">{stats?.hadir ?? 20}</span>
            <span className="text-[10px] text-emerald-600 font-medium">Hadir</span>
          </div>
          <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
            <span className="block font-bold text-base">{stats?.terlambat ?? 1}</span>
            <span className="text-[10px] text-amber-600 font-medium">Terlambat</span>
          </div>
          <div className="p-2 rounded-xl bg-blue-50 text-blue-800">
            <span className="block font-bold text-base">{stats?.izin ?? 1}</span>
            <span className="text-[10px] text-blue-600 font-medium">Izin</span>
          </div>
          <div className="p-2 rounded-xl bg-rose-50 text-rose-800">
            <span className="block font-bold text-base">{stats?.sakit ?? 0}</span>
            <span className="text-[10px] text-rose-600 font-medium">Sakit</span>
          </div>
        </div>
      </div>

      {/* Daily Records List */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
          Daftar Presensi Harian
        </h3>

        {history.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-slate-400 text-xs border border-slate-200">
            Belum ada riwayat tercatat.
          </div>
        ) : (
          history.map((item: any, idx: number) => {
            const isHadir = item.status === "Hadir";
            const isTerlambat = item.status === "Terlambat";
            const isIzin = item.status === "Izin" || item.status === "Sakit";

            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-700 font-bold shrink-0">
                    <span className="text-xs">{item.tanggal.split(" ")[0]}</span>
                    <span className="text-[9px] uppercase text-slate-400 font-normal">
                      {item.tanggal.split(" ")[1]}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-800">
                        {item.hari}, {item.tanggal}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                      <span>
                        Masuk: <strong className="text-slate-700">{item.masuk}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Pulang: <strong className="text-slate-700">{item.pulang}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      isHadir
                        ? "bg-emerald-100 text-emerald-700"
                        : isTerlambat
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
