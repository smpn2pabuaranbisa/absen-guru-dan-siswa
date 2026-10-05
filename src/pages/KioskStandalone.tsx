import React from "react";
import ScannerKiosk from "@/pages/admin/ScannerKiosk";
import { ArrowLeft, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/useAuth";

export default function KioskStandalone() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Discreet Navigation Bar */}
      <header className="h-12 bg-slate-900/60 border-b border-slate-800 px-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-2">
          {user?.role === "admin" ? (
            <>
              <Link
                to="/admin/dashboard"
                className="flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Kembali ke Admin Panel
              </Link>
              <span className="text-xs text-slate-600 hidden sm:inline">|</span>
            </>
          ) : (
            <>
              <button
                onClick={handleLogout}
                className="flex items-center text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors bg-rose-950/40 hover:bg-rose-900/60 px-3 py-1.5 rounded-lg border border-rose-900/50"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Akhiri Sesi (Keluar)
              </button>
              <span className="text-xs text-slate-600 hidden sm:inline">|</span>
            </>
          )}
          <span className="text-xs text-slate-400 hidden sm:inline">
            Mode Kiosk Mandiri (Gerbang & Pos Satpam)
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs text-emerald-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>KIOSK LIVE STREAM</span>
        </div>
      </header>

      {/* Full Page Kiosk Component */}
      <main className="flex-1 p-3 sm:p-6 overflow-y-auto">
        <ScannerKiosk isStandalone={true} />
      </main>
    </div>
  );
}
