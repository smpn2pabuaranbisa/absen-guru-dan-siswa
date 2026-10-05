import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/useAuth";
import { apiSubmitLeave } from "@/services/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, UploadCloud, AlertCircle, CheckCircle2 } from "lucide-react";

export default function MobileIzinSakit() {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [step, setStep] = useState<"form" | "submitting" | "success">("form");
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [jenis, setJenis] = useState<"izin" | "sakit">("izin");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [alasan, setAlasan] = useState("");
  const [lampiran, setLampiran] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran file maksimal 5MB");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLampiran(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (!tanggalMulai || !tanggalSelesai || !alasan) {
      setError("Harap lengkapi semua field yang wajib.");
      return;
    }

    if (new Date(tanggalSelesai) < new Date(tanggalMulai)) {
      setError("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    setStep("submitting");
    setError(null);

    try {
      const res = await apiSubmitLeave(token, {
        jenis,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        alasan,
        lampiran
      });

      if (res.success) {
        setStep("success");
      } else {
        setError(res.message);
        setStep("form");
      }
    } catch (err) {
      setError("Gagal terhubung ke server.");
      setStep("form");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-4 py-4 border-b border-gray-200 flex items-center shadow-sm">
        <button onClick={() => navigate("/guru/home")} className="p-2 -ml-2 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 ml-2">Pengajuan Izin / Sakit</h1>
      </header>

      <main className="flex-1 flex flex-col p-4 relative overflow-y-auto pb-24">
        {error && step === "form" && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start space-x-3 mb-6 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm leading-snug">{error}</p>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-5">
              {/* Jenis Pengajuan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Pengajuan</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setJenis("izin")}
                    className={`py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors ${
                      jenis === "izin" 
                        ? "bg-blue-50 border-blue-600 text-blue-700" 
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Izin
                  </button>
                  <button
                    type="button"
                    onClick={() => setJenis("sakit")}
                    className={`py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors ${
                      jenis === "sakit" 
                        ? "bg-blue-50 border-blue-600 text-blue-700" 
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Sakit
                  </button>
                </div>
              </div>

              {/* Tanggal Mulai & Selesai */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mulai</label>
                  <input 
                    type="date" 
                    required
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selesai</label>
                  <input 
                    type="date" 
                    required
                    value={tanggalSelesai}
                    onChange={(e) => setTanggalSelesai(e.target.value)}
                    min={tanggalMulai}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                  />
                </div>
              </div>

              {/* Alasan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alasan</label>
                <textarea 
                  required
                  rows={3}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Tuliskan keterangan..."
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" 
                ></textarea>
              </div>

              {/* Lampiran */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lampiran (Opsional)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50 hover:bg-gray-100 transition relative">
                  <div className="space-y-1 text-center">
                    <UploadCloud className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                        <span>{fileName ? "Ganti file" : "Upload dokumen/foto"}</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*,.pdf" onChange={handleFileChange} />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">{fileName ? fileName : "PNG, JPG, PDF up to 5MB"}</p>
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base shadow-sm">
              Kirim Pengajuan
            </Button>
          </form>
        )}

        {/* STEP SUBMITTING */}
        {step === "submitting" && (
          <div className="flex flex-col flex-1 items-center justify-center space-y-4 h-[60vh]">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-gray-600 font-medium animate-pulse">Mengirim pengajuan...</p>
          </div>
        )}

        {/* STEP SUCCESS */}
        {step === "success" && (
          <div className="flex flex-col flex-1 items-center justify-center space-y-6 text-center h-[60vh]">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Pengajuan Terkirim</h2>
              <p className="text-gray-500 mt-2 max-w-[250px] mx-auto">
                Pengajuan {jenis} Anda berhasil dikirim dan sedang <span className="font-semibold text-yellow-600">Menunggu</span> persetujuan admin.
              </p>
            </div>
            <Button onClick={() => navigate("/guru/home")} className="mt-8 px-8 h-12">
              Kembali ke Beranda
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
