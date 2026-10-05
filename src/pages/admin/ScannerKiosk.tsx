import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/store/useAuth";
import { 
  apiScanGateAttendance, 
  apiGetGateLiveStream, 
  apiGetGateStats, 
  apiResetGateAttendanceToday,
  apiGetSettings,
  apiGetSiswaListAdmin,
  apiGetGuruList,
  GateAttendanceRecord, 
  GateScanResult, 
  GateStats 
} from "@/services/api";
import { playKioskChime, speakKioskVoice } from "@/utils/audioKiosk";
import GateCameraScanner from "@/components/kiosk/GateCameraScanner";
import GateHardwareScannerListener from "@/components/kiosk/GateHardwareScannerListener";
import GateScanResultModal from "@/components/kiosk/GateScanResultModal";
import GateLiveWallboard from "@/components/kiosk/GateLiveWallboard";
import KioskOfflineStatusBar from "@/components/kiosk/KioskOfflineStatusBar";
import { 
  KioskOfflineStorage, 
  OfflinePersonData, 
  OfflinePendingAttendance 
} from "@/services/kioskOfflineStorage";
import { Button } from "@/components/ui/button";
import { 
  QrCode, 
  Barcode, 
  Clock, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Send, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  School, 
  ArrowRight,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap
} from "lucide-react";

interface ScannerKioskProps {
  isStandalone?: boolean;
}

