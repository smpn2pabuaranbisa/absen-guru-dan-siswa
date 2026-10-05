import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Users, UserSquare, Calendar, 
  MapPin, Clock, FileText, Settings, LogOut, MessageSquare, QrCode, ExternalLink, AlertTriangle, BookOpen, Award 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/useAuth";
import { Button } from "@/components/ui/button";

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
    { icon: QrCode, label: "Scanner Gerbang", path: "/admin/kiosk", badge: "Kiosk" },
    { icon: UserSquare, label: "Data Guru", path: "/admin/guru" },
    { icon: Users, label: "Data Siswa", path: "/admin/siswa" },
    { icon: MapPin, label: "Data Kelas", path: "/admin/kelas" },
    { icon: Calendar, label: "Jadwal", path: "/admin/jadwal" },
    { icon: Clock, label: "Absensi Guru", path: "/admin/absensi-guru" },
    { icon: Users, label: "Absensi Siswa", path: "/admin/absensi-siswa" },
    { icon: Award, label: "Leger Nilai", path: "/admin/leger-nilai", badge: "Rapor" },
    { icon: BookOpen, label: "Buku Leger", path: "/admin/leger", badge: "Presensi" },
    { icon: MessageSquare, label: "Notifikasi WA", path: "/admin/whatsapp" },
    { icon: FileText, label: "Izin/Sakit", path: "/admin/izin" },
    { icon: FileText, label: "Laporan", path: "/admin/laporan" },
    { icon: Settings, label: "Pengaturan", path: "/admin/pengaturan" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex w-full">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="text-xl font-bold text-blue-600">Admin Panel</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {sidebarItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                    isActive 
                      ? "bg-blue-50 text-blue-700" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )
                }
              >
                <div className="flex items-center">
                  <item.icon className={cn("mr-3 h-5 w-5 flex-shrink-0")} />
                  {item.label}
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200 space-y-2">
          <NavLink
            to="/kiosk"
            target="_blank"
            className="flex items-center justify-center px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
          >
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            Buka Kiosk Gerbang
          </NavLink>
          
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="h-16 flex items-center justify-between px-8 border-b border-gray-200 bg-white">
          <h1 className="text-lg font-medium text-gray-900">Dashboard Administrator</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">{user?.name || "Admin Utama"}</span>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>
          </div>
        </div>
        <div className="p-8">
          <Outlet />
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Konfirmasi Logout</h3>
              <p className="text-sm text-gray-500 mb-6">
                Apakah Anda yakin ingin keluar dari aplikasi? Anda harus login kembali untuk masuk.
              </p>
              <div className="flex w-full space-x-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsLogoutModalOpen(false)}
                >
                  Batal
                </Button>
                <Button 
                  variant="danger" 
                  className="flex-1"
                  onClick={handleLogout}
                >
                  Ya, Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
