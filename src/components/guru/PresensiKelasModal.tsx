import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { JadwalPelajaran, PresensiMengajar } from "@/types";
import { 
  Camera, 
  X, 
  RotateCw, 
  Check, 
  AlertCircle, 
  Loader2, 
  BookOpen, 
  Sparkles,
  Users,
  Clock,
  ShieldCheck,
  RefreshCw,
  Upload
} from "lucide-react";

interface PresensiKelasModalProps {
  isOpen: boolean;
  onClose: () => void;
  jadwal: JadwalPelajaran & { presensi?: PresensiMengajar | null };
  guruName: string;
  guruNip?: string;
  guruId: string;
  onSuccess: () => void;
  onSubmit: (payload: {
    jadwal_id: string;
    guru_id: string;
    guru_nama: string;
    nip?: string;
    kelas_id: string;
    kelas_nama: string;
    mata_pelajaran: string;
    jam_jadwal: string;
    topik_materi: string;
    foto_kbm: string;
    catatan_khusus?: string;
    jumlah_hadir_siswa?: number;
    total_siswa?: number;
  }) => Promise<{ success: boolean; message: string }>;
}

export default function PresensiKelasModal({
  isOpen,
  onClose,
  jadwal,
  guruName,
  guruNip = "198001012005011001",
  guruId,
  onSuccess,
  onSubmit
}: PresensiKelasModalProps) {
  const [topikMateri, setTopikMateri] = useState("");
  const [catatan, setCatatan] = useState("");
  const [jumlahHadir, setJumlahHadir] = useState<number>(32);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment"); // Default ke kamera belakang untuk foto kelas
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inisialisasi kamera saat modal terbuka
  const startCamera = useCallback(async (facing: "user" | "environment") => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 960 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn("Gagal membuka kamera:", err);
      setCameraError("Kamera tidak dapat diakses atau izin ditolak. Anda juga dapat menggunakan tombol 'Upload Foto' di bawah.");
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      setTopikMateri("");
      setCatatan("");
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, startCamera, stopCamera]);

  // Fungsi menggambar watermark resmi di atas foto
  const applyWatermark = (sourceImgOrVideo: HTMLVideoElement | HTMLImageElement, width: number, height: number): string => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // 1. Gambar foto utama
    ctx.drawImage(sourceImgOrVideo, 0, 0, width, height);

    // 2. Format Waktu Nyata
    const now = new Date();
    const dateFormatted = now.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    const timeFormatted = now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }) + " WIB";

    // 3. Overlay kotak watermark di bagian bawah (Semi-transparan gelap modern)
    const boxHeight = Math.max(130, Math.round(height * 0.22));
    const startY = height - boxHeight;

    const gradient = ctx.createLinearGradient(0, startY, 0, height);
    gradient.addColorStop(0, "rgba(15, 23, 42, 0.82)");
    gradient.addColorStop(1, "rgba(2, 6, 23, 0.96)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, startY, width, boxHeight);

    // Garis aksen biru di atas kotak
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(0, startY, width, 4);

    // 4. Tulisan Watermark
    ctx.textBaseline = "top";
    
    // Badge KBM
    const badgeText = "✓ BUKTI KBM RESMI DI KELAS";
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(badgeText, 20, startY + 14);

    // Judul Mapel & Kelas
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = "#ffffff";
    const titleText = `${jadwal.mata_pelajaran.toUpperCase()} — ${jadwal.kelas_nama}`;
    ctx.fillText(titleText, 20, startY + 34);

    // Guru & NIP
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`Pengampu: ${guruName} (NIP: ${guruNip})`, 20, startY + 60);

    // Waktu & Jam Jadwal
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`Waktu Presensi: ${dateFormatted} • ${timeFormatted}`, 20, startY + 80);
    ctx.fillText(`Jadwal Resmi: ${jadwal.hari}, ${jadwal.jam_mulai} - ${jadwal.jam_selesai} WIB`, 20, startY + 98);

    // Footer Watermark sebelah kanan
    ctx.textAlign = "right";
    ctx.font = "italic 11px sans-serif";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText("Validasi KBM Digital", width - 20, startY + 14);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText("Status: Otentik di Ruang Kelas", width - 20, startY + 32);
    ctx.textAlign = "left";

    return canvas.toDataURL("image/jpeg", 0.88);
  };

  // Tangkap Foto dari Kamera Video
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const stampedPhoto = applyWatermark(video, width, height);
    setCapturedPhoto(stampedPhoto);
    stopCamera();
  };

  // Switch Kamera Depan/Belakang
  const handleToggleFacing = () => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
  };

  // Ulangi Foto
  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera(facingMode);
  };

  // Unggah Foto Alternatif (Jika kamera browser tidak bisa)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const stamped = applyWatermark(img, img.width, img.height);
        setCapturedPhoto(stamped);
        stopCamera();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submit Presensi KBM
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedPhoto) {
      alert("Silakan ambil foto suasana KBM di kelas terlebih dahulu.");
      return;
    }
    if (!topikMateri.trim()) {
      alert("Harap isi topik materi atau jurnal singkat KBM hari ini.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmit({
        jadwal_id: jadwal.id,
        guru_id: guruId,
        guru_nama: guruName,
        nip: guruNip,
        kelas_id: jadwal.kelas_id,
        kelas_nama: jadwal.kelas_nama,
        mata_pelajaran: jadwal.mata_pelajaran,
        jam_jadwal: `${jadwal.jam_mulai} - ${jadwal.jam_selesai}`,
        topik_materi: topikMateri.trim(),
        foto_kbm: capturedPhoto,
        catatan_khusus: catatan.trim(),
        jumlah_hadir_siswa: jumlahHadir
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menyimpan presensi mengajar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 pb-6 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[90vh]">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-4 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Presensi Mengajar di Kelas (KBM)</h2>
              <p className="text-xs text-blue-100 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 inline" /> Foto Bukti Kelas + Jurnal • Tanpa GPS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ringkasan Jadwal Saat Ini */}
        <div className="bg-blue-50/80 px-4 py-2.5 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-900 bg-blue-200/80 px-2 py-0.5 rounded-md">
              {jadwal.kelas_nama}
            </span>
            <span className="font-semibold text-slate-800">
              {jadwal.mata_pelajaran}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{jadwal.jam_mulai} - {jadwal.jam_selesai} WIB</span>
          </div>
        </div>

        {/* Content Form & Kamera */}
        <form id="form-presensi-kbm" onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {/* Kamera Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  1. Foto Bukti KBM di Kelas (Watermark Otomatis)
                </label>
                {!capturedPhoto && isCameraActive && (
                  <button
                    type="button"
                    onClick={handleToggleFacing}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                  >
                    <RotateCw className="w-3 h-3" />
                    {facingMode === "user" ? "Kamera Belakang (Kelas)" : "Kamera Depan (Selfie)"}
                  </button>
                )}
              </div>

              {/* Viewport Kamera / Hasil Foto */}
              <div className="relative w-full aspect-4/3 bg-slate-950 rounded-xl overflow-hidden border border-slate-300 shadow-inner flex items-center justify-center">
                {capturedPhoto ? (
                  // Tampilan foto yang sudah diambil lengkap dengan watermark
                  <div className="relative w-full h-full">
                    <img
                      src={capturedPhoto}
                      alt="Bukti KBM Watermarked"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Watermark Terpasang
                    </div>
                  </div>
                ) : (
                  // Viewfinder Video Kamera
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-900/90 p-4 text-center flex flex-col items-center justify-center text-slate-200">
                      <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
                      <p className="text-xs text-slate-300 mb-3 max-w-xs">{cameraError}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white text-slate-900 border-none hover:bg-slate-100 text-xs"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" /> Pilih Foto dari Galeri / Kamera
                      </Button>
                    </div>
                  )}

                  {/* Garis Bantu Pembidik (Grid Overlay) */}
                  {!cameraError && (
                    <div className="absolute inset-0 pointer-events-none border border-white/20 grid grid-cols-3 grid-rows-3 opacity-40">
                      <div className="border border-white/20"></div>
                      <div className="border border-white/20"></div>
                      <div className="border border-white/20"></div>
                      <div className="border border-white/20"></div>
                      <div className="border border-white/20"></div>
                      <div className="border border-white/20"></div>
                      <div className="border border-white/20"></div>
                      <div className="border border-white/20"></div>
                      <div className="border border-white/20"></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tombol Kontrol Kamera */}
            <div className="mt-2.5 flex items-center justify-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />

              {capturedPhoto ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRetake}
                  className="w-full text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Ambil Ulang Foto
                </Button>
              ) : (
                <div className="flex gap-2 w-full">
                  <Button
                    type="button"
                    onClick={handleCapture}
                    disabled={!isCameraActive}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-lg shadow-sm"
                  >
                    <Camera className="w-4 h-4 mr-1.5" /> Jepret Foto KBM
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    title="Unggah Foto dari Perangkat"
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 px-3"
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 italic">
              *Ambil foto suasana depan kelas / papan tulis / siswa saat jam belajar dimulai.
            </p>
          </div>

          {/* Jurnal KBM (Topik Materi) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>2. Topik / Materi Pembelajaran (Jurnal KBM) *</span>
              <span className="text-[10px] text-blue-600 font-normal">Wajib diisi</span>
            </label>
            <input
              type="text"
              required
              value={topikMateri}
              onChange={(e) => setTopikMateri(e.target.value)}
              placeholder="Contoh: Bab 2 - Sistem Persamaan Linier Dua Variabel (SPLDV)"
              className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>

          {/* Opsi Tambahan: Kehadiran Siswa di Jam Ini & Catatan Khusus */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                Jumlah Siswa Hadir di Jam Ini
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={jumlahHadir}
                onChange={(e) => setJumlahHadir(Number(e.target.value))}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Catatan Singkat Kelas (Opsional)
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: 1 siswa izin ke UKS"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>
        </div>

          {/* Sticky/Fixed Footer Action Buttons - Selalu terlihat dan di atas navbar */}
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-end gap-2.5 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-200/60 font-medium px-4 py-2"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !capturedPhoto || !topikMateri.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan Bukti KBM...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Simpan Presensi Masuk Kelas
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