export default function ScannerKiosk({ isStandalone = false }: ScannerKioskProps) {
  const { token, user } = useAuth();

  // Mode: masuk or pulang
  const [mode, setMode] = useState<"masuk" | "pulang">(() => {
    const hour = new Date().getHours();
    return hour >= 12 ? "pulang" : "masuk";
  });

  // Toggles
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);

  // Data states
  const [records, setRecords] = useState<GateAttendanceRecord[]>([]);
  const [stats, setStats] = useState<GateStats | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Result popup state
  const [activeResult, setActiveResult] = useState<GateScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual input state
  const [manualInput, setManualInput] = useState("");

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // === OFFLINE-FIRST STATE ===
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(() => KioskOfflineStorage.isSimulatedOffline());
  const [cachedMasterCount, setCachedMasterCount] = useState(() => KioskOfflineStorage.getMasterCache().length);
  const [lastMasterSyncTime, setLastMasterSyncTime] = useState<string | null>(() => KioskOfflineStorage.getMasterCacheTimestamp());
  const [pendingQueue, setPendingQueue] = useState<OfflinePendingAttendance[]>(() => KioskOfflineStorage.getPendingQueue());
  const [isSyncing, setIsSyncing] = useState(false);

  // Network listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync Master Data to Local Cache
  const refreshMasterCache = useCallback(async () => {
    if (!token) return;
    try {
      const [siswaRes, guruRes] = await Promise.all([
        apiGetSiswaListAdmin(token),
        apiGetGuruList(token)
      ]);

      const formattedList: OfflinePersonData[] = [];

      if (siswaRes.success && siswaRes.data) {
        siswaRes.data.forEach((s: any) => {
          formattedList.push({
            id: s.id,
            type: "siswa",
            nama: s.nama,
            identifier: s.nis,
            nisn: s.nisn,
            rfid_uid: s.rfid_uid,
            subInfo: s.kelas_nama || "Siswa",
            foto: s.foto,
            no_wa_wali: s.no_wa_wali,
            nama_wali: s.nama_wali,
            hubungan_wali: s.hubungan_wali
          });
        });
      }

      if (guruRes.success && guruRes.data) {
        guruRes.data.forEach((g: any) => {
          formattedList.push({
            id: g.id,
            type: "guru",
            nama: g.nama,
            identifier: g.nip,
            rfid_uid: g.rfid_uid,
            subInfo: g.mata_pelajaran || "Guru",
            foto: g.foto,
            no_wa_wali: g.no_wa
          });
        });
      }

      if (formattedList.length > 0) {
        KioskOfflineStorage.saveMasterCache(formattedList);
        setCachedMasterCount(formattedList.length);
        setLastMasterSyncTime(new Date().toISOString());
      }
    } catch (err) {
      console.warn("[Offline Kiosk] Gagal memperbarui cache master dari server:", err);
    }
  }, [token]);

  // Initial load: refresh master cache & queue
  useEffect(() => {
    if (token) {
      refreshMasterCache();
    }
  }, [token, refreshMasterCache]);

  // Fetch initial records, stats, settings
  const fetchGateData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [recRes, statsRes, setRes] = await Promise.all([
        apiGetGateLiveStream(token),
        apiGetGateStats(token),
        apiGetSettings(token)
      ]);

      if (recRes.success && recRes.data) setRecords(recRes.data);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (setRes.success && setRes.data) setSchoolSettings(setRes.data);
    } catch (err) {
      console.error("Error fetching gate data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchGateData();
  }, [fetchGateData]);

  // Background Auto-Sync Worker
  const processSyncQueue = useCallback(async () => {
    const effectiveOnline = isOnline && !isSimulatedOffline;
    if (!effectiveOnline || isSyncing || !token) return;

    const currentQueue = KioskOfflineStorage.getPendingQueue();
    if (currentQueue.length === 0) return;

    setIsSyncing(true);
    console.log(`[Offline Sync] Memulai sinkronisasi ${currentQueue.length} antrean...`);

    for (const item of currentQueue) {
      try {
        const res = await apiScanGateAttendance(token, {
          qrOrBarcode: item.code,
          mode: item.mode,
          metodeScan: item.metodeScan,
          sendWhatsApp: item.sendWhatsApp,
          cooldownMinutes: 3
        });

        // Berhasil disimpan ke server
        KioskOfflineStorage.removeQueueItem(item.localId);
      } catch (err) {
        console.error(`[Offline Sync] Gagal menyinkronkan item ${item.localId}:`, err);
        break; // Tunda sampai koneksi berikutnya stabil
      }
    }

    const remaining = KioskOfflineStorage.getPendingQueue();
    setPendingQueue(remaining);
    setIsSyncing(false);

    // Refresh live stream setelah sinkronisasi selesai
    fetchGateData();
  }, [isOnline, isSimulatedOffline, isSyncing, token, fetchGateData]);

  // Auto-sync interval setiap 10 detik saat online
  useEffect(() => {
    const timer = setInterval(() => {
      const effectiveOnline = isOnline && !isSimulatedOffline;
      const count = KioskOfflineStorage.getPendingQueue().length;
      if (effectiveOnline && count > 0 && !isSyncing) {
        processSyncQueue();
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [isOnline, isSimulatedOffline, isSyncing, processSyncQueue]);

  // Toggle mode simulasi offline
  const handleToggleSimulatedOffline = () => {
    const nextVal = !isSimulatedOffline;
    setIsSimulatedOffline(nextVal);
    KioskOfflineStorage.setSimulatedOffline(nextVal);
  };

  // Clock interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen handlers
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Fullscreen error", err);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Core scan execution handler (supports Offline-First & Online)
  const handleProcessScan = async (
    code: string,
    method: "QR_CAMERA" | "BARCODE_SCANNER" | "MANUAL_INPUT"
  ) => {
    if (isScanning) return;

    setIsScanning(true);
    setErrorMessage(null);

    // Short blip sound on detection
    if (soundEnabled) {
      playKioskChime("scan");
    }

    const effectiveOnline = isOnline && !isSimulatedOffline;

    // === JIKA OFFLINE: PROSES 100% LOKAL DARI CACHE ===
    if (!effectiveOnline) {
      try {
        const localRes = KioskOfflineStorage.evaluateScanLocally(
          code,
          mode,
          method,
          sendWhatsApp
        );

        if (localRes.success && localRes.data) {
          setActiveResult(localRes.data);

          // Audio
          if (soundEnabled) playKioskChime(localRes.data.chimeType);
          if (voiceEnabled && localRes.data.voiceMessage) {
            speakKioskVoice(localRes.data.voiceMessage, true);
          }

          // Prepend ke tampilan records lokal agar petugas langsung melihatnya di wallboard
          setRecords((prev) => [localRes.data!.record, ...prev]);
          setPendingQueue(KioskOfflineStorage.getPendingQueue());
        } else {
          // Double scan atau not found
          if (localRes.data?.isDoubleScan) {
            setActiveResult(localRes.data);
            if (soundEnabled) playKioskChime("error");
            if (voiceEnabled && localRes.data.voiceMessage) {
              speakKioskVoice(localRes.data.voiceMessage, true);
            }
          } else {
            setErrorMessage(localRes.message || "Identitas kartu tidak valid di DB lokal.");
            if (soundEnabled) playKioskChime("error");
            if (voiceEnabled) {
              speakKioskVoice("Kartu tidak terdaftar di database lokal.", true);
            }
          }
        }
      } catch (err: any) {
        console.error("Local scan error:", err);
        setErrorMessage("Terjadi kesalahan saat memproses data offline.");
      } finally {
        setIsScanning(false);
      }
      return;
    }

    // === JIKA ONLINE: PROSES KE SERVER DENGAN FALLBACK OFFLINE JIKA KONEKSI DROP DI TENGAH JALAN ===
    try {
      const res = await apiScanGateAttendance(token!, {
        qrOrBarcode: code,
        mode,
        metodeScan: method,
        sendWhatsApp,
        cooldownMinutes: 3
      });

      if (res.success && res.data) {
        setActiveResult(res.data);

        // Sound effect
        if (soundEnabled) {
          playKioskChime(res.data.chimeType);
        }

        // Voice TTS
        if (voiceEnabled && res.data.voiceMessage) {
          speakKioskVoice(res.data.voiceMessage, true);
        }

        // Refresh live list
        fetchGateData();
      } else {
        // Double scan or error
        if (res.data?.isDoubleScan) {
          setActiveResult(res.data);
          if (soundEnabled) playKioskChime("error");
          if (voiceEnabled && res.data.voiceMessage) {
            speakKioskVoice(res.data.voiceMessage, true);
          }
        } else {
          setErrorMessage(res.message || "Identitas kartu tidak valid.");
          if (soundEnabled) playKioskChime("error");
          if (voiceEnabled) {
            speakKioskVoice("Kartu tidak terdaftar di sistem.", true);
          }
        }
      }
    } catch (err: any) {
      console.warn("Server call failed, falling back to local offline storage:", err);
      // Fallback offline bila koneksi terputus saat request berjalan
      const localRes = KioskOfflineStorage.evaluateScanLocally(
        code,
        mode,
        method,
        sendWhatsApp
      );
      if (localRes.success && localRes.data) {
        setActiveResult(localRes.data);
        if (soundEnabled) playKioskChime(localRes.data.chimeType);
        if (voiceEnabled && localRes.data.voiceMessage) {
          speakKioskVoice(localRes.data.voiceMessage, true);
        }
        setRecords((prev) => [localRes.data!.record, ...prev]);
        setPendingQueue(KioskOfflineStorage.getPendingQueue());
      } else {
        setErrorMessage(localRes.message || "Koneksi terputus dan data tidak ditemukan di cache lokal.");
        if (soundEnabled) playKioskChime("error");
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Manual submit handler
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleProcessScan(manualInput.trim(), "MANUAL_INPUT");
    setManualInput("");
  };

  // Demo Quick Scan trigger
  const handleQuickDemoScan = (sampleCode: string) => {
    handleProcessScan(sampleCode, "BARCODE_SCANNER");
  };

  const handleResetToday = async () => {
    if (!token) return;
    if (!confirm("Reset seluruh data presensi gerbang hari ini?")) return;
    await apiResetGateAttendanceToday(token);
    fetchGateData();
  };

  // Format date in Indonesian
  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(currentTime);

  const formattedTime = currentTime.toLocaleTimeString("id-ID", {
    hour12: false
  });

  return (
    <div className={`space-y-6 animate-in fade-in duration-300 ${isStandalone ? "p-4 sm:p-6 min-h-screen bg-slate-950 text-slate-100" : ""}`}>
      {/* Global USB Barcode & RFID Scanner Listener */}
      <GateHardwareScannerListener
        onBarcodeScanned={(barcode) => handleProcessScan(barcode, "BARCODE_SCANNER")}
        enabled={true}
      />

      {/* Result Modal */}
      <GateScanResultModal
        result={activeResult}
        errorMessage={errorMessage}
        onClose={() => {
          setActiveResult(null);
          setErrorMessage(null);
        }}
      />

      {/* TOP KIOSK HEADER */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* School & Terminal Info */}
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0 shadow-inner">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Terminal Presensi Gerbang & Pos Piket
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Phase 46
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {schoolSettings?.schoolName || "SMP NEGERI 1 NUSANTARA"} • Pos Gerbang Utama & Live Wallboard
              </p>
            </div>
          </div>

          {/* Real-time Live Clock & Mode Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Clock Card */}
            <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex items-center space-x-3 shadow-inner">
              <Clock className="w-5 h-5 text-emerald-400 animate-pulse" />
              <div>
                <div className="text-lg font-mono font-bold text-white tracking-wider">
                  {formattedTime} <span className="text-xs font-normal text-slate-400">WIB</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {formattedDate}
                </div>
              </div>
            </div>

            {/* Mode Switcher: Masuk vs Pulang */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center">
              <button
                onClick={() => setMode("masuk")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === "masuk"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Presensi Masuk (Pagi)
              </button>
              <button
                onClick={() => setMode("pulang")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === "pulang"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Presensi Pulang (Sore)
              </button>
            </div>

            {/* Audio, Voice, WA & Fullscreen Action Buttons */}
            <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {/* Sound Chime Toggle */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`h-8 w-8 p-0 rounded-lg ${soundEnabled ? "text-emerald-400" : "text-slate-600"}`}
                title={soundEnabled ? "Audio Bel Suara Aktif" : "Audio Dinonaktifkan"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>

              {/* Voice TTS Toggle */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`h-8 w-8 p-0 rounded-lg ${voiceEnabled ? "text-blue-400" : "text-slate-600"}`}
                title={voiceEnabled ? "Voice TTS Bahasa Indonesia Aktif" : "Voice TTS Dinonaktifkan"}
              >
                {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>

              {/* WhatsApp Auto-Notification Toggle */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSendWhatsApp(!sendWhatsApp)}
                className={`h-8 w-8 p-0 rounded-lg ${sendWhatsApp ? "text-emerald-400" : "text-slate-600"}`}
                title={sendWhatsApp ? "Notifikasi WA Orang Tua Aktif" : "Notifikasi WA Dinonaktifkan"}
              >
                <Send className="w-4 h-4" />
              </Button>

              {/* Fullscreen Toggle */}
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleFullscreen}
                className="h-8 w-8 p-0 rounded-lg text-slate-300 hover:text-white"
                title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh Kiosk"}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>

              {/* Reset Today Demo Data */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleResetToday}
                className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-rose-400"
                title="Reset Data Presensi Gerbang Hari Ini"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* OFFLINE-FIRST REALTIME STATUS BAR & LOCAL SYNC CONTROL */}
      <KioskOfflineStatusBar
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={handleToggleSimulatedOffline}
        cachedMasterCount={cachedMasterCount}
        lastMasterSyncTime={lastMasterSyncTime}
        pendingQueue={pendingQueue}
        isSyncing={isSyncing}
        onManualSync={processSyncQueue}
        onRefreshMasterCache={refreshMasterCache}
      />

      {/* GATE STATISTICS KPI BAR */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pindai</span>
              <QrCode className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white mt-2 font-mono">
              {stats.totalScans}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Aktivitas tap gerbang hari ini
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Tepat Waktu</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-2 font-mono">
              {stats.totalHadir}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Datang sebelum batas toleransi
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Terlambat</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-2 font-mono">
              {stats.totalTerlambat}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Perlu pembinaan guru piket
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Belum Hadir</span>
              <Users className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400 mt-2 font-mono">
              {stats.siswaBelumHadir}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Dari {stats.totalSiswaTerdaftar} total siswa aktif
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Kedisiplinan</span>
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white mt-2 font-mono">
              {stats.persentaseKehadiran}%
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all"
                style={{ width: `${stats.persentaseKehadiran}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: SCANNER BOX & INPUT (5 Cols on large) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Camera Scanner Card */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Kamera Scanner QR Kiosk
                </h3>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCameraActive(!cameraActive)}
                className="text-xs bg-slate-800 border-slate-700 text-slate-300 hover:text-white h-7 px-2.5"
              >
                {cameraActive ? "Matikan Kamera" : "Nyalakan Kamera"}
              </Button>
            </div>

            {/* Video Box */}
            <GateCameraScanner
              onScanSuccess={(decodedText) => handleProcessScan(decodedText, "QR_CAMERA")}
              isProcessing={isScanning}
              isActive={cameraActive}
            />

            {/* Hardware Scanner & USB Barcode Info */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-slate-400">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 flex-shrink-0 mt-0.5">
                <Barcode className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-slate-200">Hardware Barcode & RFID Gun Siap</span>
                <p className="mt-0.5 leading-relaxed text-[11px]">
                  Alat pemindai USB / Bluetooth barcode gun atau RFID reader aktif di latar belakang. Siswa cukup tap kartu di scanner tanpa klik apapun.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Search / Manual Barcode Input Card */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Pencarian Cepat / Input Manual Barcode
              </h3>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Ketik NIS, NISN, NIP, atau nama siswa..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                disabled={isScanning}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                type="submit"
                disabled={isScanning || !manualInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 rounded-xl font-semibold"
              >
                Scan Manual
              </Button>
            </form>

            {/* Quick Demo Test Chips */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Simulasi Demo Kartu Pelajar (Klik untuk scan):</span>
                <span className="text-[10px] text-blue-400 font-mono">1-Click Test</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "Ahmad Riyadi", code: "2023001", role: "7A" },
                  { name: "Budi Santoso", code: "2023002", role: "7A" },
                  { name: "Citra Kirana", code: "2023003", role: "7A" },
                  { name: "Deni Pratama", code: "2023004", role: "7A" },
                  { name: "Eka Putri", code: "2023005", role: "7B" },
                  { name: "Gita Savitri", code: "2023007", role: "8A" },
                  { name: "Ahmad Guru", code: "198001012005011001", role: "Guru" }
                ].map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => handleQuickDemoScan(s.code)}
                    disabled={isScanning}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-blue-900/60 hover:text-blue-200 text-slate-300 border border-slate-700 hover:border-blue-500/50 transition-colors flex items-center space-x-1"
                  >
                    <span>{s.name}</span>
                    <span className="text-[9px] font-mono text-slate-500">({s.role})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE WALLBOARD & STREAM (7 Cols on large) */}
        <div className="lg:col-span-7 h-[680px]">
          <GateLiveWallboard
            records={records}
            stats={stats}
            onRefresh={fetchGateData}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
