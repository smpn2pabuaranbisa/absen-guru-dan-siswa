import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Home, ScanFace, BookOpen, Users, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileLayout() {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/guru/home" },
    { icon: ScanFace, label: "Absensi", path: "/guru/absensi" },
    { icon: Users, label: "Siswa", path: "/guru/siswa" },
    { icon: History, label: "Riwayat", path: "/guru/riwayat" },
    { icon: User, label: "Profil", path: "/guru/profil" },
  ];

  // Menentukan index aktif secara presisi berdasarkan rute saat ini
  const getActiveIndex = () => {
    const currentPath = location.pathname;
    if (currentPath.startsWith("/guru/home") || currentPath.startsWith("/guru/kbm") || currentPath.startsWith("/guru/presensi-kelas")) return 0;
    if (currentPath.startsWith("/guru/absensi") || currentPath.startsWith("/guru/izin-sakit")) return 1;
    if (currentPath.startsWith("/guru/siswa")) return 2;
    if (currentPath.startsWith("/guru/riwayat")) return 3;
    if (currentPath.startsWith("/guru/profil")) return 4;
    return 0;
  };

  const activeIndex = getActiveIndex();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col mx-auto w-full max-w-md relative shadow-xl">
      {/* Main Content Area */}
      <main className="flex-1 pb-28">
        <Outlet />
      </main>

      {/* Liquid Magic Curved Bottom Navigation (Clean Minimalist White - Fixed Bottom) */}
      <nav
        id="guru-bottom-navigation"
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white h-[70px] flex items-center justify-center z-50 rounded-t-2xl border-t border-slate-200/80 shadow-[0_-4px_25px_rgba(0,0,0,0.08)]"
      >
        {/* Indikator Bubble Melayang dengan Efek Liquid */}
        <div
          className="absolute top-0 left-0 w-1/5 h-full flex justify-center items-start pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-10"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        >
          <div className="liquid-bubble" />
        </div>

        {/* Daftar Tombol Menu Navigasi */}
        <ul className="relative flex w-full h-full z-20">
          {navItems.map((item, index) => {
            const isActive = activeIndex === index;
            return (
              <li key={item.path} className="relative flex-1 h-full list-none">
                <NavLink
                  to={item.path}
                  className="relative flex flex-col items-center justify-center w-full h-full text-center group select-none"
                >
                  {/* Ikon yang melompat naik ke dalam bubble saat aktif */}
                  <span
                    className={cn(
                      "relative block transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                      isActive
                        ? "-translate-y-8 text-white scale-110 drop-shadow-sm"
                        : "translate-y-0 text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <item.icon className="w-6 h-6 stroke-[2.2]" />
                  </span>

                  {/* Label teks yang muncul di bawah saat aktif */}
                  <span
                    className={cn(
                      "absolute bottom-2 text-[11px] font-semibold tracking-wide transition-all duration-500 ease-out select-none",
                      isActive
                        ? "opacity-100 translate-y-0 text-blue-600"
                        : "opacity-0 translate-y-3 text-transparent pointer-events-none"
                    )}
                  >
                    {item.label}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

