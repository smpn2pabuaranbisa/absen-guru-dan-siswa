import React, { useState, useEffect } from "react";
import { useAuth } from "@/store/useAuth";
import { 
  apiGetClasses, 
  apiGetSettings 
} from "@/services/api";
import LegerNilaiTab from "@/components/reports/LegerNilaiTab";
import { useNavigate } from "react-router-dom";
import { 
  Award, 
  BookOpen, 
  GraduationCap, 
  Calendar,
  ArrowRight
} from "lucide-react";

export default function AdminLegerNilai() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      if (!token) return;
      try {
        const [clsRes, setRes] = await Promise.all([
          apiGetClasses(token),
          apiGetSettings(token)
        ]);
        if (clsRes.success && clsRes.data) {
          setClasses(clsRes.data);
        }
        if (setRes.success && setRes.data) {
          setSchoolSettings(setRes.data);
        }
      } catch (err) {
        console.error("Gagal memuat data", err);
      }
    };
    init();
  }, [token]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Buku Leger Nilai Siswa
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              Buku Induk & Rapor
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Rekapitulasi lengkap nilai hasil belajar siswa per mata pelajaran, akumulasi nilai rapor, peringkat kelas, dan status kelulusan.
          </p>
        </div>

        {/* NAVIGASI CEPAT KE LEGER PRESENSI */}
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-xs self-start sm:self-auto">
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white shadow-xs cursor-default"
          >
            <Award className="w-4 h-4" />
            <span>Leger Nilai (Point 2)</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/leger")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Leger Presensi (Point 1)</span>
          </button>
        </div>
      </div>

      {/* RENDER LEGER NILAI COMPONENT */}
      {token && (
        <LegerNilaiTab
          token={token}
          classes={classes}
          schoolSettings={schoolSettings}
        />
      )}
    </div>
  );
}
