import React, { useState, useEffect } from "react";
import { 
  GraduationCap, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Printer, 
  Calendar, 
  ChevronRight, 
  Sparkles,
  School,
  FileSpreadsheet,
  Download,
  Info
} from "lucide-react";
import { useAuth } from "@/store/useAuth";
import { apiGetStudentGradesForParent, StudentParentGradeReport } from "@/services/api";
import { Button } from "@/components/ui/button";

export default function WaliNilai() {
  const { user } = useAuth();
  const student = user?.student_data;

  const [semester, setSemester] = useState<"ganjil" | "genap">("ganjil");
  const [year, setYear] = useState<number>(2024);
  const [report, setReport] = useState<StudentParentGradeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (!student?.id) return;
    const fetchGrades = async () => {
      setLoading(true);
      try {
        const res = await apiGetStudentGradesForParent(student.id, semester, year);
        if (res.success && res.data) {
          setReport(res.data);
        }
      } catch (err) {
        console.error("Gagal memuat nilai siswa:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [student?.id, semester, year]);

  const handlePrintRapor = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  if (loading && !report) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3 text-slate-400">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium">Memuat Laporan Capaian Nilai Siswa...</p>
      </div>
    );
  }

  const subjects = report?.subjects || [];
  const highestSubject = [...subjects].sort((a, b) => b.nilaiAkhir - a.nilaiAkhir)[0];
  const lowestSubject = [...subjects].sort((a, b) => a.nilaiAkhir - b.nilaiAkhir)[0];

  return (
    <div className="space-y-4 pb-8">
      {/* 1. HEADER HALAMAN & SELECTOR SEMESTER */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Laporan Hasil Belajar
              </h2>
              <p className="text-[11px] text-slate-500">
                Kurikulum Merdeka • {report?.tahunAjaran || "2024/2025"}
              </p>
            </div>
          </div>

          {/* Tombol Cetak e-Rapor */}
          <button
            onClick={handlePrintRapor}
            disabled={isPrinting}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl border border-blue-200 transition-colors cursor-pointer"
            title="Cetak Laporan Rapor"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>e-Rapor</span>
          </button>
        </div>

        {/* Tab Pilihan Semester */}
        <div className="mt-3.5 grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSemester("ganjil")}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              semester === "ganjil"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Semester 1 (Ganjil)
          </button>
          <button
            type="button"
            onClick={() => setSemester("genap")}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              semester === "genap"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Semester 2 (Genap)
          </button>
        </div>
      </div>

      {/* 2. KARTU RANGKUMAN PRESTASI & KETUNTASAN */}
      <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-blue-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider flex items-center">
              <Award className="w-3.5 h-3.5 mr-1 text-yellow-300" />
              Capaian Akademik Ananda
            </span>
            <span className="bg-emerald-400/25 border border-emerald-300/30 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-300" />
              {report?.statusKetuntasan || "Tuntas"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-white/10 my-2">
            <div>
              <span className="text-[10px] text-blue-200/80 block">Rata-rata Nilai</span>
              <span className="text-2xl font-black text-white tracking-tight">
                {report?.rataRataNilai?.toFixed(1) || "84.5"}
              </span>
              <span className="text-[9px] text-blue-200 block">Skala 100</span>
            </div>
            <div className="border-x border-white/10 px-1">
              <span className="text-[10px] text-blue-200/80 block">Peringkat Kelas</span>
              <span className="text-2xl font-black text-amber-300 tracking-tight">
                #{report?.ranking || 3}
              </span>
              <span className="text-[9px] text-blue-200 block">
                dari {report?.totalSiswaKelas || 32} siswa
              </span>
            </div>
            <div>
              <span className="text-[10px] text-blue-200/80 block">Kehadiran</span>
              <span className="text-2xl font-black text-emerald-300 tracking-tight">
                {report?.presensi.persentaseHadir || 98}%
              </span>
              <span className="text-[9px] text-blue-200 block">S: {report?.presensi.sakit} • I: {report?.presensi.izin} • A: {report?.presensi.alpa}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-blue-100/90">
            <span>Standar KKTP Sekolah: <strong>{report?.kktpStandar || 75}</strong></span>
            <span>Wali Kelas: <strong>{report?.student.wali_kelas || "Wali Kelas"}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. HIGHLIGHT MATA PELAJARAN UNGGULAN & PERHATIAN */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3">
          <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-bold mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Nilai Tertinggi</span>
          </div>
          <p className="text-xs font-extrabold text-slate-800 truncate">
            {highestSubject?.name || "Matematika"}
          </p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-slate-500 font-medium">Nilai Akhir:</span>
            <span className="text-sm font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
              {highestSubject?.nilaiAkhir || 92} ({highestSubject?.predikat || "A"})
            </span>
          </div>
        </div>

        <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3">
          <div className="flex items-center space-x-1.5 text-blue-700 text-xs font-bold mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Total Mapel</span>
          </div>
          <p className="text-xs font-extrabold text-slate-800">
            {subjects.length} Mata Pelajaran
          </p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-slate-500 font-medium">Status KKTP:</span>
            <span className="text-[11px] font-bold text-blue-800 bg-white px-2 py-0.5 rounded-md border border-blue-200">
              Semua Tuntas
            </span>
          </div>
        </div>
      </div>

      {/* 4. DAFTAR MATA PELAJARAN LENGKAP */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Rincian Nilai Mata Pelajaran
            </h3>
            <p className="text-[11px] text-slate-500">
              Ketuk untuk melihat uraian capaian kompetensi
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            KKTP: {report?.kktpStandar || 75}
          </span>
        </div>

        <div className="space-y-2">
          {subjects.map((sub) => {
            const isSelected = selectedSubject?.code === sub.code;
            const isPassing = sub.nilaiAkhir >= sub.kktp;

            return (
              <div
                key={sub.code}
                onClick={() => setSelectedSubject(isSelected ? null : sub)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-50/60 border-blue-300 ring-1 ring-blue-400/20 shadow-xs"
                    : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {sub.name}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                        sub.predikat === "A"
                          ? "bg-emerald-100 text-emerald-800"
                          : sub.predikat === "B"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        Predikat {sub.predikat}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-1">
                      <span>Formatif: <strong>{sub.rataFormatif}</strong></span>
                      <span>•</span>
                      <span>STS: <strong>{sub.sts}</strong></span>
                      <span>•</span>
                      <span>SAS: <strong>{sub.sas}</strong></span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[9px] text-slate-400 uppercase block font-semibold">
                      Nilai Akhir
                    </span>
                    <span className={`text-base font-black ${
                      isPassing ? "text-slate-900" : "text-rose-600"
                    }`}>
                      {sub.nilaiAkhir}
                    </span>
                  </div>
                </div>

                {/* Expanded Deskripsi Capaian Pembelajaran (Kurikulum Merdeka) */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 text-[11px] space-y-2 animate-in fade-in duration-150">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center">
                        <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
                        Capaian Tertinggi
                      </span>
                      <p className="text-slate-700 leading-relaxed">
                        {sub.capaianTertinggi}
                      </p>
                    </div>

                    {sub.perluPeningkatan && (
                      <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1 text-amber-700" />
                          Perlu Peningkatan
                        </span>
                        <p className="text-slate-700 leading-relaxed">
                          {sub.perluPeningkatan}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. CATATAN PEMBINAAN WALI KELAS */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center space-x-2 text-indigo-700">
          <BookOpen className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Catatan Wali Kelas
          </h3>
        </div>
        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-slate-700 leading-relaxed italic">
          "{report?.catatanWaliKelas || "Ananda menunjukkan semangat belajar dan kedisiplinan yang sangat baik. Pertahankan prestasi dan keaktifan di kelas."}"
        </div>
        <div className="text-right text-[11px] text-slate-500 font-medium">
          — <strong>{report?.student.wali_kelas || "Wali Kelas"}</strong> (NIP. {report?.student.nip_wali_kelas || "-"})
        </div>
      </div>

      {/* ========================================================= */}
      {/* PRINT AREA: LEMBAR LAPORAN e-RAPOR RESMI (PDF READY)    */}
      {/* ========================================================= */}
      <div id="print-area" className="hidden">
        <div className="p-8 max-w-2xl mx-auto bg-white text-slate-900 font-sans space-y-6">
          {/* Kop Sekolah */}
          <div className="flex items-center space-x-4 border-b-2 border-slate-900 pb-3">
            {report?.schoolSettings?.logoSekolah ? (
              <img 
                src={report.schoolSettings.logoSekolah} 
                alt="Logo" 
                className="w-14 h-14 object-contain" 
              />
            ) : (
              <School className="w-12 h-12 text-slate-800" />
            )}
            <div className="flex-1 text-center">
              <h1 className="text-base font-black uppercase tracking-wide">
                {report?.schoolSettings?.schoolName || "SMP NEGERI 1 NUSANTARA"}
              </h1>
              <p className="text-xs text-slate-600">
                {report?.schoolSettings?.address || "Jl. Pendidikan No. 123, Kota Pelajar"}
              </p>
              <p className="text-[11px] font-bold text-slate-800 uppercase mt-0.5">
                LAPORAN HASIL BELAJAR (RAPOR) SISWA — {report?.kurikulum || "KURIKULUM MERDEKA"}
              </p>
            </div>
          </div>

          {/* Data Identitas Siswa */}
          <div className="grid grid-cols-2 gap-4 text-xs py-1 border-b border-slate-300">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Siswa:</span>
                <span className="font-bold">{report?.student.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NIS / NISN:</span>
                <span className="font-mono">{report?.student.nis} / {report?.student.nisn}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Kelas:</span>
                <span className="font-bold">{report?.student.kelas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Semester / Tahun:</span>
                <span>{report?.semesterTitle} • {report?.tahunAjaran}</span>
              </div>
            </div>
          </div>

          {/* Tabel Nilai */}
          <table className="w-full text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-center font-bold">
                <th className="border border-slate-300 p-1.5 w-8">No</th>
                <th className="border border-slate-300 p-1.5 text-left">Mata Pelajaran</th>
                <th className="border border-slate-300 p-1.5 w-12">KKTP</th>
                <th className="border border-slate-300 p-1.5 w-12">Formatif</th>
                <th className="border border-slate-300 p-1.5 w-12">STS</th>
                <th className="border border-slate-300 p-1.5 w-12">SAS</th>
                <th className="border border-slate-300 p-1.5 w-14">Nilai Akhir</th>
                <th className="border border-slate-300 p-1.5 w-12">Predikat</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, idx) => (
                <tr key={s.code} className="text-center">
                  <td className="border border-slate-300 p-1">{idx + 1}</td>
                  <td className="border border-slate-300 p-1 text-left font-medium">{s.name}</td>
                  <td className="border border-slate-300 p-1">{s.kktp}</td>
                  <td className="border border-slate-300 p-1">{s.rataFormatif}</td>
                  <td className="border border-slate-300 p-1">{s.sts}</td>
                  <td className="border border-slate-300 p-1">{s.sas}</td>
                  <td className="border border-slate-300 p-1 font-bold">{s.nilaiAkhir}</td>
                  <td className="border border-slate-300 p-1 font-bold">{s.predikat}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Rangkuman dan Presensi */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="border border-slate-300 rounded p-2.5 space-y-1">
              <p className="font-bold border-b border-slate-200 pb-1">Rekap Nilai</p>
              <div className="flex justify-between">
                <span>Rata-rata Nilai:</span>
                <span className="font-bold">{report?.rataRataNilai}</span>
              </div>
              <div className="flex justify-between">
                <span>Peringkat Kelas:</span>
                <span className="font-bold">Ke-{report?.ranking} dari {report?.totalSiswaKelas}</span>
              </div>
              <div className="flex justify-between">
                <span>Status Kelulusan:</span>
                <span className="font-bold text-emerald-700">{report?.statusKetuntasan}</span>
              </div>
            </div>

            <div className="border border-slate-300 rounded p-2.5 space-y-1">
              <p className="font-bold border-b border-slate-200 pb-1">Ketidakhadiran</p>
              <div className="flex justify-between">
                <span>Sakit:</span>
                <span>{report?.presensi.sakit} hari</span>
              </div>
              <div className="flex justify-between">
                <span>Izin:</span>
                <span>{report?.presensi.izin} hari</span>
              </div>
              <div className="flex justify-between">
                <span>Tanpa Keterangan:</span>
                <span>{report?.presensi.alpa} hari</span>
              </div>
            </div>
          </div>

          {/* Pengesahan */}
          <div className="grid grid-cols-2 gap-4 text-center text-xs pt-6">
            <div>
              <p className="text-slate-500 mb-12">Mengetahui,<br/>Orang Tua / Wali Murid</p>
              <p className="font-bold underline">( ............................................ )</p>
            </div>
            <div>
              <p className="text-slate-500 mb-12">Wali Kelas,</p>
              <p className="font-bold underline">{report?.student.wali_kelas}</p>
              <p className="text-[10px] text-slate-500">NIP. {report?.student.nip_wali_kelas}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
