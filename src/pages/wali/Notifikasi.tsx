import React, { useState, useEffect } from "react";
import { 
  Bell, 
  CheckCheck, 
  Clock, 
  LogIn, 
  LogOut, 
  AlertCircle, 
  Info, 
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "@/store/useAuth";
import { 
  apiGetParentNotifications, 
  apiMarkParentNotificationRead,
  apiCreateParentNotification 
} from "@/services/api";
import { ParentNotification } from "@/types";

export default function WaliNotifikasi() {
  const { user } = useAuth();
  const student = user?.student_data;

  const [notifications, setNotifications] = useState<ParentNotification[]>([]);
  const [filter, setFilter] = useState<"all" | "presensi" | "izin" | "info">("all");
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const fetchNotifs = async () => {
    if (!student?.id) return;
    try {
      const res = await apiGetParentNotifications(student.id);
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [student?.id]);

  const handleMarkAllRead = async () => {
    if (!student?.id) return;
    await apiMarkParentNotificationRead(student.id);
    fetchNotifs();
  };

  const handleMarkSingleRead = async (notifId: string) => {
    if (!student?.id) return;
    await apiMarkParentNotificationRead(student.id, notifId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    );
  };

  // Test Simulation helper: allows testing arrival/departure notification in real-time
  const handleSimulateScan = (mode: "masuk" | "pulang" | "terlambat") => {
    if (!student?.id) return;
    setSimulating(true);

    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

    let title = "Presensi Masuk Berhasil";
    let message = `Ananda ${student.nama} telah melakukan presensi MASUK pada pukul ${timeStr} melalui Gerbang Utama. Status: Hadir Tepat Waktu.`;
    let type: ParentNotification["type"] = "masuk";

    if (mode === "pulang") {
      title = "Presensi Pulang Sekolah";
      message = `Ananda ${student.nama} telah melakukan presensi PULANG pada pukul ${timeStr}. Hati-hati di perjalanan pulang.`;
      type = "pulang";
    } else if (mode === "terlambat") {
      title = "Presensi Masuk - Terlambat";
      message = `Ananda ${student.nama} tiba di sekolah pada pukul ${timeStr}. Tercatat keterlambatan 15 menit.`;
      type = "terlambat";
    }

    apiCreateParentNotification({
      student_id: student.id,
      student_name: student.nama,
      student_nisn: student.nisn,
      title,
      message,
      type,
      timestamp: now.toISOString(),
      timeStr,
      dateStr: "Baru saja",
      kioskGate: "Gerbang Utama"
    });

    // Try browser push notification if permitted
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body: message,
          icon: student.foto
        });
      } catch (e) {
        // ignore
      }
    }

    setTimeout(() => {
      fetchNotifs();
      setSimulating(false);
    }, 400);
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === "presensi") return ["masuk", "pulang", "terlambat"].includes(n.type);
    if (filter === "izin") return ["izin", "sakit"].includes(n.type);
    if (filter === "info") return n.type === "info";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Pusat Notifikasi Presensi
          </h2>
          <p className="text-xs text-slate-500">
            Kabar kehadiran real-time ananda {student?.nama}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Tandai Semua Dibaca</span>
          </button>
        )}
      </div>

      {/* Interactive Simulation Bar for Testing Option A */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-3 text-white border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-indigo-200 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Uji Coba Kirim Notifikasi Presensi:</span>
          </span>
          <span className="text-[10px] text-slate-400">Simulasi Real-Time</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            disabled={simulating}
            onClick={() => handleSimulateScan("masuk")}
            className="px-2 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-semibold border border-emerald-500/40 transition-colors cursor-pointer disabled:opacity-50 text-center"
          >
            + Notif Masuk
          </button>
          <button
            disabled={simulating}
            onClick={() => handleSimulateScan("terlambat")}
            className="px-2 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 text-[11px] font-semibold border border-amber-500/40 transition-colors cursor-pointer disabled:opacity-50 text-center"
          >
            + Notif Terlambat
          </button>
          <button
            disabled={simulating}
            onClick={() => handleSimulateScan("pulang")}
            className="px-2 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-[11px] font-semibold border border-blue-500/40 transition-colors cursor-pointer disabled:opacity-50 text-center"
          >
            + Notif Pulang
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
        <button
          onClick={() => setFilter("all")}
          className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
            filter === "all"
              ? "bg-white text-slate-800 font-bold shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Semua ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("presensi")}
          className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
            filter === "presensi"
              ? "bg-white text-slate-800 font-bold shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Presensi
        </button>
        <button
          onClick={() => setFilter("izin")}
          className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
            filter === "izin"
              ? "bg-white text-slate-800 font-bold shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Izin/Sakit
        </button>
        <button
          onClick={() => setFilter("info")}
          className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
            filter === "info"
              ? "bg-white text-slate-800 font-bold shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Info
        </button>
      </div>

      {/* Notifications Feed */}
      {filteredNotifs.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Tidak ada notifikasi</p>
          <p className="text-xs text-slate-400 mt-1">
            Notifikasi presensi masuk dan pulang akan otomatis muncul di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((item) => {
            const isMasuk = item.type === "masuk";
            const isTerlambat = item.type === "terlambat";
            const isPulang = item.type === "pulang";
            const isIzin = item.type === "izin" || item.type === "sakit";

            return (
              <div
                key={item.id}
                onClick={() => handleMarkSingleRead(item.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                  !item.isRead
                    ? "bg-white border-blue-300 shadow-sm ring-1 ring-blue-500/10"
                    : "bg-white border-slate-200 opacity-90 hover:opacity-100"
                }`}
              >
                {!item.isRead && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-600" />
                )}

                <div className="flex items-start space-x-3">
                  {/* Icon badge */}
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isTerlambat
                        ? "bg-amber-100 text-amber-700"
                        : isMasuk
                        ? "bg-emerald-100 text-emerald-700"
                        : isPulang
                        ? "bg-blue-100 text-blue-700"
                        : isIzin
                        ? "bg-purple-100 text-purple-700"
                        : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {isMasuk ? (
                      <LogIn className="w-5 h-5" />
                    ) : isPulang ? (
                      <LogOut className="w-5 h-5" />
                    ) : isTerlambat ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-800">
                        {item.title}
                      </span>
                      {item.kioskGate && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {item.kioskGate}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="mt-2.5 flex items-center space-x-3 text-[11px] text-slate-400 font-medium">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{item.timeStr}</span>
                      </span>
                      <span>•</span>
                      <span>{item.dateStr}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
