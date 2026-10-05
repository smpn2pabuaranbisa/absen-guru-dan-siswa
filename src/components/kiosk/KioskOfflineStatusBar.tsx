import React from "react";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  HardDrive,
  ToggleLeft,
  ToggleRight,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfflinePendingAttendance } from "@/services/kioskOfflineStorage";

interface KioskOfflineStatusBarProps {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  cachedMasterCount: number;
  lastMasterSyncTime: string | null;
  pendingQueue: OfflinePendingAttendance[];
  isSyncing: boolean;
  onManualSync: () => void;
  onRefreshMasterCache: () => void;
}

export default function KioskOfflineStatusBar({
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  cachedMasterCount,
  lastMasterSyncTime,
  pendingQueue,
  isSyncing,
  onManualSync,
  onRefreshMasterCache
}: KioskOfflineStatusBarProps) {
  const effectiveOnline = isOnline && !isSimulatedOffline;
  const pendingCount = pendingQueue.length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left side: Network Status & Local DB Info */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Main Online / Offline Badge */}
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border shadow-inner ${
              effectiveOnline
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse"
            }`}
          >
            {effectiveOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>SERVER ONLINE</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                <WifiOff className="w-4 h-4 text-amber-400" />
                <span>
                  {isSimulatedOffline ? "MODE UJI OFFLINE" : "JARINGAN OFFLINE (LOKAL)"}
                </span>
              </>
            )}
          </div>

          {/* Master Cache Badge */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            <span>DB Lokal:</span>
            <span className="font-bold text-white">{cachedMasterCount} ID</span>
            <button
              onClick={onRefreshMasterCache}
              title="Perbarui data siswa & guru lokal"
              className="text-slate-500 hover:text-blue-400 transition-colors ml-1"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Pending Sync Queue Badge */}
          <div
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              pendingCount > 0
                ? "bg-amber-500/20 text-amber-200 border-amber-500/30 font-mono"
                : "bg-slate-950 text-slate-400 border-slate-800"
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${pendingCount > 0 ? "text-amber-400" : "text-slate-500"}`} />
            <span>Antrean Offline:</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
              pendingCount > 0 ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300"
            }`}>
              {pendingCount}
            </span>
          </div>
        </div>

        {/* Right side: Actions & Simulation Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          {/* Simulation Toggle (Sangat berguna untuk pengujian petugas) */}
          <button
            onClick={onToggleSimulatedOffline}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              isSimulatedOffline
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
            title="Uji coba memutus jaringan internet tanpa mencabut kabel"
          >
            {isSimulatedOffline ? (
              <>
                <ToggleRight className="w-4 h-4 text-amber-400" />
                <span>Simulasi Putus Jaringan: ON</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-slate-500" />
                <span>Uji Coba Offline</span>
              </>
            )}
          </button>

          {/* Manual Sync Button */}
          {pendingCount > 0 && (
            <Button
              size="sm"
              onClick={onManualSync}
              disabled={isSyncing || (!isOnline && !isSimulatedOffline)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-3 rounded-xl shadow-lg shadow-emerald-900/30 border border-emerald-500/40 flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Menyinkronkan..." : `Kirim ${pendingCount} Data ke Server`}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Explanatory banner if offline or pending */}
      {(!effectiveOnline || pendingCount > 0) && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>
              {!effectiveOnline
                ? "Mesin scanner tetap berjalan 100% normal. Siswa tetap bisa tap kartu, hasil absen langsung bersuara & tersimpan di disk lokal."
                : `Ada ${pendingCount} presensi tersimpan lokal. Sistem otomatis mengunggah saat koneksi stabil.`}
            </span>
          </div>
          {lastMasterSyncTime && (
            <span className="hidden sm:inline text-slate-500">
              Cache: {new Date(lastMasterSyncTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
