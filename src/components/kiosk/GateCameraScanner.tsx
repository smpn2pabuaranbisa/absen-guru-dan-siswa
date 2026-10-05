import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { Camera, RefreshCw, AlertCircle, Sparkles, SwitchCamera, VideoOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GateCameraScannerProps {
  onScanSuccess: (decodedText: string) => void;
  isProcessing: boolean;
  isActive: boolean;
}

export default function GateCameraScanner({
  onScanSuccess,
  isProcessing,
  isActive
}: GateCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const lastScannedRef = useRef<{ text: string; time: number }>({ text: "", time: 0 });

  // Enumerate cameras
  const getCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        // Prefer back camera if available, otherwise first device
        const backCam = videoDevices.find((d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment"));
        setSelectedCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
      }
    } catch (err) {
      console.warn("Could not enumerate camera devices:", err);
    }
  }, [selectedCameraId]);

  // Stop stream
  const stopCamera = useCallback(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsCameraReady(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start stream
  const startCamera = useCallback(async () => {
    if (!isActive) return;

    setError(null);
    setIsCameraReady(false);

    // Stop existing stream
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = newStream;
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.setAttribute("playsinline", "true");
        try {
          await videoRef.current.play();
          setIsCameraReady(true);
        } catch (playError: any) {
          // Ignore AbortError caused by rapid unmounting/reloading
          if (playError.name !== 'AbortError' && playError.name !== 'NotAllowedError') {
            console.warn("Video play interrupted:", playError);
          }
        }
      }

      await getCameras();
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError(
        err.name === "NotAllowedError"
          ? "Izin akses kamera ditolak. Silakan berikan izin di peramban Anda."
          : "Kamera tidak terdeteksi atau sedang digunakan aplikasi lain."
      );
    }
  }, [selectedCameraId, isActive, getCameras, stopCamera]);

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isActive, selectedCameraId, startCamera, stopCamera]);

  // QR Scanning loop via requestAnimationFrame
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isProcessing) {
      requestRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });

        if (code && code.data && code.data.trim().length > 0) {
          const now = Date.now();
          // Debounce 2 seconds on identical scan text
          if (
            lastScannedRef.current.text !== code.data ||
            now - lastScannedRef.current.time > 2000
          ) {
            lastScannedRef.current = { text: code.data, time: now };
            onScanSuccess(code.data);
          }
        }
      }
    }

    requestRef.current = requestAnimationFrame(scanFrame);
  }, [isProcessing, onScanSuccess]);

  useEffect(() => {
    if (isCameraReady && !isProcessing) {
      requestRef.current = requestAnimationFrame(scanFrame);
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [isCameraReady, isProcessing, scanFrame]);

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].deviceId);
  };

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-gray-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl flex flex-col justify-center items-center">
      {/* Video Element */}
      <video
        ref={videoRef}
        muted
        playsInline
        className={`w-full h-full object-cover ${isCameraReady ? "block" : "hidden"}`}
      />
      
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Target Reticle Overlay */}
      {isCameraReady && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Subtle dark vignette backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />

          {/* Center Scan Area */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl border-2 border-blue-400/50 bg-transparent flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.3)]">
            {/* Animated Laser Scanning Line */}
            <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-bounce" />

            {/* Corner brackets */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

            {/* Instructional Tag */}
            <div className="absolute -bottom-10 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-medium text-emerald-300 border border-emerald-500/30 flex items-center space-x-1.5 whitespace-nowrap">
              <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Arahkan QR Kartu Pelajar ke kotak ini</span>
            </div>
          </div>
        </div>
      )}

      {/* Camera Controls Overlay */}
      <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
        {cameras.length > 1 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={switchCamera}
            className="bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md text-xs h-8 px-2.5 rounded-lg shadow-lg"
            title="Ganti Kamera"
          >
            <SwitchCamera className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
            <span>Kamera ({cameras.length})</span>
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={startCamera}
          className="bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md text-xs h-8 px-2.5 rounded-lg shadow-lg"
          title="Segarkan Kamera"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-300" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Active Indicator Tag */}
      <div className="absolute top-3 left-3 flex items-center space-x-2 z-10">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center space-x-2 text-xs font-medium text-white shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-semibold">SCANNER AKTIF</span>
        </div>
      </div>

      {/* Loading / Error States */}
      {!isCameraReady && !error && (
        <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300">
          <RefreshCw className="w-10 h-10 text-blue-400 animate-spin mb-3" />
          <p className="text-sm font-medium">Mengaktifkan sensor kamera kiosk...</p>
          <p className="text-xs text-slate-500 mt-1">Pastikan izin kamera telah disetujui di browser.</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center p-6 text-center text-rose-300 max-w-sm">
          <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
          <p className="text-sm font-semibold text-white">Gagal Mengakses Kamera</p>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{error}</p>
          <div className="mt-4 flex space-x-2">
            <Button
              size="sm"
              onClick={startCamera}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Coba Lagi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
