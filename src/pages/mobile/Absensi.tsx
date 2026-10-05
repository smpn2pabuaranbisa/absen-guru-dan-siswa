import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/useAuth";
import { apiSubmitAttendance } from "@/services/api";
import { getDistance } from "@/lib/utils";
import { GpsTelemetry, GpsSecurityAudit, evaluateGpsSecurity } from "@/lib/gpsSecurity";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Camera, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Loader2, 
  User as UserIcon, 
  BadgeInfo, 
  Clock, 
  RefreshCcw, 
  UploadCloud,
  ShieldCheck,
  ShieldAlert,
  Radio
} from "lucide-react";

// Koordinat sekolah (SMPN 1 Nusantara)
const SCHOOL_LAT = -6.200000;
const SCHOOL_LNG = 106.816666;
const RADIUS_M = 50;

export default function MobileAbsensi() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  const typeParam = searchParams.get("type");
  const type = (typeParam === "pulang" ? "pulang" : "datang") as "datang" | "pulang";

  const [error, setError] = useState<string | null>(null);
  
  // Location & Anti-Fraud Telemetry states
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [telemetry, setTelemetry] = useState<GpsTelemetry | null>(null);
  const [securityAudit, setSecurityAudit] = useState<GpsSecurityAudit | null>(null);
  
  // Camera states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  
  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    let mounted = true;
    let localStream: MediaStream | null = null;

    const init = async () => {
      // 1. Get Location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!mounted) return;
            const coords = pos.coords;
            const userLat = coords.latitude;
            const userLng = coords.longitude;
            const accuracy = coords.accuracy || 12;
            const isMocked = Boolean((coords as any).isMocked);

            const telem: GpsTelemetry = {
              lat: userLat,
              lng: userLng,
              accuracy,
              altitude: coords.altitude,
              altitudeAccuracy: coords.altitudeAccuracy,
              heading: coords.heading,
              speed: coords.speed,
              timestamp: pos.timestamp || Date.now(),
              isMocked
            };

            setTelemetry(telem);
            setLoc({ lat: userLat, lng: userLng });

            const audit = evaluateGpsSecurity(telem, { lat: SCHOOL_LAT, lng: SCHOOL_LNG }, RADIUS_M);
            setSecurityAudit(audit);
            setDistance(audit.distanceMeters);

            if (!audit.isValid) {
              setError(audit.message);
            } else {
              setError(null);
            }
            setIsLocating(false);
          },
          (err) => {
            if (!mounted) return;
            console.warn("GPS Error:", err);
            setError("Gagal mendapatkan lokasi GPS satelit. Pastikan izin lokasi diberikan dan GPS aktif.");
            setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        setError("Browser perangkat Anda tidak mendukung fitur GPS.");
        setIsLocating(false);
      }

      // 2. Start Camera
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1280 } }, 
          audio: false 
        });
        if (!mounted) {
          localStream.getTracks().forEach(t => t.stop());
          return;
        }
        setStream(localStream);
      } catch (err) {
        if (!mounted) return;
        console.warn("Camera Error:", err);
        setError("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
      }
    };

    init();

    return () => {
      mounted = false;
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Connect stream to video element safely
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute("playsinline", "true");
      videoRef.current.play().catch(e => {
        if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
          console.warn("Video play error:", e);
        }
      });
    }
  }, [stream]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedPhoto(photoData);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleSubmit = async () => {
    if (!token || !user || !capturedPhoto) return;
    
    if (!loc) {
      setError("Lokasi GPS belum ditemukan. Harap tunggu atau periksa izin lokasi.");
      return;
    }

    if (securityAudit && !securityAudit.isValid) {
      setError(securityAudit.message);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiSubmitAttendance(
        token, 
        type, 
        loc.lat, 
        loc.lng, 
        capturedPhoto,
        telemetry ? {
          accuracy: telemetry.accuracy,
          isMocked: telemetry.isMocked,
          timestamp: telemetry.timestamp
        } : undefined
      );
      if (res.success) {
        stopCamera();
        setIsSuccess(true);
      } else {
        setError(res.message || "Gagal mencatat absensi.");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateLocation = () => {
    const telem: GpsTelemetry = {
      lat: SCHOOL_LAT,
      lng: SCHOOL_LNG,
      accuracy: 12,
      altitude: 20,
      timestamp: Date.now(),
      isMocked: false
    };
    setTelemetry(telem);
    setLoc({ lat: SCHOOL_LAT, lng: SCHOOL_LNG });
    const audit = evaluateGpsSecurity(telem, { lat: SCHOOL_LAT, lng: SCHOOL_LNG }, RADIUS_M);
    setSecurityAudit(audit);
    setDistance(0);
    setError(null);
  };

  const handleTestFakeGps = () => {
    const telem: GpsTelemetry = {
      lat: SCHOOL_LAT,
      lng: SCHOOL_LNG,
      accuracy: 10,
      timestamp: Date.now(),
      isMocked: true // Mock location flagged!
    };
    setTelemetry(telem);
    setLoc({ lat: SCHOOL_LAT, lng: SCHOOL_LNG });
    const audit = evaluateGpsSecurity(telem, { lat: SCHOOL_LAT, lng: SCHOOL_LNG }, RADIUS_M);
    setSecurityAudit(audit);
    setDistance(audit.distanceMeters);
    setError(audit.message);
  };

  const handleTestWeakSignal = () => {
    const telem: GpsTelemetry = {
      lat: SCHOOL_LAT,
      lng: SCHOOL_LNG,
      accuracy: 140, // 140m exceeds 50m
      timestamp: Date.now(),
      isMocked: false
    };
    setTelemetry(telem);
    setLoc({ lat: SCHOOL_LAT, lng: SCHOOL_LNG });
    const audit = evaluateGpsSecurity(telem, { lat: SCHOOL_LAT, lng: SCHOOL_LNG }, RADIUS_M);
    setSecurityAudit(audit);
    setDistance(audit.distanceMeters);
    setError(audit.message);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Absensi Berhasil!</h2>
          <p className="text-gray-500 mt-2 max-w-sm">
            Data kehadiran {type === "datang" ? "Masuk" : "Pulang"} Anda telah berhasil dicatat pada {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB.
          </p>
          <Button onClick={() => navigate("/guru/home")} className="mt-8 w-full max-w-xs h-12">
            Kembali ke Beranda
          </Button>
        </main>
      </div>
    );
  }

  const isFormReady = loc !== null && stream !== null;

  return (
    <div className="min-h-full bg-gray-100 flex flex-col">
      <header className="bg-white px-4 py-4 border-b border-gray-200 flex items-center shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate("/guru/home")} className="p-2 -ml-2 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 ml-2">
          Absen {type === "datang" ? "Masuk" : "Pulang"}
        </h1>
      </header>

      <main className="flex-1 p-4 pb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl flex items-start space-x-2.5 mb-3 shadow-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
            <p className="text-xs leading-snug font-medium">{error}</p>
          </div>
        )}

        {/* Compact User & GPS Info Bar */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-3 mb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-gray-900 truncate">{user?.name || "-"}</p>
              <p className="text-[11px] text-gray-500 font-mono">NIP: {user?.reference_id || "-"}</p>
            </div>
          </div>
          <div className="text-right shrink-0 pl-2">
            {isLocating ? (
              <span className="inline-flex items-center text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Cari GPS
              </span>
            ) : loc ? (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                securityAudit?.isValid
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                <MapPin className="w-3 h-3 mr-1 shrink-0" />
                {securityAudit?.isValid ? `±${distance}m (Satelit)` : `Ditolak (${distance}m)`}
              </span>
            ) : (
              <span className="text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded-md">GPS Mati</span>
            )}
          </div>
        </div>

        {/* Anti-Fraud GPS Telemetry & Shield Card */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-3 mb-3 space-y-2">
          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-gray-100">
            <div className="flex items-center space-x-1.5 font-semibold text-gray-800">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Proteksi Anti-Mock GPS</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              securityAudit?.isValid 
                ? "bg-emerald-100 text-emerald-800"
                : securityAudit?.isMockDetected
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"
            }`}>
              {securityAudit?.isValid ? "✓ Sinyal Asli Lolos" : securityAudit?.isMockDetected ? "🚨 Fake GPS Aktif" : "Sinyal Belum Valid"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-150">
              <div className="text-gray-500 flex items-center space-x-1">
                <Radio className="w-3 h-3 text-gray-400" />
                <span>Akurasi Satelit</span>
              </div>
              <div className="font-bold font-mono text-gray-900 mt-0.5">
                {securityAudit?.accuracyMeters ? `±${securityAudit.accuracyMeters} m` : "—"}
              </div>
              <div className="text-[10px] text-gray-500">
                Maksimal toleransi: 50m
              </div>
            </div>

            <div className="p-2 bg-gray-50 rounded-lg border border-gray-150">
              <div className="text-gray-500 flex items-center space-x-1">
                <ShieldAlert className="w-3 h-3 text-gray-400" />
                <span>Status Mock Location</span>
              </div>
              <div className="font-bold mt-0.5">
                {securityAudit?.isMockDetected ? (
                  <span className="text-red-600">Terdeteksi Tiruan</span>
                ) : (
                  <span className="text-emerald-600">Asli (Bukan Mock)</span>
                )}
              </div>
              <div className="text-[10px] text-gray-500">
                Pemeriksaan OS Perangkat
              </div>
            </div>
          </div>

          {/* Quick Simulation Testing Toolbar */}
          <div className="pt-1 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">Pengujian Keamanan:</span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleSimulateLocation}
                className="px-2 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded font-medium"
              >
                ⚡ Valid (Sekolah)
              </button>
              <button
                type="button"
                onClick={handleTestFakeGps}
                className="px-2 py-0.5 text-[10px] bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded font-medium"
              >
                🚨 Fake GPS
              </button>
              <button
                type="button"
                onClick={handleTestWeakSignal}
                className="px-2 py-0.5 text-[10px] bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded font-medium"
              >
                📡 Sinyal Lemah
              </button>
            </div>
          </div>
        </div>

        {/* Unified Camera & Action Box */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Foto Selfie Presensi</h2>
            {capturedPhoto ? (
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ✓ Foto Siap
              </span>
            ) : (
              <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5 animate-pulse"></span>
                Kamera Aktif
              </span>
            )}
          </div>

          {/* Camera Viewfinder (3:4 Portrait Ratio) */}
          <div className="relative w-full aspect-[3/4] max-h-[460px] mx-auto bg-gray-950 rounded-xl overflow-hidden shadow-inner border border-gray-200">
            {capturedPhoto ? (
              <img src={capturedPhoto} alt="Captured selfie" className="w-full h-full object-cover" />
            ) : (
              <>
                {!stream && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                    <Loader2 className="w-7 h-7 animate-spin mb-2 text-gray-400" />
                    <p className="text-xs">Menyiapkan kamera...</p>
                  </div>
                )}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className={`w-full h-full object-cover transition-opacity duration-500 ${stream ? 'opacity-100' : 'opacity-0'}`}
                />
                
                {/* Facial Guide Overlay */}
                {stream && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-64 rounded-full border-2 border-dashed border-white/40 shadow-sm"></div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Hidden canvas for capturing frame */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Tombol Aksi Tepat Menempel di Bawah Preview Foto */}
          <div className="mt-3">
            {capturedPhoto ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2.5">
                  <Button 
                    onClick={handleRetake} 
                    variant="outline" 
                    className="h-11 text-xs sm:text-sm font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                    disabled={isSubmitting}
                  >
                    <RefreshCcw className="w-4 h-4 mr-1.5 text-gray-500" />
                    Ulangi Foto
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || (securityAudit !== null && !securityAudit.isValid)}
                    className={`h-11 text-xs sm:text-sm font-bold shadow-sm rounded-xl transition-all text-white ${
                      type === "datang" 
                        ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300' 
                        : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 mr-1.5" />
                        Kirim Absen {type === "datang" ? "Masuk" : "Pulang"}
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-center text-emerald-600 font-medium">
                  Foto berhasil diambil. Ketuk "Kirim Absen" atau "Ulangi Foto".
                </p>
              </div>
            ) : (
              <div>
                <Button 
                  onClick={handleCapture} 
                  disabled={!isFormReady}
                  className={`w-full h-12 text-sm sm:text-base font-bold shadow-md rounded-xl transition-all text-white ${
                    type === "datang" 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Ambil Foto Sekarang
                </Button>
                <p className="text-[11px] text-center text-gray-400 mt-2">
                  Posisikan wajah Anda di dalam frame kamera lalu tekan tombol di atas.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Dev Only Bypass */}
        {(!loc || (distance !== null && distance > RADIUS_M)) && (
          <div className="mt-4 text-center">
            <button onClick={handleSimulateLocation} className="text-xs text-gray-400 underline hover:text-gray-600">
              [Dev] Simulasi Lokasi di Sekolah
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

