import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Home, Bell, Calendar, FileText, LogOut, ShieldCheck, Phone, GraduationCap } from "lucide-react";
import { useAuth } from "@/store/useAuth";
import { cn } from "@/lib/utils";
import { apiGetParentNotifications } from "@/services/api";

export default function WaliLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const student = user?.student_data;
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = async () => {
    if (!student?.id) return;
    try {
      const res = await apiGetParentNotifications(student.id);
      if (res.success && res.data) {
        const unread = res.data.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [student?.id]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const navItems = [
    { icon: Home, label: "Beranda", path: "/wali/home" },
    { icon: GraduationCap, label: "Nilai Rapor", path: "/wali/nilai" },
    { icon: Calendar, label: "Presensi", path: "/wali/riwayat" },
    { icon: FileText, label: "Izin", path: "/wali/izin" },
    { icon: Bell, label: "Notifikasi", path: "/wali/notifikasi", badge: unreadCount },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col mx-auto w-full max-w-md relative shadow-2xl border-x border-slate-200 text-slate-800">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Portal Wali Murid</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-sm font-bold text-slate-800 truncate">
              {student ? student.nama : user?.name}
            </h1>
            <p className="text-[11px] text-slate-400 truncate">
              {student?.kelas_nama} • NISN: {student?.nisn}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => navigate("/wali/notifikasi")}
            className="relative p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Notifikasi Masuk & Pulang"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white shadow-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-24 px-4 pt-4">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around items-center h-16 px-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-all",
                isActive
                  ? "text-blue-600 font-semibold"
                  : "text-slate-400 hover:text-slate-700"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-2 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-[10px]">{item.label}</span>
                {isActive && (
                  <span className="absolute top-0 w-8 h-0.5 bg-blue-600 rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
