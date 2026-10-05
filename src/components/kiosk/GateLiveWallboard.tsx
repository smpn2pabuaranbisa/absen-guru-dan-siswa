import React, { useState } from "react";
import { 
  GateAttendanceRecord, 
  GateStats 
} from "@/services/api";
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  Clock, 
  Search, 
  Send, 
  QrCode, 
  Barcode, 
  Keyboard, 
  Filter,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowDownRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface GateLiveWallboardProps {
  records: GateAttendanceRecord[];
  stats: GateStats | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export default function GateLiveWallboard({
  records,
  stats,
  onRefresh,
  isLoading
}: GateLiveWallboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "siswa" | "guru">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "Hadir" | "Terlambat">("all");

  const filteredRecords = records.filter((item) => {
    const matchesSearch =
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.identifier.includes(searchTerm) ||
      item.subInfo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || item.type === filterType;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "Hadir" && item.status === "Hadir") ||
      (filterStatus === "Terlambat" && item.status === "Terlambat");

    return matchesSearch && matchesType && matchesStatus;
  });

  const getMethodBadge = (metode: GateAttendanceRecord["metodeScan"]) => {
    switch (metode) {
      case "QR_CAMERA":
        return (
          <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <QrCode className="w-3 h-3 mr-1" /> Kamera QR
          </span>
        );
      case "BARCODE_SCANNER":
        return (
          <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Barcode className="w-3 h-3 mr-1" /> USB Scanner
          </span>
        );
      case "MANUAL_INPUT":
        return (
          <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Keyboard className="w-3 h-3 mr-1" /> Manual
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Header & Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Live Feed Presensi Gerbang Hari Ini
              </h3>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                REALTIME
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Menampilkan {filteredRecords.length} aktivitas tap gerbang terbaru
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
            className="text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
            Segarkan
          </Button>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIS, atau kelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                filterType === "all"
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterType("siswa")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                filterType === "siswa"
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Siswa
            </button>
            <button
              onClick={() => setFilterType("guru")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                filterType === "guru"
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Guru
            </button>

            {/* Status Filter */}
            <div className="h-4 w-[1px] bg-slate-700 mx-1" />

            <button
              onClick={() => setFilterStatus(filterStatus === "Terlambat" ? "all" : "Terlambat")}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center space-x-1 ${
                filterStatus === "Terlambat"
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "bg-slate-800/60 text-amber-400/80 border border-amber-500/20 hover:bg-slate-800"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Terlambat Saja</span>
            </button>
          </div>
        </div>
      </div>

      {/* Record List Stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/70 p-2 space-y-1">
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
            <Users className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm font-medium text-slate-400">Belum ada aktivitas presensi gerbang</p>
            <p className="text-xs text-slate-600 mt-1">
              Data akan otomatis muncul saat siswa atau guru tap kartu di scanner
            </p>
          </div>
        ) : (
          filteredRecords.map((item) => {
            const isTerlambat = item.status === "Terlambat";
            const isPulang = item.mode === "pulang";

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl hover:bg-slate-800/60 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Photo Thumbnail */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={item.foto}
                      alt={item.nama}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover border border-slate-700"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute(
                          "src",
                          "https://ui-avatars.com/api/?name=" + encodeURIComponent(item.nama) + "&background=0D8ABC&color=fff"
                        );
                      }}
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${
                        isTerlambat ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                    />
                  </div>

                  {/* Name and SubInfo */}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                        {item.nama}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-400">
                        ({item.identifier})
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-400">
                      <span>{item.subInfo}</span>
                      <span>•</span>
                      {getMethodBadge(item.metodeScan)}
                    </div>
                  </div>
                </div>

                {/* Right side: Time and Status Badge */}
                <div className="flex items-center space-x-3 flex-shrink-0 text-right">
                  <div>
                    <div className="text-xs font-mono font-bold text-white flex items-center justify-end space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{item.timeStr}</span>
                    </div>

                    <div className="mt-1">
                      {isTerlambat ? (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Terlambat ({item.menitKeterlambatan}m)
                        </span>
                      ) : isPulang ? (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Pulang
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Tepat Waktu
                        </span>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp delivery icon or offline indicator */}
                  {item.waNotificationStatus === "SENT" && (
                    <div 
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400" 
                      title="Notifikasi WA Terkirim ke Orang Tua"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {item.waNotificationStatus === "PENDING_SYNC" && (
                    <div 
                      className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30" 
                      title="Data tersimpan offline (menunggu sinkronisasi)"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Wallboard Bottom Summary Footnote */}
      {stats && (
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>
            Hadir: <strong className="text-emerald-400">{stats.totalHadir}</strong> • Terlambat: <strong className="text-amber-400">{stats.totalTerlambat}</strong>
          </span>
          <span>
            Sisa Siswa Belum Hadir: <strong className="text-rose-400">{stats.siswaBelumHadir}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
