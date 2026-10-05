/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import MobileLayout from "./layouts/MobileLayout";
import AdminLayout from "./layouts/AdminLayout";
import MobileHome from "./pages/mobile/Home";
import MobileAbsensi from "./pages/mobile/Absensi";
import MobileSiswa from "./pages/mobile/Siswa";
import MobileRiwayat from "./pages/mobile/Riwayat";
import MobileProfil from "./pages/mobile/Profil";
import MobilePresensiKelas from "./pages/mobile/PresensiKelas";
import MobileIzinSakit from "./pages/mobile/IzinSakit";
import MobileLegerSiswa from "./pages/mobile/LegerSiswa";
import WaliLayout from "./layouts/WaliLayout";
import WaliHome from "./pages/wali/Home";
import WaliNotifikasi from "./pages/wali/Notifikasi";
import WaliRiwayat from "./pages/wali/Riwayat";
import WaliIzin from "./pages/wali/Izin";
import WaliNilai from "./pages/wali/Nilai";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminGuru from "./pages/admin/Guru";
import AdminSiswa from "./pages/admin/Siswa";
import AdminKelas from "./pages/admin/Kelas";
import AdminJadwal from "./pages/admin/Jadwal";
import AdminAbsensiGuru from "./pages/admin/AbsensiGuru";
import AdminAbsensiSiswa from "./pages/admin/AbsensiSiswa";
import AdminIzin from "./pages/admin/Izin";
import AdminLaporan from "./pages/admin/Laporan";
import AdminLegerPresensi from "./pages/admin/LegerPresensi";
import AdminLegerNilai from "./pages/admin/LegerNilai";
import AdminPengaturan from "./pages/admin/Pengaturan";
import AdminWhatsAppGateway from "./pages/admin/WhatsAppGateway";
import ScannerKiosk from "./pages/admin/ScannerKiosk";
import KioskStandalone from "./pages/KioskStandalone";
import Placeholder from "./pages/Placeholder";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Standalone Kiosk Route */}
        <Route element={<ProtectedRoute allowedRoles={["admin", "satpam"]} />}>
          <Route path="/kiosk" element={<KioskStandalone />} />
        </Route>

        {/* Mobile Guru Routes */}
        <Route path="/guru" element={<ProtectedRoute allowedRoles="guru" />}>
          <Route element={<MobileLayout />}>
            <Route path="home" element={<MobileHome />} />
            <Route path="absensi" element={<MobileAbsensi />} />
            <Route path="izin-sakit" element={<MobileIzinSakit />} />
            <Route path="kbm" element={<MobilePresensiKelas />} />
            <Route path="presensi-kelas" element={<MobilePresensiKelas />} />
            <Route path="siswa" element={<MobileSiswa />} />
            <Route path="leger" element={<MobileLegerSiswa />} />
            <Route path="riwayat" element={<MobileRiwayat />} />
            <Route path="profil" element={<MobileProfil />} />
          </Route>
        </Route>

        {/* Mobile Wali Murid Routes (Option A) */}
        <Route path="/wali" element={<ProtectedRoute allowedRoles="wali" />}>
          <Route element={<WaliLayout />}>
            <Route path="home" element={<WaliHome />} />
            <Route path="nilai" element={<WaliNilai />} />
            <Route path="notifikasi" element={<WaliNotifikasi />} />
            <Route path="riwayat" element={<WaliRiwayat />} />
            <Route path="izin" element={<WaliIzin />} />
          </Route>
        </Route>

        {/* Admin Web Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles="admin" />}>
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="guru" element={<AdminGuru />} />
            <Route path="siswa" element={<AdminSiswa />} />
            <Route path="kelas" element={<AdminKelas />} />
            <Route path="jadwal" element={<AdminJadwal />} />
            <Route path="kiosk" element={<ScannerKiosk />} />
            <Route path="absensi-guru" element={<AdminAbsensiGuru />} />
            <Route path="absensi-siswa" element={<AdminAbsensiSiswa />} />
            <Route path="whatsapp" element={<AdminWhatsAppGateway />} />
            <Route path="izin" element={<AdminIzin />} />
            <Route path="leger" element={<AdminLegerPresensi />} />
            <Route path="leger-nilai" element={<AdminLegerNilai />} />
            <Route path="laporan" element={<AdminLaporan />} />
            <Route path="pengaturan" element={<AdminPengaturan />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

