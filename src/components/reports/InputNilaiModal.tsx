import React, { useState, useEffect } from "react";
import { 
  X, 
  Save, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  BookOpen, 
  UserCheck, 
  Calculator,
  HelpCircle
} from "lucide-react";
import { 
  STANDARD_SUBJECTS, 
  calculateGradePredicate, 
  apiSaveStudentSubjectGrades,
  ClassGradeLegerReport 
} from "@/services/api";
import { Button } from "@/components/ui/button";

interface InputNilaiModalProps {
  isOpen: boolean;
  onClose: () => void;
  classReport: ClassGradeLegerReport;
  token: string;
  onSaved: () => void;
  defaultSubjectCode?: string;
}

interface StudentGradeInput {
  formatif1: number;
  formatif2: number;
  sts: number;
  sas: number;
  capaianTertinggi: string;
  perluPeningkatan: string;
}

export default function InputNilaiModal({
  isOpen,
  onClose,
  classReport,
  token,
  onSaved,
  defaultSubjectCode
}: InputNilaiModalProps) {
  const [selectedSubjectCode, setSelectedSubjectCode] = useState(
    defaultSubjectCode || STANDARD_SUBJECTS[0].code
  );
  const [grades, setGrades] = useState<Record<string, StudentGradeInput>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currentSubject = STANDARD_SUBJECTS.find(s => s.code === selectedSubjectCode) || STANDARD_SUBJECTS[0];

  // Initialize grades from report
  useEffect(() => {
    if (classReport && classReport.students) {
      const initialMap: Record<string, StudentGradeInput> = {};
      classReport.students.forEach(st => {
        const existing = st.subjectGrades[selectedSubjectCode];
        if (existing) {
          initialMap[st.id] = {
            formatif1: existing.formatif1,
            formatif2: existing.formatif2,
            sts: existing.sts,
            sas: existing.sas,
            capaianTertinggi: existing.capaianTertinggi || `Menguasai materi utama ${currentSubject.name} dengan baik`,
            perluPeningkatan: existing.perluPeningkatan || ""
          };
        } else {
          initialMap[st.id] = {
            formatif1: 80,
            formatif2: 80,
            sts: 80,
            sas: 80,
            capaianTertinggi: `Menguasai materi utama ${currentSubject.name} dengan baik`,
            perluPeningkatan: ""
          };
        }
      });
      setGrades(initialMap);
    }
  }, [classReport, selectedSubjectCode]);

  const handleInputChange = (studentId: string, field: "formatif1" | "formatif2" | "sts" | "sas", value: string) => {
    const num = Math.min(100, Math.max(0, Number(value) || 0));
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: num
      }
    }));
  };

  const handleTextChange = (studentId: string, field: "capaianTertinggi" | "perluPeningkatan", val: string) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val
      }
    }));
  };

  // Quick autofill preset (e.g. standard good score)
  const handleAutoFillPreset = () => {
    setGrades(prev => {
      const updated = { ...prev };
      classReport.students.forEach((st, idx) => {
        const base = Math.min(96, Math.max(74, 88 - (idx * 2)));
        updated[st.id] = {
          formatif1: base + 2,
          formatif2: base,
          sts: base - 1,
          sas: base + 1,
          capaianTertinggi: `Menunjukkan penguasaan optimal pada materi pokok ${currentSubject.name}`,
          perluPeningkatan: base < currentSubject.kktp ? `Perlu perbaikan tugas pada indikator pencapaian dasar` : ""
        };
      });
      return updated;
    });
    setSuccessMsg("Preset nilai otomatis berhasil diisikan.");
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const gradePayload = (Object.entries(grades) as [string, StudentGradeInput][]).map(([studentId, val]) => ({
        studentId,
        formatif1: val.formatif1,
        formatif2: val.formatif2,
        sts: val.sts,
        sas: val.sas,
        capaianTertinggi: val.capaianTertinggi,
        perluPeningkatan: val.perluPeningkatan
      }));

      const semester = classReport.semester.toLowerCase().includes("ganjil") ? "ganjil" : "genap";
      const res = await apiSaveStudentSubjectGrades(
        token,
        classReport.classId,
        selectedSubjectCode,
        semester as any,
        classReport.tahun,
        gradePayload
      );

      if (res.success) {
        setSuccessMsg(`Nilai mata pelajaran ${currentSubject.name} berhasil disimpan!`);
        onSaved();
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Calculator className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Input & Penilaian KBM Mata Pelajaran</h3>
              <p className="text-xs text-blue-200 mt-0.5">
                {classReport.className} • {classReport.semester} • TP {classReport.tahunAjaran}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOOLBAR PILIH MAPEL & FORMULA */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Mata Pelajaran</label>
              <select
                value={selectedSubjectCode}
                onChange={(e) => setSelectedSubjectCode(e.target.value)}
                className="text-xs font-bold bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-600 shadow-xs min-w-[220px]"
              >
                {STANDARD_SUBJECTS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name} (KKTP: {s.kktp})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-900">
              <span className="font-bold">KKTP: </span>
              <span className="font-mono font-black text-blue-700">{currentSubject.kktp}</span>
              <span className="mx-2 text-blue-300">•</span>
              <span className="text-gray-600">Guru: </span>
              <span className="font-semibold">{currentSubject.guruPengampu}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleAutoFillPreset}
              className="px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl text-xs font-semibold border border-amber-200 flex items-center space-x-1.5 transition active:scale-95"
              title="Isi nilai realistis otomatis untuk demonstrasi cepat"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Isi Nilai Contoh</span>
            </button>
          </div>
        </div>

        {/* FORMULA INFO BANNER */}
        <div className="px-4 py-2 bg-indigo-50/70 border-b border-indigo-100 text-[11px] text-indigo-900 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              <strong>Rumus Nilai Akhir (NA):</strong> NA = [ (Rata-rata Formatif × 2) + STS + SAS ] / 4
            </span>
          </div>
          <span className="text-indigo-700 font-semibold hidden sm:inline">
            A (≥90) • B (≥80) • C (≥73) • D (&lt;73)
          </span>
        </div>

        {successMsg && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TABEL INPUT NILAI */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-center">
                  <th className="p-2.5 w-10">No</th>
                  <th className="p-2.5 text-left">Nama Siswa & NIS</th>
                  <th className="p-2 w-20" title="Formatif 1 (Tugas / TP 1)">Formatif 1</th>
                  <th className="p-2 w-20" title="Formatif 2 (Tugas / TP 2)">Formatif 2</th>
                  <th className="p-2 w-20" title="Sumatif Tengah Semester">STS</th>
                  <th className="p-2 w-20" title="Sumatif Akhir Semester">SAS</th>
                  <th className="p-2 w-16" title="Nilai Akhir">NA</th>
                  <th className="p-2 w-16">Predikat</th>
                  <th className="p-2 text-left min-w-[200px]">Capaian Kompetensi Tertinggi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {classReport.students.map((st, idx) => {
                  const val = grades[st.id] || { formatif1: 0, formatif2: 0, sts: 0, sas: 0, capaianTertinggi: "", perluPeningkatan: "" };
                  const rataF = Math.round(((val.formatif1 + val.formatif2) / 2) * 10) / 10;
                  const na = Math.round((rataF * 2 + val.sts + val.sas) / 4);
                  const predikat = calculateGradePredicate(na);
                  const isBelow = na < currentSubject.kktp;

                  return (
                    <tr key={st.id} className={idx % 2 === 1 ? "bg-gray-50/50" : "bg-white"}>
                      <td className="p-2 text-center text-gray-500 font-medium">{idx + 1}</td>
                      <td className="p-2">
                        <div className="font-bold text-gray-900 leading-tight">{st.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">NIS: {st.nis}</div>
                      </td>
                      <td className="p-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={val.formatif1}
                          onChange={(e) => handleInputChange(st.id, "formatif1", e.target.value)}
                          className="w-16 p-1.5 text-center font-mono text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white"
                        />
                      </td>
                      <td className="p-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={val.formatif2}
                          onChange={(e) => handleInputChange(st.id, "formatif2", e.target.value)}
                          className="w-16 p-1.5 text-center font-mono text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white"
                        />
                      </td>
                      <td className="p-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={val.sts}
                          onChange={(e) => handleInputChange(st.id, "sts", e.target.value)}
                          className="w-16 p-1.5 text-center font-mono text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white"
                        />
                      </td>
                      <td className="p-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={val.sas}
                          onChange={(e) => handleInputChange(st.id, "sas", e.target.value)}
                          className="w-16 p-1.5 text-center font-mono text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <span className={`font-black font-mono text-xs px-2 py-1 rounded-md ${
                          isBelow 
                            ? "bg-rose-100 text-rose-800" 
                            : "bg-blue-50 text-blue-900"
                        }`}>
                          {na}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          predikat === "A" ? "bg-emerald-100 text-emerald-800" :
                          predikat === "B" ? "bg-blue-100 text-blue-800" :
                          predikat === "C" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {predikat}
                        </span>
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={val.capaianTertinggi}
                          onChange={(e) => handleTextChange(st.id, "capaianTertinggi", e.target.value)}
                          className="w-full p-1.5 text-[11px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white"
                          placeholder="Deskripsi capaian kompetensi..."
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Nilai yang disimpan akan langsung terakumulasi pada Buku Leger Nilai & Ranking Kelas.
          </p>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-semibold rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Nilai ({currentSubject.code})</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
