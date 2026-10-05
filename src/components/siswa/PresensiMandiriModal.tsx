import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Compass, 
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Radio,
  RefreshCw,
  Navigation,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDistance } from "@/lib/utils";
import { GpsTelemetry, GpsSecurityAudit, evaluateGpsSecurity } from "@/lib/gpsSecurity";
import { apiSubmitStudentSelfAttendance } from "@/services/api";

interface PresensiMandiriModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "masuk" | "pulang";
  school: any;
  token: string;
  onSuccess: (result: any) => void;
}

export default function PresensiMandiriModal({
  isOpen,
  onClose,
  type,
  school,
  token,
  onSuccess
}: PresensiMandiriModalProps) {
  const [step, setStep] = useState<"location" | "camera" | "submitting" | "success">("location");
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  // Parse school coordinate
  const schoolCoords = React.useMemo(() => {
    if (!school?.koordinatSekolah) return { lat: -6.200000, lng: 106.816666 };
    const parts = school.koordinatSekolah.split(",").map((s: string) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
    return { lat: -6.200000, lng: 106.816666 };
  }, [school]);

  const maxRadius = school?.radiusAbsen || 50;

  // Location & Anti-Fraud Telemetry states
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isDetectingLoc, setIsDetectingLoc] = useState(false);
  const [telemetry, setTelemetry] = useState<GpsTelemetry | null>(null);
  const [securityAudit, setSecurityAudit] = useState<GpsSecurityAudit | null>(null);

  // Camera states
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep("location");
      setError(null);
      setCapturedPhoto(null);
      // Auto detect location on open
      handleGetLocation();
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleGetLocation = () => {
    setIsDetectingLoc(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Perangkat Anda tidak mendukung fitur deteksi GPS.");
      setIsDetectingLoc(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = pos.coords;
        const lat = coords.latitude;
        const lng = coords.longitude;
        const accuracy = coords.accuracy || 12;
        const isMocked = Boolean((coords as any).isMocked);

        const telem: GpsTelemetry = {
          lat,
          lng,
          accuracy,
          altitude: coords.altitude,
          altitudeAccuracy: coords.altitudeAccuracy,
          heading: coords.heading,
          speed: coords.speed,
          timestamp: pos.timestamp || Date.now(),
          isMocked
        };

        setTelemetry(telem);
        setUserLoc({ lat, lng });

        const audit = evaluateGpsSecurity(telem, schoolCoords, maxRadius);
        setSecurityAudit(audit);
        setDistance(audit.distanceMeters);

        if (!audit.isValid) {
          setError(audit.message);
        } else {
          setError(null);
        }
        setIsDetectingLoc(false);
      },
      (err) => {
        setIsDetectingLoc(false);
        setError("Gagal mendeteksi sinyal GPS satelit. Pastikan GPS HP aktif dengan mode Akurasi Tinggi.");
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    );
  };

  // Simulated clean location at school for testing
  const handleSimulateAtSchool = () => {
    const telem: GpsTelemetry = {
      lat: schoolCoords.lat,
      lng: schoolCoords.lng,
      accuracy: 12,
      altitude: 24,
      timestamp: Date.now(),
      isMocked: false
    };
    setTelemetry(telem);
    setUserLoc({ lat: schoolCoords.lat, lng: schoolCoords.lng });
    const audit = evaluateGpsSecurity(telem, schoolCoords, maxRadius);
    setSecurityAudit(audit);
    setDistance(audit.distanceMeters);
    setError(null);
  };

  // Test simulation for Fake GPS / Mock Location
  const handleTestMockGps = () => {
    const telem: GpsTelemetry = {
      lat: schoolCoords.lat,
      lng: schoolCoords.lng,
      accuracy: 10,
      timestamp: Date.now(),
      isMocked: true // Mock Location flagged
    };
    setTelemetry(telem);
    setUserLoc({ lat: schoolCoords.lat, lng: schoolCoords.lng });
    const audit = evaluateGpsSecurity(telem, schoolCoords, maxRadius);
    setSecurityAudit(audit);
    setDistance(audit.distanceMeters);
    setError(audit.message);
  };

  // Test simulation for Weak GPS Signal (>50m)
  const handleTestWeakSignal = () => {
    const telem: GpsTelemetry = {
      lat: schoolCoords.lat,
      lng: schoolCoords.lng,
      accuracy: 160, // 160m accuracy exceeds 50m
      timestamp: Date.now(),
      isMocked: false
    };
    setTelemetry(telem);
    setUserLoc({ lat: schoolCoords.lat, lng: schoolCoords.lng });
    const audit = evaluateGpsSecurity(telem, schoolCoords, maxRadius);
    setSecurityAudit(audit);
    setDistance(audit.distanceMeters);
    setError(audit.message);
  };

  const handleProceedToCamera = async () => {
    if (!securityAudit || !securityAudit.isValid) {
      setError(securityAudit?.message || `Lokasi Anda berada ${distance}m dari sekolah. Melebihi radius toleransi ${maxRadius}m.`);
      return;
    }

    setError(null);
    setStep("camera");

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setCameraError("Kamera tidak dapat diakses atau izin ditolak. Mengaktifkan mode foto simulasi.");
    }
  };

  const handleCapturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 480;
      canvas.height = videoRef.current.videoHeight || 640;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    } else {
      // Fallback simulated photo
      setCapturedPhoto("https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80");
    }
  };

  const handleSimulatePhoto = () => {
    stopCamera();
    setCapturedPhoto("https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80");
  };

  const handleSubmitAttendance = async () => {
    if (!token) return;
    setStep("submitting");
    setError(null);

    try {
      const res = await apiSubmitStudentSelfAttendance(
        token,
        type,
        userLoc?.lat || schoolCoords.lat,
        userLoc?.lng || schoolCoords.lng,
        capturedPhoto || undefined,
        telemetry ? {
          accuracy: telemetry.accuracy,
          isMocked: telemetry.isMocked,
          timestamp: telemetry.timestamp
        } : undefined
      );

      if (res.success) {
        setSuccessData(res.data);
        setStep("success");
        onSuccess(res.data);
      } else {
        setError(res.message);
        setStep("location");
      }
    } catch (err) {
      setError("Terjadi kegagalan jaringan saat mengirim presensi.");
      setStep("location");
    }
  };

  if (!isOpen) return null;

  const isWithinRadius = distance !== null && distance <= maxRadius;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-white/10">
              <MapPin className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                Presensi Mandiri {type === "masuk" ? "Masuk" : "Pulang"}
              </h2>
              <p className="text-[11px] text-blue-100">Validasi Geofence & Foto Wajah</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: LOCATION & ANTI-FRAUD VALIDATION */}
          {step === "location" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-slate-900 rounded-2xl text-white relative overflow-hidden text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center mx-auto relative">
                  <Navigation className="w-7 h-7 text-blue-400 animate-pulse" />
                </div>

                <div>
                  <h3 className="text-sm font-bold">Verifikasi Lokasi & Geofence</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Maksimal radius toleransi gerbang: <span className="text-yellow-300 font-bold">{maxRadius} Meter</span>
                  </p>
                </div>

                <div className="pt-2">
                  {isDetectingLoc ? (
                    <div className="flex items-center justify-center space-x-2 text-xs text-blue-300">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengunci sinyal satelit GPS...</span>
                    </div>
                  ) : distance !== null ? (
                    <div className="space-y-1">
                      <div className="text-2xl font-black font-mono">
                        <span className={securityAudit?.isWithinRadius ? "text-emerald-400" : "text-rose-400"}>
                          {distance}
                        </span>{" "}
                        <span className="text-xs font-normal text-slate-300">Meter dari Sekolah</span>
                      </div>
                      <p className="text-[11px]">
                        {securityAudit?.isWithinRadius ? (
                          <span className="text-emerald-400 font-semibold flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Dalam Jangkauan Geofence
                          </span>
                        ) : (
                          <span className="text-rose-400 font-semibold flex items-center justify-center">
                            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Di Luar Radius Sekolah
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Tekan tombol deteksi di bawah</p>
                  )}
                </div>
              </div>

              {/* TELEMETRY & ANTI-FRAUD SECURITY AUDIT CARD */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-700 pb-1.5 border-b border-gray-200">
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Integritas Sinyal Satelit</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    securityAudit?.isValid 
                      ? "bg-emerald-100 text-emerald-800" 
                      : securityAudit?.isMockDetected
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }`}>
                    {securityAudit?.isValid ? "Proteksi Lolos" : securityAudit?.isMockDetected ? "Fake GPS Terdeteksi" : "Pemeriksaan Sinyal"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-white rounded-lg border border-gray-150">
                    <div className="text-gray-500 flex items-center space-x-1">
                      <Radio className="w-3 h-3 text-gray-400" />
                      <span>Akurasi Sinyal</span>
                    </div>
                    <div className="font-bold font-mono mt-0.5 text-gray-900">
                      {securityAudit?.accuracyMeters ? `±${securityAudit.accuracyMeters} m` : "—"}
                    </div>
                    <div className={`text-[10px] ${
                      securityAudit?.accuracyStatus === "excellent" 
                        ? "text-emerald-600" 
                        : securityAudit?.accuracyStatus === "acceptable"
                          ? "text-blue-600"
                          : "text-amber-600"
                    }`}>
                      {securityAudit?.accuracyStatus === "excellent" && "Satelit Optimal"}
                      {securityAudit?.accuracyStatus === "acceptable" && "Standar Akurasi Aman"}
                      {securityAudit?.accuracyStatus === "poor" && "Akurasi Rendah (>50m)"}
                      {!securityAudit && "Menunggu koordinat"}
                    </div>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-gray-150">
                    <div className="text-gray-500 flex items-center space-x-1">
                      <ShieldAlert className="w-3 h-3 text-gray-400" />
                      <span>Mock Location</span>
                    </div>
                    <div className="font-bold mt-0.5 text-gray-900">
                      {securityAudit?.isMockDetected ? (
                        <span className="text-red-600">Terdeteksi Fake GPS</span>
                      ) : (
                        <span className="text-emerald-600">Satelit Asli (Valid)</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Anti-Spoofing Aktif
                    </div>
                  </div>
                </div>

                {securityAudit?.message && !securityAudit.isValid && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 flex items-start space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-600" />
                    <span>{securityAudit.message}</span>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS & SIMULATION TOOLBAR */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetLocation}
                  disabled={isDetectingLoc}
                  className="w-full text-xs h-9 flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDetectingLoc ? "animate-spin" : ""}`} />
                  <span>Pindai Ulang Sinyal GPS</span>
                </Button>

                {/* DEMO / SIMULATION TESTING TOOLS */}
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    Mode Pengujian / Simulasi Deteksi
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={handleSimulateAtSchool}
                      className="px-1.5 py-1 text-[10px] rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium truncate"
                      title="Simulasi lokasi valid di sekolah"
                    >
                      ⚡ Lokasi Valid
                    </button>
                    <button
                      type="button"
                      onClick={handleTestMockGps}
                      className="px-1.5 py-1 text-[10px] rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-medium truncate"
                      title="Uji coba deteksi aplikasi Fake GPS"
                    >
                      🚨 Uji Fake GPS
                    </button>
                    <button
                      type="button"
                      onClick={handleTestWeakSignal}
                      className="px-1.5 py-1 text-[10px] rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-medium truncate"
                      title="Uji coba akurasi rendah (>50m)"
                    >
                      📡 Sinyal Lemah
                    </button>
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={!securityAudit?.isValid}
                  onClick={handleProceedToCamera}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs h-10 font-semibold shadow-xs"
                >
                  Lanjut: Ambil Swafoto
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: CAMERA SELFIE */}
          {step === "camera" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center">
                <h3 className="text-sm font-bold text-gray-900">Pengambilan Swafoto</h3>
                <p className="text-xs text-gray-500">Posisikan wajah Anda di dalam bingkai kamera</p>
              </div>

              <div className="relative aspect-[3/4] bg-black rounded-2xl overflow-hidden flex items-center justify-center border-2 border-gray-200 shadow-inner">
                {capturedPhoto ? (
                  <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </>
                )}
              </div>

              {cameraError && (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  {cameraError}
                </div>
              )}

              <div className="space-y-2">
                {!capturedPhoto ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSimulatePhoto}
                      className="text-xs h-9"
                    >
                      Gunakan Foto Demo
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 font-semibold"
                    >
                      <Camera className="w-4 h-4 mr-1.5" />
                      Ambil Foto
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCapturedPhoto(null);
                        handleProceedToCamera();
                      }}
                      className="text-xs h-10"
                    >
                      Ulangi Foto
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmitAttendance}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 font-semibold shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Kirim Presensi
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SUBMITTING */}
          {step === "submitting" && (
            <div className="py-12 text-center space-y-4 animate-in fade-in">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
              <div>
                <h3 className="text-base font-bold text-gray-900">Memproses Presensi...</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Memvalidasi koordinat GPS dan mengunggah swafoto ke sistem.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "success" && (
            <div className="py-6 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-lg font-black text-gray-900">Presensi Berhasil!</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Presensi {type === "masuk" ? "Masuk" : "Pulang"} telah tercatat pada jam{" "}
                  <strong className="text-blue-700">{successData?.time || "07:00"}</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1 text-left">
                <div className="flex justify-between">
                  <span>Jenis Presensi:</span>
                  <span className="font-semibold uppercase">{type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status Kehadiran:</span>
                  <span className="font-semibold text-emerald-600 uppercase">
                    {successData?.status || "Hadir"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Metode:</span>
                  <span>Geofencing GPS & Swafoto</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-10 font-bold"
              >
                Selesai & Tutup
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
