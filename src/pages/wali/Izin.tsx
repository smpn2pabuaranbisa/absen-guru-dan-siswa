import React, { useState } from "react";
import { 
  FileText, 
  Send, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Clock,
  Check
} from "lucide-react";
import { useAuth } from "@/store/useAuth";
import { apiSubmitParentLeave } from "@/services/api";

export default function WaliIzin() {
  const { user } = useAuth();
  const student = user?.student_data;

  const [jenis, setJenis] = useState<"izin" | "sakit">("izin");
  const [tglMulai, setTglMulai] = useState(new Date().toISOString().split("T")[0]);
  const [tglSelesai, setTglSelesai] = useState(new Date().toISOString().split("T")[0]);
  const [alasan, setAlasan] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Past leave history submitted by parent
  const [pastLeaves, setPastLeaves] = useState([
    {
      id: "PL-01",
      jenis: "izin",
      tglMulai: "09 Sep 2026",
      tglSelesai: "09 Sep 2026",
      alasan: "Menghadiri acara pernikahan keluarga di luar kota.",
      status: "Disetujui",
      verifiedBy: "Bpk. Ahmad Guru (Wali Kelas)"
    }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student?.id || !alasan.trim()) return;

    setLoading(true);
    setSuccessMsg(null);

    try {
      const res = await apiSubmitParentLeave(student.id, {
        jenis,
        tanggal_mulai: tglMulai,
        tanggal_selesai: tglSelesai,
        alasan,
        lampiran: fileName || null
      });

      if (res.success) {
        setSuccessMsg(res.message);
        setPastLeaves([
          {
            id: `PL-${Date.now()}`,
            jenis,
            tglMulai,
            tglSelesai,
            alasan,
            status: "Menunggu Verifikasi",
            verifiedBy: "Wali Kelas"
          },
          ...pastLeaves
        ]);
        setAlasan("");
        setFileName("");
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-800">
          Pengajuan Izin / Sakit
        </h2>
        <p className="text-xs text-slate-500">
          Surat izin resmi dari orang tua untuk {student?.nama}
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl flex items-start space-x-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Permohonan Berhasil Dikirim!</p>
            <p className="mt-0.5 text-emerald-700">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Radio Jenis */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Jenis Permohonan
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setJenis("izin")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                  jenis === "izin"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Izin (Keperluan Keluarga)
              </button>
              <button
                type="button"
                onClick={() => setJenis("sakit")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                  jenis === "sakit"
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Sakit (Surat Dokter)
              </button>
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Mulai Tanggal
              </label>
              <input
                type="date"
                value={tglMulai}
                onChange={(e) => setTglMulai(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={tglSelesai}
                onChange={(e) => setTglSelesai(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          {/* Alasan */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Alasan / Keterangan
            </label>
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Jelaskan alasan izin atau kondisi sakit ananda..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-600 resize-none"
              required
            />
          </div>

          {/* Upload Lampiran */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Foto Surat Keterangan / Resep Dokter (Opsional)
            </label>
            <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
              <Upload className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-xs text-slate-600 font-medium">
                {fileName ? fileName : "Ketuk untuk upload foto surat"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFileName(e.target.files[0].name);
                  }
                }}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? "Mengirimkan Permohonan..." : "Kirim Surat Permohonan"}</span>
          </button>
        </form>
      </div>

      {/* Past Submissions */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
          Riwayat Pengajuan
        </h3>

        {pastLeaves.map((pl) => (
          <div
            key={pl.id}
            className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  pl.jenis === "sakit"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {pl.jenis}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  pl.status === "Disetujui"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {pl.status}
              </span>
            </div>

            <p className="text-xs text-slate-800 font-medium">{pl.alasan}</p>

            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{pl.tglMulai} s.d {pl.tglSelesai}</span>
              <span>{pl.verifiedBy}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
