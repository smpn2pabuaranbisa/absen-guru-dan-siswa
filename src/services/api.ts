import { User, ApiResponse, ParentNotification, PresensiMengajar, JadwalPelajaran } from "@/types";
import { getDistance } from "@/lib/utils";

// This is a mock API service that simulates backend logic.
// Later, this will be swapped with actual fetch calls to Google Apps Script.

const ADMIN_CREDENTIALS_KEY = "sims_school_admin_credentials_v1";

/**
 * Uploads an image to Google Drive via backend proxy or direct Apps Script Webhook.
 * Returns the permanent Google Drive direct URL (https://lh3.googleusercontent.com/d/FILE_ID).
 * If unconfigured or failed, returns fallback base64 gracefully.
 */
export const apiUploadImageToGoogleDrive = async (
  base64Data: string,
  fileName?: string,
  mimeType: string = "image/jpeg"
): Promise<{ success: boolean; url: string; fileId?: string; isDrive: boolean }> => {
  if (!base64Data) {
    return { success: false, url: "", isDrive: false };
  }

  // Already a remote URL (Google Drive or HTTP)
  if (base64Data.startsWith("http://") || base64Data.startsWith("https://")) {
    return { success: true, url: base64Data, isDrive: true };
  }

  try {
    const customWebhook = typeof window !== "undefined" ? localStorage.getItem("sims_gdrive_webhook_url") : null;
    const res = await fetch("/api/upload-drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64Data,
        fileName: fileName || `upload_${Date.now()}.jpg`,
        mimeType,
        webhookUrl: customWebhook || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.url) {
        return { success: true, url: data.url, fileId: data.fileId, isDrive: true };
      }
    }
  } catch (e) {
    // Ignore error and fallback to local base64
  }

  // Fallback to local base64 so system never breaks
  return { success: true, url: base64Data, isDrive: false };
};

const getInitialUsers = (): Record<string, { user: User; token: string; password_hash: string }> => {
  const defaultAdmin = {
    username: "admin",
    name: "Admin Sekolah",
    password: "password"
  };

  let savedAdmin = defaultAdmin;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
      if (stored) {
        savedAdmin = { ...defaultAdmin, ...JSON.parse(stored) };
      }
    } catch (e) {
      // ignore
    }
  }

  return {
    "admin": {
      user: {
        user_id: "U001",
        username: savedAdmin.username,
        role: "admin",
        name: savedAdmin.name,
        reference_id: "A001",
        status: "active",
      },
      token: "mock-token-admin-123",
      password_hash: savedAdmin.password,
    },
    "satpam": {
      user: {
        user_id: "U002",
        username: "satpam",
        role: "satpam",
        name: "Petugas Gerbang",
        reference_id: "P001",
        status: "active",
      },
      token: "mock-token-satpam-123",
      password_hash: "password",
    }
  };
};

const MOCK_USERS = getInitialUsers();

export const apiGetAdminProfile = async (token: string): Promise<ApiResponse<{ username: string; name: string }>> => {
  await new Promise(r => setTimeout(r, 200));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  const adminAccount = MOCK_USERS["admin"];
  return {
    success: true,
    message: "Success",
    data: {
      username: adminAccount.user.username,
      name: adminAccount.user.name
    }
  };
};

export const apiUpdateAdminCredentials = async (
  token: string, 
  data: { username: string; name: string; oldPassword?: string; newPassword?: string }
): Promise<ApiResponse> => {
  await new Promise(r => setTimeout(r, 500));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const currentAdmin = MOCK_USERS["admin"];
  
  // If changing password, verify old password
  if (data.newPassword) {
    if (!data.oldPassword || data.oldPassword !== currentAdmin.password_hash) {
      return {
        success: false,
        message: "Kata sandi lama tidak cocok. Harap periksa kembali."
      };
    }
    if (data.newPassword.length < 5) {
      return {
        success: false,
        message: "Kata sandi baru minimal 5 karakter demi keamanan."
      };
    }
    currentAdmin.password_hash = data.newPassword;
  }

  if (data.username && data.username.trim().length >= 3) {
    currentAdmin.user.username = data.username.trim();
  }
  if (data.name && data.name.trim()) {
    currentAdmin.user.name = data.name.trim();
  }

  // Persist to localStorage
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify({
        username: currentAdmin.user.username,
        name: currentAdmin.user.name,
        password: currentAdmin.password_hash
      }));
    } catch (e) {
      console.error("Gagal simpan akun admin ke localStorage", e);
    }
  }

  return {
    success: true,
    message: "Data login Administrator berhasil diperbarui!"
  };
};

export const apiGetDashboard = async (token: string): Promise<ApiResponse<{ attendance: { datang: string | null, pulang: string | null, status: string } }>> => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (!token) {
    return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  }

  // Simulate default state
  return {
    success: true,
    message: "Berhasil mengambil data dashboard",
    data: {
      attendance: {
        datang: null,
        pulang: null,
        status: "Belum Absen"
      }
    }
  };
};

export const apiSubmitAttendance = async (
  token: string, 
  type: "datang" | "pulang", 
  lat: number, 
  lng: number, 
  photoBase64: string,
  securityMeta?: { accuracy?: number; isMocked?: boolean; timestamp?: number }
): Promise<ApiResponse<any>> => {
  // Simulate network delay and upload
  await new Promise((resolve) => setTimeout(resolve, 1200));

  if (!token) {
    return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  }

  // 1. Deteksi Mock Location / Fake GPS
  if (securityMeta?.isMocked) {
    return {
      success: false,
      message: "Terdeteksi aplikasi Mock Location (Fake GPS) aktif pada perangkat. Absensi ditolak demi integritas data kehadiran.",
      error_code: "GPS_MOCK_DETECTED"
    };
  }

  // 2. Validasi Akurasi Sinyal GPS (> 50 meter ditolak)
  if (securityMeta?.accuracy !== undefined && securityMeta.accuracy > 50) {
    return {
      success: false,
      message: `Akurasi sinyal GPS perangkat terlalu rendah (±${Math.round(securityMeta.accuracy)}m, batas aman maksimal 50m). Pastikan berada di luar ruangan untuk kalibrasi satelit.`,
      error_code: "GPS_LOW_ACCURACY"
    };
  }

  // 3. Validasi Geofence Jarak ke Sekolah (titik koordinat: -6.200000, 106.816666, radius 50m)
  const schoolLat = -6.200000;
  const schoolLng = 106.816666;
  const maxRadius = 50;
  const distance = Math.round(getDistance(lat, lng, schoolLat, schoolLng));

  if (distance > maxRadius) {
    return {
      success: false,
      message: `Anda berada di luar radius sekolah (${distance}m dari pusat gerbang, batas toleransi ${maxRadius}m).`,
      error_code: "GEOFENCE_EXCEEDED"
    };
  }

  return {
    success: true,
    message: `Absensi ${type} berhasil dicatat dan terverifikasi satelit GPS (${distance}m dari pusat sekolah).`,
    data: {
      timestamp: new Date().toISOString(),
      distance,
      accuracy: securityMeta?.accuracy || 12,
      isVerified: true
    }
  };
};

export const apiSubmitLeave = async (
  token: string,
  data: {
    jenis: "izin" | "sakit";
    tanggal_mulai: string;
    tanggal_selesai: string;
    alasan: string;
    lampiran: string | null;
  }
): Promise<ApiResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (!token) {
    return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  }

  return {
    success: true,
    message: "Pengajuan berhasil dikirim dan menunggu persetujuan admin.",
    data: {
      status: "Menunggu"
    }
  };
};

// --- DATA KELAS & SISWA (BERSIH DARI DATA DUMMY) ---
let MOCK_CLASSES: any[] = [];
const MOCK_SCHEDULES: any[] = [];
const MOCK_STUDENTS: any[] = [];

export const apiGetClasses = async (token: string): Promise<ApiResponse<typeof MOCK_CLASSES>> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  return { success: true, message: "Success", data: MOCK_CLASSES };
};

export const apiGetSchedules = async (token: string, classId: string): Promise<ApiResponse<typeof MOCK_SCHEDULES>> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  return { success: true, message: "Success", data: MOCK_SCHEDULES.filter(s => s.classId === classId) };
};

export const apiGetStudents = async (token: string, classId: string): Promise<ApiResponse<typeof MOCK_STUDENTS>> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  return { success: true, message: "Success", data: MOCK_STUDENTS.filter(s => s.classId === classId) };
};

export const apiSubmitStudentLeave = async (
  token: string,
  data: { jenis: string; tanggalMulai: string; tanggalSelesai: string; alasan: string; lampiran: string | null }
): Promise<ApiResponse<null>> => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  
  // Validasi
  if (!data.tanggalMulai || !data.tanggalSelesai || !data.alasan) {
    return { success: false, message: "Semua kolom wajib diisi" };
  }
  
  if (new Date(data.tanggalSelesai) < new Date(data.tanggalMulai)) {
    return { success: false, message: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai" };
  }

  return { success: true, message: "Pengajuan izin berhasil dikirim" };
};

export const apiSubmitStudentAttendance = async (
  token: string,
  scheduleId: string,
  attendances: { studentId: string, status: string }[]
): Promise<ApiResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  
  // Simulate unique constraint check (tanggal + siswa_id + jadwal_id)
  // In a real app we would check DB. For mock, just return success.
  return {
    success: true,
    message: "Absensi siswa berhasil disimpan.",
  };
};

export const apiGetTeacherHistory = async (
  token: string,
  _filter: string
): Promise<ApiResponse<any[]>> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  return { success: true, message: "Success", data: [] };
};

export const apiGetStudentHistory = async (
  token: string,
  _filter: string
): Promise<ApiResponse<any[]>> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  return { success: true, message: "Success", data: [] };
};

export const apiGetStudentProfile = async (token: string): Promise<ApiResponse<any>> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  return {
    success: true,
    message: "Success",
    data: MOCK_SISWA_LIST.length > 0 ? MOCK_SISWA_LIST[0] : null
  };
};

export const apiGetProfile = async (token: string): Promise<ApiResponse<import("@/types").GuruProfile>> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  // Check if token matches a teacher in MOCK_GURU_LIST
  const teacherId = token.startsWith("token-guru-") ? token.replace("token-guru-", "").split("-")[0] : null;
  const matchedTeacher = teacherId ? MOCK_GURU_LIST.find(g => g.id === teacherId) : (MOCK_GURU_LIST[0] || null);

  if (matchedTeacher) {
    return {
      success: true,
      message: "Success",
      data: {
        id: matchedTeacher.id,
        user_id: matchedTeacher.user_id || matchedTeacher.id,
        nama: matchedTeacher.nama,
        nip: matchedTeacher.nip || "-",
        nuptk: matchedTeacher.nuptk || "-",
        email: matchedTeacher.email || "-",
        no_hp: matchedTeacher.no_hp || "-",
        jabatan: matchedTeacher.jabatan || "Guru Pengajar",
        mata_pelajaran: matchedTeacher.mata_pelajaran || "-",
        kelas_diajar: matchedTeacher.kelas_diajar || [],
        foto: matchedTeacher.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(matchedTeacher.nama)}&background=0D8ABC&color=fff`
      }
    };
  }

  return {
    success: true,
    message: "Success",
    data: {
      id: "G-GUEST",
      user_id: "U-GUEST",
      nama: "Tenaga Pendidik",
      nip: "-",
      nuptk: "-",
      email: "-",
      no_hp: "-",
      jabatan: "Guru",
      mata_pelajaran: "-",
      kelas_diajar: [],
      foto: "https://ui-avatars.com/api/?name=Guru&background=0D8ABC&color=fff"
    }
  };
};

export const apiUpdateProfile = async (token: string, data: Partial<import("@/types").GuruProfile>): Promise<ApiResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  return { success: true, message: "Profil berhasil diperbarui" };
};

export const apiUpdatePassword = async (token: string, oldPass: string, newPass: string): Promise<ApiResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  // Mock validation
  if (oldPass !== "password") return { success: false, message: "Password lama salah." };
  return { success: true, message: "Password berhasil diperbarui" };
};

export const apiGetAdminDashboard = async (token: string): Promise<ApiResponse<any>> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const totalGuru = MOCK_GURU_LIST.length;
  const totalSiswa = MOCK_SISWA_LIST.length;

  return {
    success: true,
    message: "Success",
    data: {
      statsGuru: { total: totalGuru, hadir: 0, belum_hadir: totalGuru, terlambat: 0, izin: 0, sakit: 0, alpa: 0 },
      statsSiswa: { total: totalSiswa, hadir: 0, izin: 0, sakit: 0, alpa: 0 },
      recentAttendance: [],
      recentLeaves: [],
      chartData: [
        { name: "Sen", Hadir: 0, TidakHadir: 0 },
        { name: "Sel", Hadir: 0, TidakHadir: 0 },
        { name: "Rab", Hadir: 0, TidakHadir: 0 },
        { name: "Kam", Hadir: 0, TidakHadir: 0 },
        { name: "Jum", Hadir: 0, TidakHadir: 0 },
      ]
    }
  };
};

// --- DATA GURU (BERSIH DARI DATA DUMMY) ---
let MOCK_GURU_LIST: any[] = [];

export const apiGetGuruList = async (token: string): Promise<ApiResponse<any[]>> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  return { success: true, message: "Success", data: MOCK_GURU_LIST };
};

export const apiAddGuru = async (token: string, data: any): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  const newId = "G" + (MOCK_GURU_LIST.length + 100);
  MOCK_GURU_LIST.push({ ...data, id: newId });
  return { success: true, message: "Guru berhasil ditambahkan" };
};

export const apiUpdateGuru = async (token: string, id: string, data: any): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  const index = MOCK_GURU_LIST.findIndex(g => g.id === id);
  if (index !== -1) {
    MOCK_GURU_LIST[index] = { ...MOCK_GURU_LIST[index], ...data };
  }
  return { success: true, message: "Data guru berhasil diperbarui" };
};

export const apiDeleteGuru = async (token: string, id: string): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  MOCK_GURU_LIST = MOCK_GURU_LIST.filter(g => g.id !== id);
  return { success: true, message: "Guru berhasil dihapus" };
};

// --- DATA SISWA (BERSIH DARI DATA DUMMY) ---
let MOCK_SISWA_LIST: any[] = [];

export const apiGetSiswaListAdmin = async (token: string): Promise<ApiResponse<any[]>> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  return { success: true, message: "Success", data: MOCK_SISWA_LIST };
};

export const apiAddSiswa = async (token: string, data: any): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  const newId = "S" + (MOCK_SISWA_LIST.length + 100);
  const selectedClass = MOCK_CLASSES.find(c => c.id === data.kelas_id);
  MOCK_SISWA_LIST.push({ ...data, id: newId, kelas_nama: selectedClass ? selectedClass.name : "Unknown" });
  return { success: true, message: "Siswa berhasil ditambahkan" };
};

export const apiUpdateSiswa = async (token: string, id: string, data: any): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  const index = MOCK_SISWA_LIST.findIndex(s => s.id === id);
  if (index !== -1) {
    const selectedClass = MOCK_CLASSES.find(c => c.id === data.kelas_id);
    MOCK_SISWA_LIST[index] = { ...MOCK_SISWA_LIST[index], ...data, kelas_nama: selectedClass ? selectedClass.name : MOCK_SISWA_LIST[index].kelas_nama };
  }
  return { success: true, message: "Data siswa berhasil diperbarui" };
};

export const apiDeleteSiswa = async (token: string, id: string): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  MOCK_SISWA_LIST = MOCK_SISWA_LIST.filter(s => s.id !== id);
  return { success: true, message: "Siswa berhasil dihapus" };
};

export const apiGetClassesAdmin = async (token: string): Promise<ApiResponse<any[]>> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  const data = MOCK_CLASSES.map(c => {
    const totalSiswa = MOCK_SISWA_LIST.filter(s => s.kelas_id === c.id).length;
    return { ...c, wali_kelas: c.wali_kelas || "-", jumlah_siswa: totalSiswa };
  });
  return { success: true, message: "Success", data };
};

export const apiAddClass = async (token: string, data: any): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  const newId = "C" + (MOCK_CLASSES.length + 100);
  let wali_kelas_name = "-";
  if (data.wali_kelas_id) {
    const guru = MOCK_GURU_LIST.find(g => g.id === data.wali_kelas_id);
    if (guru) wali_kelas_name = guru.nama;
  }
  MOCK_CLASSES.push({ ...data, id: newId, wali_kelas: wali_kelas_name, jumlah_siswa: 0 });
  return { success: true, message: "Kelas berhasil ditambahkan" };
};

export const apiUpdateClass = async (token: string, id: string, data: any): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  const index = MOCK_CLASSES.findIndex(c => c.id === id);
  if (index !== -1) {
    let wali_kelas_name = MOCK_CLASSES[index].wali_kelas;
    if (data.wali_kelas_id) {
      const guru = MOCK_GURU_LIST.find(g => g.id === data.wali_kelas_id);
      if (guru) wali_kelas_name = guru.nama;
    }
    MOCK_CLASSES[index] = { ...MOCK_CLASSES[index], ...data, wali_kelas: wali_kelas_name };
  }
  return { success: true, message: "Data kelas berhasil diperbarui" };
};

export const apiDeleteClass = async (token: string, id: string): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  MOCK_CLASSES = MOCK_CLASSES.filter(c => c.id !== id);
  return { success: true, message: "Kelas berhasil dihapus" };
};

// --- DATA JADWAL (BERSIH DARI DATA DUMMY) ---
let MOCK_SCHEDULES_ADMIN: any[] = [];

export const apiGetSchedulesAdmin = async (token: string): Promise<ApiResponse<any[]>> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  return { success: true, message: "Success", data: MOCK_SCHEDULES_ADMIN };
};

export const apiAddSchedule = async (token: string, data: any): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  const newId = "J" + (MOCK_SCHEDULES_ADMIN.length + 100);
  MOCK_SCHEDULES_ADMIN.push({ ...data, id: newId });
  return { success: true, message: "Jadwal berhasil ditambahkan" };
};

export const apiUpdateSchedule = async (token: string, id: string, data: any): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  const idx = MOCK_SCHEDULES_ADMIN.findIndex(s => s.id === id);
  if (idx !== -1) {
    MOCK_SCHEDULES_ADMIN[idx] = { ...MOCK_SCHEDULES_ADMIN[idx], ...data };
  }
  return { success: true, message: "Jadwal berhasil diperbarui" };
};

export const apiDeleteSchedule = async (token: string, id: string): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  MOCK_SCHEDULES_ADMIN = MOCK_SCHEDULES_ADMIN.filter(s => s.id !== id);
  return { success: true, message: "Jadwal berhasil dihapus" };
};

// --- DATA ABSENSI ADMIN (BERSIH DARI DATA DUMMY) ---
export const apiGetAbsensiGuruAdmin = async (token: string, _date: string): Promise<ApiResponse<any[]>> => {
  await new Promise(resolve => setTimeout(resolve, 400));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  return { success: true, message: "Success", data: [] };
};

export const apiGetAbsensiSiswaAdmin = async (token: string, _date: string, _kelasId?: string): Promise<ApiResponse<any[]>> => {
  await new Promise(resolve => setTimeout(resolve, 400));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  return { success: true, message: "Success", data: [] };
};

// --- DATA LEAVE REQUESTS (BERSIH DARI DATA DUMMY) ---
let MOCK_LEAVE_REQUESTS: any[] = [];

export const apiGetLeaveRequestsAdmin = async (token: string, filterRole: string = "all", filterStatus: string = "all"): Promise<ApiResponse<any[]>> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  
  let data = [...MOCK_LEAVE_REQUESTS];
  if (filterRole !== "all") data = data.filter(d => d.peran.toLowerCase() === filterRole.toLowerCase());
  if (filterStatus !== "all") data = data.filter(d => d.status.toLowerCase() === filterStatus.toLowerCase());
  
  return { success: true, message: "Success", data };
};

export const apiApproveLeaveRequest = async (token: string, id: string): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  const target = MOCK_LEAVE_REQUESTS.find(r => r.id === id);
  if (target) {
    target.status = "Disetujui";
  }
  return { success: true, message: "Pengajuan izin berhasil disetujui" };
};

export const apiRejectLeaveRequest = async (token: string, id: string): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  const target = MOCK_LEAVE_REQUESTS.find(r => r.id === id);
  if (target) {
    target.status = "Ditolak";
  }
  return { success: true, message: "Pengajuan izin berhasil ditolak" };
};

// --- MOCK DATA FOR LAPORAN (REPORTS) ADMIN ---
export const apiGetReportAdmin = async (token: string, startDate: string, endDate: string, role: string): Promise<ApiResponse<any>> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const mockData = {
    summary: {
      hadir: 850,
      terlambat: 45,
      izin: 20,
      sakit: 15,
      alpa: 5
    },
    chartData: [
      { name: "Minggu 1", Hadir: 90, Terlambat: 5, TidakHadir: 5 },
      { name: "Minggu 2", Hadir: 95, Terlambat: 2, TidakHadir: 3 },
      { name: "Minggu 3", Hadir: 88, Terlambat: 8, TidakHadir: 4 },
      { name: "Minggu 4", Hadir: 92, Terlambat: 3, TidakHadir: 5 },
    ],
    tableData: [
      { id: 1, nama: "Ahmad Guru", role: "Guru", total_hadir: 20, total_terlambat: 1, total_izin: 1, total_alpa: 0, persentase: "95%" },
      { id: 2, nama: "Siti Aminah", role: "Guru", total_hadir: 19, total_terlambat: 2, total_izin: 0, total_alpa: 2, persentase: "90%" },
      { id: 3, nama: "Budi Santoso", role: "Guru", total_hadir: 22, total_terlambat: 0, total_izin: 0, total_alpa: 0, persentase: "100%" },
      { id: 4, nama: "Ahmad Riyadi", role: "Siswa", total_hadir: 18, total_terlambat: 3, total_izin: 3, total_alpa: 0, persentase: "85%" },
      { id: 5, nama: "Eka Putri", role: "Siswa", total_hadir: 21, total_terlambat: 1, total_izin: 0, total_alpa: 1, persentase: "95%" },
    ]
  };

  if (role !== "all") {
    mockData.tableData = mockData.tableData.filter(d => d.role.toLowerCase() === role);
  }

  return { success: true, message: "Success", data: mockData };
};

// --- MOCK DATA FOR SETTINGS (PENGATURAN) ADMIN ---
const SETTINGS_STORAGE_KEY = "sims_school_settings_data_v1";

const DEFAULT_SETTINGS = {
  schoolName: "SMP Negeri 1 Nusantara",
  npsn: "20104567",
  jenjang: "SMP",
  akreditasi: "A",
  kepalaSekolah: "Drs. H. Mulyadi, M.Pd",
  nipKepalaSekolah: "196805121994031002",
  address: "Jl. Pendidikan No. 123, Kota Pelajar",
  phone: "021-5551234",
  email: "info@smpn1nusantara.sch.id",
  website: "https://smpn1nusantara.sch.id",
  logoSekolah: null,
  logoDinas: null, // Input manual saja, default null
  stempelSekolah: null,
  ttdKepalaSekolah: null,
  hariOperasional: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
  jamMasukGuru: "07:00",
  jamPulangGuru: "15:00",
  modeJadwalGuru: "per_hari", // "seragam" | "per_hari"
  jadwalHarianGuru: {
    "Senin": { masuk: "06:45", pulang: "15:00", aktif: true },
    "Selasa": { masuk: "07:00", pulang: "15:00", aktif: true },
    "Rabu": { masuk: "07:00", pulang: "15:00", aktif: true },
    "Kamis": { masuk: "07:00", pulang: "15:00", aktif: true },
    "Jumat": { masuk: "07:00", pulang: "11:30", aktif: true },
    "Sabtu": { masuk: "07:00", pulang: "13:00", aktif: false },
    "Minggu": { masuk: "07:00", pulang: "12:00", aktif: false }
  },
  jamMasukSiswa: "07:15",
  jamPulangSiswa: "14:00",
  modeJadwalSiswa: "per_hari", // "seragam" | "per_hari"
  jadwalHarianSiswa: {
    "Senin": { masuk: "06:45", pulang: "14:15", aktif: true },
    "Selasa": { masuk: "07:15", pulang: "14:00", aktif: true },
    "Rabu": { masuk: "07:15", pulang: "14:00", aktif: true },
    "Kamis": { masuk: "07:15", pulang: "14:00", aktif: true },
    "Jumat": { masuk: "07:15", pulang: "11:15", aktif: true },
    "Sabtu": { masuk: "07:15", pulang: "12:30", aktif: false },
    "Minggu": { masuk: "07:15", pulang: "12:00", aktif: false }
  },
  toleransiKeterlambatan: "15",
  radiusAbsen: "50",
  koordinatSekolah: "-6.200000, 106.816666",
  requireSelfiePhoto: true,
  enableStrictGeofence: true
};

const getInitialSettings = () => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Hapus data aset visual kecuali logo kiri kop (logoDinas)
      parsed.logoSekolah = null;
      parsed.stempelSekolah = null;
      parsed.ttdKepalaSekolah = null;
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
      return { ...DEFAULT_SETTINGS, ...parsed, logoSekolah: null, stempelSekolah: null, ttdKepalaSekolah: null };
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_SETTINGS;
};

let MOCK_SETTINGS = getInitialSettings();

export const apiGetPublicSettings = async (): Promise<ApiResponse<{ schoolName: string; logoSekolah: string | null; jenjang: string }>> => {
  return {
    success: true,
    message: "Success",
    data: {
      schoolName: MOCK_SETTINGS.schoolName || "Presensi Sekolah Digital",
      logoSekolah: MOCK_SETTINGS.logoSekolah || null,
      jenjang: MOCK_SETTINGS.jenjang || "SMP"
    }
  };
};

export const apiGetSettings = async (token: string): Promise<ApiResponse<any>> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  
  return { 
    success: true, 
    message: "Success", 
    data: { ...MOCK_SETTINGS } 
  };
};

export const apiUpdateSettings = async (token: string, data: any): Promise<ApiResponse> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  MOCK_SETTINGS = { ...MOCK_SETTINGS, ...data };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(MOCK_SETTINGS));
      // Dispatch an event so other tabs or components can update immediately
      window.dispatchEvent(new Event("school-settings-updated"));
    } catch (e) {
      console.error("Gagal simpan pengaturan ke localStorage", e);
    }
  }
  return { success: true, message: "Pengaturan berhasil disimpan dan diterapkan" };
};

// --- MOCK DATA FOR STUDENT DASHBOARD & SELF ATTENDANCE ---
let MOCK_STUDENT_DASHBOARD = {
  summary: {
    totalHadir: 85,
    totalTerlambat: 5,
    totalIzinSakit: 3,
    totalAlpa: 1,
    persentaseKehadiran: 95.5
  },
  today: {
    status: "hadir", // "hadir" | "terlambat" | "belum" | "izin" | "sakit"
    jamMasuk: "06:45",
    jamPulang: "14:30",
    metode: "Mandiri GPS & Selfie",
    lokasi: "Gerbang Utama (Radius 12m)",
    fotoSelfie: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80"
  },
  student: {
    id: "S001",
    nama: "Ahmad Riyadi",
    nis: "2023001",
    nisn: "0087654321",
    kelas: "Kelas 7A",
    wali_kelas: "Ahmad Guru, S.Pd",
    tempat_lahir: "Jakarta",
    tanggal_lahir: "14 Mei 2011",
    jenis_kelamin: "Laki-laki",
    golongan_darah: "O",
    agama: "Islam",
    alamat: "Jl. Merpati No. 45, RT 03/RW 02, Jakarta Selatan",
    no_hp_wali: "0812-9988-7766",
    nama_wali: "Riyadi Pratama (Ayah)",
    foto: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
    berlaku_hingga: "30 Juni 2027",
    barcode: "20230010087654321"
  },
  school: {
    name: "SMP NEGERI 1 NUSANTARA",
    npsn: "20104567",
    jenjang: "SMP",
    akreditasi: "A",
    kepalaSekolah: "Drs. H. Mulyadi, M.Pd",
    nipKepalaSekolah: "196805121994031002",
    alamat: "Jl. Pendidikan No. 123, Kota Pelajar",
    telepon: "021-5551234",
    koordinatSekolah: "-6.200000, 106.816666",
    radiusAbsen: 50
  },
  todaySchedule: [
    { id: "SCH1", jam: "07:15 - 08:45", mapel: "Matematika", guru: "Ahmad Guru, S.Pd", ruang: "Ruang 7A", status: "Selesai" },
    { id: "SCH2", jam: "09:00 - 10:30", mapel: "Bahasa Indonesia", guru: "Siti Aminah, M.Pd", ruang: "Ruang 7A", status: "Berlangsung" },
    { id: "SCH3", jam: "10:45 - 12:15", mapel: "Ilmu Pengetahuan Alam", guru: "Budi Santoso, M.Si", ruang: "Laboratorium IPA", status: "Akan Datang" },
    { id: "SCH4", jam: "13:00 - 14:00", mapel: "Pendidikan Jasmani & Olahraga", guru: "Deni Pratama, S.Pd", ruang: "Lapangan Olahraga", status: "Akan Datang" }
  ],
  recentHistory: [
    { id: "h1", date: "2026-08-25", status: "hadir", in: "06:45", out: "14:30", note: "Tepat Waktu" },
    { id: "h2", date: "2026-08-24", status: "hadir", in: "06:50", out: "14:15", note: "Tepat Waktu" },
    { id: "h3", date: "2026-08-23", status: "terlambat", in: "07:20", out: "14:30", note: "Macet jalanan" },
    { id: "h4", date: "2026-08-22", status: "hadir", in: "06:40", out: "14:05", note: "Tepat Waktu" },
  ]
};

export const apiGetStudentDashboard = async (token: string): Promise<ApiResponse<any>> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  return {
    success: true,
    message: "Success",
    data: { ...MOCK_STUDENT_DASHBOARD }
  };
};

export const apiSubmitStudentSelfAttendance = async (
  token: string,
  type: "masuk" | "pulang",
  lat: number,
  lng: number,
  photoBase64?: string,
  securityMeta?: { accuracy?: number; isMocked?: boolean; timestamp?: number }
): Promise<ApiResponse<any>> => {
  await new Promise(resolve => setTimeout(resolve, 900));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  // 1. Validasi Mock Location
  if (securityMeta?.isMocked) {
    return {
      success: false,
      message: "Terdeteksi aplikasi Mock Location (Fake GPS) aktif pada ponsel Anda. Presensi mandiri dibatalkan demi kejujuran data.",
      error_code: "GPS_MOCK_DETECTED"
    };
  }

  // 2. Validasi Akurasi Sinyal GPS (> 50 meter)
  if (securityMeta?.accuracy !== undefined && securityMeta.accuracy > 50) {
    return {
      success: false,
      message: `Akurasi sinyal GPS terlalu lemah (±${Math.round(securityMeta.accuracy)}m, batas aman maksimal 50m). Sistem mewajibkan sinyal satelit langsung untuk memverifikasi posisi Anda.`,
      error_code: "GPS_LOW_ACCURACY"
    };
  }

  // 3. Validasi Geofence Jarak ke Sekolah (titik pusat sekolah: -6.200000, 106.816666, radius 50m)
  const schoolLat = -6.200000;
  const schoolLng = 106.816666;
  const maxRadius = 50;
  const distance = Math.round(getDistance(lat, lng, schoolLat, schoolLng));

  if (distance > maxRadius) {
    return {
      success: false,
      message: `Posisi Anda terdeteksi berjarak ${distance} meter dari sekolah (melebihi batas radius ${maxRadius} meter). Pastikan Anda telah berada di dalam lingkungan sekolah.`,
      error_code: "GEOFENCE_EXCEEDED"
    };
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const isLate = type === "masuk" && (now.getHours() > 7 || (now.getHours() === 7 && now.getMinutes() > 15));

  if (type === "masuk") {
    MOCK_STUDENT_DASHBOARD.today.status = isLate ? "terlambat" : "hadir";
    MOCK_STUDENT_DASHBOARD.today.jamMasuk = timeStr;
    MOCK_STUDENT_DASHBOARD.today.lokasi = `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)}) ±${Math.round(securityMeta?.accuracy || 12)}m`;
    if (isLate) {
      MOCK_STUDENT_DASHBOARD.summary.totalTerlambat += 1;
    } else {
      MOCK_STUDENT_DASHBOARD.summary.totalHadir += 1;
    }
  } else {
    MOCK_STUDENT_DASHBOARD.today.jamPulang = timeStr;
  }

  return {
    success: true,
    message: `Presensi ${type === "masuk" ? "Masuk" : "Pulang"} berhasil dicatat pada ${timeStr}! Terverifikasi satelit GPS (${distance}m, akurasi ±${Math.round(securityMeta?.accuracy || 12)}m).`,
    data: {
      type,
      time: timeStr,
      status: MOCK_STUDENT_DASHBOARD.today.status,
      distance,
      accuracy: securityMeta?.accuracy || 12,
      isVerified: true
    }
  };
};

// ==========================================
// BRUTE-FORCE PROTECTION & RATE LIMITING
// ==========================================
export interface RateLimitStatus {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
  maxAttempts: number;
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 60; // 60 detik cooldown untuk proteksi serangan brute-force

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

const LOGIN_ATTEMPT_STORE: Record<string, AttemptRecord> = {};

export const getLoginRateLimitStatus = (identifier: string): RateLimitStatus => {
  if (!identifier) {
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0, maxAttempts: MAX_LOGIN_ATTEMPTS };
  }
  const key = identifier.trim().toLowerCase();
  const record = LOGIN_ATTEMPT_STORE[key];
  if (!record) {
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0, maxAttempts: MAX_LOGIN_ATTEMPTS };
  }

  const now = Date.now();
  if (record.lockedUntil && now < record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      isLocked: true,
      remainingSeconds: remaining,
      failedAttempts: record.count,
      maxAttempts: MAX_LOGIN_ATTEMPTS
    };
  }

  // If lockout expired, reset
  if (record.lockedUntil && now >= record.lockedUntil) {
    record.count = 0;
    record.lockedUntil = null;
  }

  return {
    isLocked: false,
    remainingSeconds: 0,
    failedAttempts: record.count,
    maxAttempts: MAX_LOGIN_ATTEMPTS
  };
};

const registerFailedLoginAttempt = (identifier: string): { isLocked: boolean; remainingAttempts: number; lockoutSeconds: number } => {
  const key = identifier.trim().toLowerCase();
  const now = Date.now();
  if (!LOGIN_ATTEMPT_STORE[key]) {
    LOGIN_ATTEMPT_STORE[key] = { count: 0, lockedUntil: null, lastAttempt: now };
  }

  const record = LOGIN_ATTEMPT_STORE[key];
  record.lastAttempt = now;
  record.count += 1;

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + (LOCKOUT_DURATION_SECONDS * 1000);
    return { isLocked: true, remainingAttempts: 0, lockoutSeconds: LOCKOUT_DURATION_SECONDS };
  }

  return {
    isLocked: false,
    remainingAttempts: MAX_LOGIN_ATTEMPTS - record.count,
    lockoutSeconds: 0
  };
};

const clearLoginAttempts = (identifier: string) => {
  const key = identifier.trim().toLowerCase();
  delete LOGIN_ATTEMPT_STORE[key];
};

export const apiLogin = async (username: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  const cleanInput = username.trim().toLowerCase();
  const cleanPhone = username.replace(/[^0-9]/g, "");

  // 0. Cek Proteksi Brute-Force & Rate Limiting
  const rateLimit = getLoginRateLimitStatus(username);
  if (rateLimit.isLocked) {
    return {
      success: false,
      message: `Akses akun ditangguhkan sementara karena terdeteksi ${MAX_LOGIN_ATTEMPTS}x percobaan login salah berturut-turut. Silakan tunggu ${rateLimit.remainingSeconds} detik sebelum mencoba kembali.`,
      error_code: "AUTH_LOCKED"
    };
  }

  // 1. Check Standard Mock Users (guru, admin, satpam, inactive)
  const account = Object.values(MOCK_USERS).find(u => u.user.username.toLowerCase() === cleanInput);

  if (account) {
    if (account.password_hash !== password) {
      const failure = registerFailedLoginAttempt(username);
      if (failure.isLocked) {
        return {
          success: false,
          message: `Terlalu banyak percobaan gagal (${MAX_LOGIN_ATTEMPTS}/${MAX_LOGIN_ATTEMPTS}). Akun dikunci sementara selama ${failure.lockoutSeconds} detik demi keamanan (Brute-Force Protection).`,
          error_code: "AUTH_LOCKED"
        };
      }
      return {
        success: false,
        message: `Username atau password salah. (Sisa kesempatan: ${failure.remainingAttempts}x sebelum akun dikunci)`,
        error_code: "AUTH_INVALID"
      };
    }

    if (account.user.status !== "active") {
      return {
        success: false,
        message: "Akun Anda tidak aktif. Silakan hubungi admin.",
        error_code: "USER_INACTIVE"
      };
    }

    // Sukses: Bersihkan catatan kegagalan rate limit
    clearLoginAttempts(username);

    return {
      success: true,
      message: "Login berhasil",
      data: {
        user: account.user,
        token: account.token
      }
    };
  }

  // 1.5 Smart Teacher Check: Guru Terdaftar (via NIP, NUPTK, Email, atau No. HP)
  const teacherMatch = MOCK_GURU_LIST.find((g) => {
    const gNip = (g.nip || "").toString().toLowerCase().trim();
    const gNuptk = (g.nuptk || "").toString().toLowerCase().trim();
    const gEmail = (g.email || "").toString().toLowerCase().trim();
    const gHp = (g.no_hp || "").replace(/[^0-9]/g, "");

    if (gNip && gNip === cleanInput) return true;
    if (gNuptk && gNuptk === cleanInput) return true;
    if (gEmail && gEmail === cleanInput) return true;
    if (cleanPhone.length >= 7 && gHp) {
      return gHp === cleanPhone || gHp.endsWith(cleanPhone.slice(-8)) || cleanPhone.endsWith(gHp.slice(-8));
    }
    return false;
  });

  if (teacherMatch) {
    const isPasswordValid = 
      password === "password" || 
      (teacherMatch.nip && password === teacherMatch.nip) ||
      (teacherMatch.nuptk && password === teacherMatch.nuptk) ||
      (password.length >= 4 && password !== "1234");

    if (!isPasswordValid) {
      const failure = registerFailedLoginAttempt(username);
      if (failure.isLocked) {
        return {
          success: false,
          message: `Terlalu banyak percobaan gagal (${MAX_LOGIN_ATTEMPTS}/${MAX_LOGIN_ATTEMPTS}). Akun dikunci sementara selama ${failure.lockoutSeconds} detik demi keamanan (Brute-Force Protection).`,
          error_code: "AUTH_LOCKED"
        };
      }
      return {
        success: false,
        message: `Password salah. (Sisa kesempatan: ${failure.remainingAttempts}x sebelum akun dikunci)`,
        error_code: "AUTH_INVALID"
      };
    }

    if (teacherMatch.status && teacherMatch.status !== "Aktif") {
      return {
        success: false,
        message: `Akun Guru (${teacherMatch.nama}) berstatus ${teacherMatch.status}. Silakan hubungi admin sekolah.`,
        error_code: "USER_INACTIVE"
      };
    }

    clearLoginAttempts(username);

    return {
      success: true,
      message: "Login Guru berhasil",
      data: {
        user: {
          user_id: teacherMatch.user_id || teacherMatch.id,
          username: teacherMatch.nip || teacherMatch.email || teacherMatch.nama,
          role: "guru",
          name: teacherMatch.nama,
          reference_id: teacherMatch.id,
          status: "active",
          foto: teacherMatch.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherMatch.nama)}&background=0D8ABC&color=fff`
        },
        token: `token-guru-${teacherMatch.id}-${Date.now()}`
      }
    };
  }

  // 2. Smart Universal Check: Wali Murid (via 'wali' alias, No. WhatsApp Wali, or Student NISN/NIS)
  let studentMatch = null;
  if (cleanInput === "wali") {
    studentMatch = MOCK_SISWA_LIST[0]; // Default demo wali: Wali dari Ahmad Riyadi
  } else {
    studentMatch = MOCK_SISWA_LIST.find((s) => {
      const sNisn = (s.nisn || "").toString().toLowerCase().trim();
      const sNis = (s.nis || "").toString().toLowerCase().trim();
      const isNisnMatch = sNisn === cleanInput || sNis === cleanInput;
      if (isNisnMatch) return true;

      const sWa = (s.no_wa_wali || "").replace(/[^0-9]/g, "");
      if (cleanPhone.length >= 7 && sWa) {
        return sWa === cleanPhone || sWa.endsWith(cleanPhone.slice(-8)) || cleanPhone.endsWith(sWa.slice(-8));
      }
      return false;
    });
  }

  if (studentMatch) {
    // Check password (accept "password", student's NISN, or password length >= 4)
    if (password !== "password" && password !== studentMatch.nisn && password.length < 4) {
      const failure = registerFailedLoginAttempt(username);
      if (failure.isLocked) {
        return {
          success: false,
          message: `Terlalu banyak percobaan gagal (${MAX_LOGIN_ATTEMPTS}/${MAX_LOGIN_ATTEMPTS}). Akun dikunci sementara selama ${failure.lockoutSeconds} detik demi keamanan (Brute-Force Protection).`,
          error_code: "AUTH_LOCKED"
        };
      }
      return {
        success: false,
        message: `Password salah. (Sisa kesempatan: ${failure.remainingAttempts}x sebelum akun dikunci)`,
        error_code: "AUTH_INVALID"
      };
    }

    // Sukses: Bersihkan catatan kegagalan rate limit
    clearLoginAttempts(username);

    const waliUser: User = {
      user_id: `WALI-${studentMatch.id}`,
      username: studentMatch.no_wa_wali || studentMatch.nisn,
      role: "wali",
      name: studentMatch.nama_wali || `Wali dari ${studentMatch.nama}`,
      reference_id: studentMatch.id,
      status: "active",
      foto: `https://ui-avatars.com/api/?name=${encodeURIComponent(studentMatch.nama_wali || "Wali")}&background=2563eb&color=fff`,
      student_data: {
        id: studentMatch.id,
        nama: studentMatch.nama,
        nis: studentMatch.nis,
        nisn: studentMatch.nisn,
        kelas_nama: studentMatch.kelas_nama,
        foto: studentMatch.foto,
        nama_wali: studentMatch.nama_wali,
        no_wa_wali: studentMatch.no_wa_wali,
        hubungan_wali: studentMatch.hubungan_wali || "Orang Tua / Wali"
      }
    };

    return {
      success: true,
      message: `Selamat datang, ${waliUser.name}!`,
      data: {
        user: waliUser,
        token: `mock-token-wali-${studentMatch.id}`
      }
    };
  }

  // Jika akun sama sekali tidak ditemukan
  const failure = registerFailedLoginAttempt(username);
  if (failure.isLocked) {
    return {
      success: false,
      message: `Terlalu banyak percobaan gagal (${MAX_LOGIN_ATTEMPTS}/${MAX_LOGIN_ATTEMPTS}). Sesi login dikunci selama ${failure.lockoutSeconds} detik demi keamanan (Brute-Force Protection).`,
      error_code: "AUTH_LOCKED"
    };
  }

  return {
    success: false,
    message: `Identitas atau password salah. (Sisa kesempatan: ${failure.remainingAttempts}x sebelum akun dikunci)`,
    error_code: "AUTH_INVALID"
  };
};

// ==========================================
// PORTAL WALI MURID & IN-APP NOTIFICATIONS
// ==========================================

const PARENT_NOTIF_KEY = "school_parent_notifications_v1";

const DEFAULT_PARENT_NOTIFS: ParentNotification[] = [];

export const getStoredParentNotifications = (): ParentNotification[] => {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(PARENT_NOTIF_KEY) : null;
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

export const apiCreateParentNotification = (
  data: Omit<ParentNotification, "id" | "isRead">
): ParentNotification => {
  const current = getStoredParentNotifications();
  const newNotif: ParentNotification = {
    ...data,
    id: `NOTIF-${Date.now().toString().slice(-6)}`,
    isRead: false
  };
  const updated = [newNotif, ...current];
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(PARENT_NOTIF_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    // ignore
  }
  return newNotif;
};

export const apiGetParentNotifications = async (
  studentId: string
): Promise<ApiResponse<ParentNotification[]>> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const allNotifs = getStoredParentNotifications();
  const filtered = allNotifs.filter(
    (n) => !n.student_id || n.student_id === studentId
  );
  return {
    success: true,
    message: "Success",
    data: filtered
  };
};

export const apiMarkParentNotificationRead = async (
  studentId: string,
  notifId?: string
): Promise<ApiResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const allNotifs = getStoredParentNotifications();
  const updated = allNotifs.map((n) => {
    if (notifId) {
      if (n.id === notifId) return { ...n, isRead: true };
    } else {
      if (!n.student_id || n.student_id === studentId) return { ...n, isRead: true };
    }
    return n;
  });
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(PARENT_NOTIF_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    // ignore
  }
  return { success: true, message: "Notifikasi diperbarui" };
};

export const apiLoginWali = async (
  nisnOrNis: string,
  noWa: string
): Promise<ApiResponse<{ user: User; token: string }>> => {
  await new Promise((resolve) => setTimeout(resolve, 700));

  const cleanInputNisn = nisnOrNis.trim().toLowerCase();
  const cleanInputWa = noWa.replace(/[^0-9]/g, "");

  if (!cleanInputNisn || !cleanInputWa) {
    return {
      success: false,
      message: "Harap masukkan NISN anak dan Nomor WhatsApp Wali Murid.",
      error_code: "INPUT_EMPTY"
    };
  }

  // Find in MOCK_SISWA_LIST
  const student = MOCK_SISWA_LIST.find((s) => {
    const sNisn = (s.nisn || "").toString().toLowerCase().trim();
    const sNis = (s.nis || "").toString().toLowerCase().trim();
    const isNisnMatch = sNisn === cleanInputNisn || sNis === cleanInputNisn;
    if (!isNisnMatch) return false;

    const sWa = (s.no_wa_wali || "").replace(/[^0-9]/g, "");
    if (!sWa) return false;

    return (
      sWa === cleanInputWa ||
      sWa.endsWith(cleanInputWa.slice(-8)) ||
      cleanInputWa.endsWith(sWa.slice(-8))
    );
  });

  if (!student) {
    return {
      success: false,
      message: "Data anak (NISN) dan No. WhatsApp tidak cocok dengan data sekolah. Pastikan nomor sudah didaftarkan.",
      error_code: "WALI_NOT_FOUND"
    };
  }

  const user: User = {
    user_id: `WALI-${student.id}`,
    username: student.no_wa_wali,
    role: "wali",
    name: student.nama_wali || `Wali dari ${student.nama}`,
    reference_id: student.id,
    status: "active",
    foto: `https://ui-avatars.com/api/?name=${encodeURIComponent(student.nama_wali || "Wali")}&background=2563eb&color=fff`,
    student_data: {
      id: student.id,
      nama: student.nama,
      nis: student.nis,
      nisn: student.nisn,
      kelas_nama: student.kelas_nama,
      foto: student.foto,
      nama_wali: student.nama_wali,
      no_wa_wali: student.no_wa_wali,
      hubungan_wali: student.hubungan_wali || "Orang Tua / Wali"
    }
  };

  return {
    success: true,
    message: `Selamat datang, ${user.name}!`,
    data: {
      user,
      token: `mock-token-wali-${student.id}`
    }
  };
};

export const apiGetWaliStudentDetail = async (studentId: string): Promise<ApiResponse<any>> => {
  await new Promise((r) => setTimeout(r, 400));
  const student = MOCK_SISWA_LIST.find((s) => s.id === studentId) || (MOCK_SISWA_LIST.length > 0 ? MOCK_SISWA_LIST[0] : null);
  if (!student) {
    return { success: false, message: "Data siswa belum tersedia" };
  }

  const today = new Date().toISOString().split("T")[0];
  const todayRecords = MOCK_GATE_STREAM.filter(
    (g) => g.personId === student.id && g.dateStr === today
  );

  const masukRecord = todayRecords.find((r) => r.mode === "masuk");
  const pulangRecord = todayRecords.find((r) => r.mode === "pulang");

  return {
    success: true,
    message: "Success",
    data: {
      student,
      todayAttendance: {
        masuk: masukRecord ? masukRecord.timeStr : "06:42 WIB",
        pulang: pulangRecord ? pulangRecord.timeStr : null,
        status: masukRecord ? masukRecord.status : "Hadir",
        menitKeterlambatan: masukRecord ? masukRecord.menitKeterlambatan : 0,
        gate: masukRecord?.metodeScan || "Gerbang Utama"
      },
      statsBulanIni: {
        totalHari: 22,
        hadir: 20,
        terlambat: 1,
        izin: 1,
        sakit: 0,
        alpa: 0,
        persentase: 95
      },
      riwayat: [
        { tanggal: "15 Sep 2026", hari: "Selasa", masuk: masukRecord ? masukRecord.timeStr : "06:42 WIB", pulang: pulangRecord ? pulangRecord.timeStr : "-", status: masukRecord ? masukRecord.status : "Hadir" },
        { tanggal: "14 Sep 2026", hari: "Senin", masuk: "06:38 WIB", pulang: "15:30 WIB", status: "Hadir" },
        { tanggal: "12 Sep 2026", hari: "Jumat", masuk: "06:45 WIB", pulang: "11:30 WIB", status: "Hadir" },
        { tanggal: "11 Sep 2026", hari: "Kamis", masuk: "07:22 WIB", pulang: "15:25 WIB", status: "Terlambat" },
        { tanggal: "10 Sep 2026", hari: "Rabu", masuk: "06:40 WIB", pulang: "15:30 WIB", status: "Hadir" },
        { tanggal: "09 Sep 2026", hari: "Selasa", masuk: "-", pulang: "-", status: "Izin" },
        { tanggal: "08 Sep 2026", hari: "Senin", masuk: "06:35 WIB", pulang: "15:30 WIB", status: "Hadir" }
      ]
    }
  };
};

export const apiSubmitParentLeave = async (
  studentId: string,
  data: {
    jenis: "izin" | "sakit";
    tanggal_mulai: string;
    tanggal_selesai: string;
    alasan: string;
    lampiran?: string | null;
  }
): Promise<ApiResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const student = MOCK_SISWA_LIST.find((s) => s.id === studentId);
  const studentName = student ? student.nama : "Ananda";

  // Create an in-app notification confirming the leave request
  apiCreateParentNotification({
    student_id: studentId,
    student_name: studentName,
    student_nisn: student?.nisn || "",
    title: `Pengajuan ${data.jenis === "sakit" ? "Surat Sakit" : "Izin"} Terkirim`,
    message: `Permohonan ${data.jenis.toUpperCase()} untuk ananda ${studentName} dari tgl ${data.tanggal_mulai} s.d ${data.tanggal_selesai} telah diteruskan ke pihak sekolah untuk diverifikasi.`,
    type: data.jenis,
    timestamp: new Date().toISOString(),
    timeStr: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
    dateStr: "Hari ini"
  });

  return {
    success: true,
    message: "Surat permohonan izin/sakit ananda berhasil dikirim ke sekolah."
  };
};
// ==========================================

export interface WhatsAppConfig {
  provider: "fonnte" | "wablas" | "ruangwa" | "custom";
  apiKey: string;
  senderNumber: string;
  senderDeviceName: string;
  deviceStatus: "connected" | "disconnected" | "connecting";
  isActive: boolean;
  notifyOnHadir: boolean;
  notifyOnTerlambat: boolean;
  notifyOnAlpa: boolean;
  notifyOnIzin: boolean;
  templates: {
    hadir: string;
    terlambat: string;
    alpa: string;
    izin: string;
  };
}

export interface WhatsAppLog {
  id: string;
  tanggal_kirim: string;
  jam_kirim: string;
  siswa_id: string;
  siswa_nama: string;
  kelas_nama: string;
  wali_nama: string;
  no_wa: string;
  status_kehadiran: "Hadir" | "Terlambat" | "Alpa" | "Izin" | "Sakit";
  status_kirim: "Terkirim" | "Gagal" | "Antrean";
  pesan_singkat: string;
  error_message?: string;
}

const WHATSAPP_STORAGE_KEY = "sims_whatsapp_config_v1";

const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  provider: "fonnte",
  apiKey: "",
  senderNumber: "",
  senderDeviceName: "Bot Presensi Sekolah",
  deviceStatus: "disconnected",
  isActive: true,
  notifyOnHadir: true,
  notifyOnTerlambat: true,
  notifyOnAlpa: true,
  notifyOnIzin: true,
  templates: {
    hadir: "Yth. Bapak/Ibu {nama_wali},\n\nKami menginformasikan bahwa ananda:\nNama: *{nama_siswa}*\nKelas: *{kelas}*\n\nTelah *HADIR* di sekolah pada jam {jam}, tanggal {tanggal} untuk mata pelajaran {mata_pelajaran} bersama Guru {nama_guru}.\n\nTerima kasih atas kerja samanya.\n_{sekolah}_",
    terlambat: "⚠️ *PEMBERITAHUAN KETERLAMBATAN*\n\nYth. Bapak/Ibu {nama_wali},\n\nKami menginformasikan bahwa:\nNama: *{nama_siswa}*\nKelas: *{kelas}*\n\nTercatat *TERLAMBAT* tiba di sekolah pada jam {jam}, tanggal {tanggal} (Batas masuk: 07:15).\n\nMohon bantuannya untuk mengingatkan ananda agar berangkat lebih awal.\n_{sekolah}_",
    alpa: "🚨 *PERINGATAN KETIDAKHADIRAN (ALPA)*\n\nYth. Bapak/Ibu {nama_wali},\n\nKami memberitahukan bahwa ananda:\nNama: *{nama_siswa}*\nKelas: *{kelas}*\nTanggal: *{tanggal}*\n\n*TIDAK HADIR (TANPA KETERANGAN)* pada kegiatan belajar hari ini.\n\nMohon segera konfirmasi keberadaan ananda atau hubungi pihak sekolah / wali kelas.\n_{sekolah}_",
    izin: "📋 *PEMBERITAHUAN IZIN / SAKIT*\n\nYth. Bapak/Ibu {nama_wali},\n\nStatus presensi ananda:\nNama: *{nama_siswa}*\nKelas: *{kelas}*\nTanggal: *{tanggal}*\n\nTelah tercatat: *{status}* ({keterangan}). Semoga ananda lekas sembuh dan dapat kembali beraktivitas dengan baik.\n_{sekolah}_"
  }
};

const getInitialWhatsAppConfig = (): WhatsAppConfig => {
  if (typeof window === "undefined") return DEFAULT_WHATSAPP_CONFIG;
  try {
    const raw = localStorage.getItem(WHATSAPP_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_WHATSAPP_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_WHATSAPP_CONFIG;
};

let MOCK_WHATSAPP_CONFIG: WhatsAppConfig = getInitialWhatsAppConfig();
let MOCK_WHATSAPP_LOGS: WhatsAppLog[] = [];

export const apiGetWhatsAppSettings = async (token: string): Promise<ApiResponse<WhatsAppConfig>> => {
  await new Promise(r => setTimeout(r, 200));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  return { success: true, message: "Success", data: { ...MOCK_WHATSAPP_CONFIG } };
};

export const apiUpdateWhatsAppSettings = async (token: string, newConfig: Partial<WhatsAppConfig>): Promise<ApiResponse<WhatsAppConfig>> => {
  await new Promise(r => setTimeout(r, 300));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };
  MOCK_WHATSAPP_CONFIG = { ...MOCK_WHATSAPP_CONFIG, ...newConfig };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(WHATSAPP_STORAGE_KEY, JSON.stringify(MOCK_WHATSAPP_CONFIG));
    } catch (e) {
      // ignore
    }
  }
  return { success: true, message: "Pengaturan WhatsApp Gateway berhasil disimpan.", data: { ...MOCK_WHATSAPP_CONFIG } };
};

export interface DeviceStatusResult {
  deviceStatus: "connected" | "disconnected" | "demo";
  device?: string | null;
  name?: string | null;
  quota?: number | null;
  package?: string | null;
  expired?: string | null;
  message: string;
  raw?: any;
}

export const apiCheckWhatsAppDevice = async (
  token: string,
  apiKey: string,
  provider: string = "fonnte"
): Promise<ApiResponse<DeviceStatusResult>> => {
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  try {
    const res = await fetch("/api/whatsapp/check-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, provider })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      // Update local state config
      MOCK_WHATSAPP_CONFIG = {
        ...MOCK_WHATSAPP_CONFIG,
        apiKey,
        provider: provider as any,
        deviceStatus: data.deviceStatus === "connected" ? "connected" : "disconnected",
        senderNumber: data.device || MOCK_WHATSAPP_CONFIG.senderNumber,
        senderDeviceName: data.name || MOCK_WHATSAPP_CONFIG.senderDeviceName
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(WHATSAPP_STORAGE_KEY, JSON.stringify(MOCK_WHATSAPP_CONFIG));
        } catch (e) {}
      }

      return {
        success: true,
        message: data.message,
        data: data
      };
    } else {
      return {
        success: false,
        message: data.message || "Gagal menghubungkan ke gateway WhatsApp",
        data: data
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: "Gagal memverifikasi status gateway: " + err.message
    };
  }
};

export const apiGetWhatsAppQr = async (
  token: string,
  apiKey: string
): Promise<ApiResponse<{ qrUrl?: string; message: string }>> => {
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  try {
    const res = await fetch("/api/whatsapp/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey })
    });
    const data = await res.json();
    return {
      success: data.success,
      message: data.message,
      data: { qrUrl: data.qrUrl, message: data.message }
    };
  } catch (err: any) {
    return {
      success: false,
      message: "Gagal meminta QR code Fonnte: " + err.message
    };
  }
};

export const apiSendTestWhatsApp = async (
  token: string,
  targetPhone: string,
  message: string,
  apiKey?: string,
  provider?: string
): Promise<ApiResponse<{ log_id: string; delivered_at: string; detail?: any }>> => {
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  if (!targetPhone || targetPhone.length < 8) {
    return { success: false, message: "Nomor WhatsApp tujuan tidak valid. Contoh: 081234567890" };
  }

  const effectiveKey = apiKey || MOCK_WHATSAPP_CONFIG.apiKey;
  const effectiveProvider = provider || MOCK_WHATSAPP_CONFIG.provider;

  const logId = `WAL-TEST-${Date.now().toString().slice(-4)}`;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateStr = now.toISOString().split('T')[0];

  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: effectiveKey,
        targetPhone,
        message,
        provider: effectiveProvider
      })
    });

    const result = await res.json();

    const isSuccess = Boolean(result.success);

    const testLog: WhatsAppLog = {
      id: logId,
      tanggal_kirim: dateStr,
      jam_kirim: timeStr,
      siswa_id: "TEST",
      siswa_nama: "Uji Coba Pengiriman",
      kelas_nama: "Simulasi",
      wali_nama: "Penerima Uji",
      no_wa: targetPhone,
      status_kehadiran: "Hadir",
      status_kirim: isSuccess ? "Terkirim" : "Gagal",
      pesan_singkat: `Uji Coba: ${message.slice(0, 35)}...`,
      error_message: isSuccess ? undefined : result.message
    };

    MOCK_WHATSAPP_LOGS.unshift(testLog);

    if (isSuccess) {
      return {
        success: true,
        message: result.message || `Pesan uji coba WhatsApp berhasil dikirim ke ${targetPhone}!`,
        data: { log_id: logId, delivered_at: `${dateStr} ${timeStr}`, detail: result.detail }
      };
    } else {
      return {
        success: false,
        message: result.message || "Pengiriman pesan uji coba gagal.",
        data: { log_id: logId, delivered_at: `${dateStr} ${timeStr}`, detail: result.detail }
      };
    }
  } catch (err: any) {
    const testLog: WhatsAppLog = {
      id: logId,
      tanggal_kirim: dateStr,
      jam_kirim: timeStr,
      siswa_id: "TEST",
      siswa_nama: "Uji Coba Pengiriman",
      kelas_nama: "Simulasi",
      wali_nama: "Penerima Uji",
      no_wa: targetPhone,
      status_kehadiran: "Hadir",
      status_kirim: "Gagal",
      pesan_singkat: `Uji Coba: ${message.slice(0, 35)}...`,
      error_message: err.message
    };
    MOCK_WHATSAPP_LOGS.unshift(testLog);

    return {
      success: false,
      message: "Gagal menghubungi server WhatsApp: " + err.message
    };
  }
};

export const apiGetWhatsAppLogs = async (
  token: string,
  filterStatus?: string,
  searchQuery?: string
): Promise<ApiResponse<WhatsAppLog[]>> => {
  await new Promise(r => setTimeout(r, 400));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  let list = [...MOCK_WHATSAPP_LOGS];
  if (filterStatus && filterStatus !== "all") {
    list = list.filter(l => l.status_kehadiran.toLowerCase() === filterStatus.toLowerCase() || l.status_kirim.toLowerCase() === filterStatus.toLowerCase());
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(l => 
      l.siswa_nama.toLowerCase().includes(q) || 
      l.wali_nama.toLowerCase().includes(q) || 
      l.no_wa.includes(q)
    );
  }

  return { success: true, message: "Success", data: list };
};

export const apiResendWhatsApp = async (token: string, logId: string): Promise<ApiResponse<WhatsAppLog>> => {
  await new Promise(r => setTimeout(r, 700));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const targetIndex = MOCK_WHATSAPP_LOGS.findIndex(l => l.id === logId);
  if (targetIndex === -1) {
    return { success: false, message: "Log pesan tidak ditemukan." };
  }

  const updated: WhatsAppLog = {
    ...MOCK_WHATSAPP_LOGS[targetIndex],
    status_kirim: "Terkirim",
    jam_kirim: new Date().toTimeString().slice(0, 5)
  };
  MOCK_WHATSAPP_LOGS[targetIndex] = updated;

  return { success: true, message: `Pesan berhasil dikirim ulang ke ${updated.no_wa} (${updated.wali_nama}).`, data: updated };
};

export const apiBulkSendAttendanceWhatsApp = async (
  token: string,
  data: {
    scheduleName: string;
    className: string;
    teacherName: string;
    studentsAttendance: {
      studentId: string;
      studentName: string;
      waliName?: string;
      noWaWali?: string;
      status: string; // Hadir, Terlambat, Sakit, Izin, Alpa
    }[];
  }
): Promise<ApiResponse<{ totalSent: number; details: { studentName: string; waliName: string; status: string }[] }>> => {
  await new Promise(r => setTimeout(r, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateStr = now.toISOString().split('T')[0];

  const sentDetails: { studentName: string; waliName: string; status: string }[] = [];

  data.studentsAttendance.forEach(item => {
    const statusLower = item.status.toLowerCase();
    let shouldSend = false;
    if (statusLower === "hadir" && MOCK_WHATSAPP_CONFIG.notifyOnHadir) shouldSend = true;
    if (statusLower === "terlambat" && MOCK_WHATSAPP_CONFIG.notifyOnTerlambat) shouldSend = true;
    if (statusLower === "alpa" && MOCK_WHATSAPP_CONFIG.notifyOnAlpa) shouldSend = true;
    if ((statusLower === "izin" || statusLower === "sakit") && MOCK_WHATSAPP_CONFIG.notifyOnIzin) shouldSend = true;

    if (shouldSend && item.noWaWali) {
      const newLog: WhatsAppLog = {
        id: `WAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tanggal_kirim: dateStr,
        jam_kirim: timeStr,
        siswa_id: item.studentId,
        siswa_nama: item.studentName,
        kelas_nama: data.className,
        wali_nama: item.waliName || "Wali Murid",
        no_wa: item.noWaWali,
        status_kehadiran: (item.status as any) || "Hadir",
        status_kirim: "Terkirim",
        pesan_singkat: `Notifikasi Presensi: ${item.status} (${data.scheduleName})`
      };
      MOCK_WHATSAPP_LOGS.unshift(newLog);
      sentDetails.push({
        studentName: item.studentName,
        waliName: item.waliName || "Wali Murid",
        status: item.status
      });
    }
  });

  return {
    success: true,
    message: `${sentDetails.length} notifikasi WhatsApp berhasil dikirimkan ke orang tua siswa.`,
    data: {
      totalSent: sentDetails.length,
      details: sentDetails
    }
  };
};

// ==========================================
// PHASE 45: EKSPOR LAPORAN REKAP EXCEL (XLSX) & PDF BULANAN
// ==========================================

export interface StudentMonthlyAttendanceRow {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  jk: "L" | "P";
  dailyStatus: Record<number, "H" | "T" | "S" | "I" | "A" | "-" | "L">; // 1 to 31
  totalHadir: number;
  totalTerlambat: number;
  totalSakit: number;
  totalIzin: number;
  totalAlpa: number;
  persentase: number;
}

export interface MonthlyClassAttendanceReport {
  classId: string;
  className: string;
  waliKelas: string;
  nipWaliKelas: string;
  semester: string;
  tahunAjaran: string;
  bulanAngka: number;
  bulanNama: string;
  tahun: number;
  hariEfektif: number;
  daysInMonth: number;
  students: StudentMonthlyAttendanceRow[];
  summary: {
    totalSiswa: number;
    totalLaki: number;
    totalPerempuan: number;
    rataRataKehadiran: number;
    totalHadir: number;
    totalTerlambat: number;
    totalSakit: number;
    totalIzin: number;
    totalAlpa: number;
  };
  catatanWaliKelas: string;
}

export interface StudentSemesterAttendanceRow {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  jk: "L" | "P";
  monthlyBreakdown: {
    monthName: string;
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    terlambat: number;
  }[];
  totalHadir: number;
  totalTerlambat: number;
  totalSakit: number;
  totalIzin: number;
  totalAlpa: number;
  totalHariEfektif: number;
  persentase: number;
  predikat: "Sangat Baik" | "Baik" | "Cukup" | "Perlu Pembinaan";
}

export interface SemesterClassAttendanceReport {
  classId: string;
  className: string;
  waliKelas: string;
  nipWaliKelas: string;
  semester: "Semester Ganjil" | "Semester Genap";
  tahunAjaran: string;
  tahun: number;
  totalHariEfektif: number;
  monthsList: string[];
  students: StudentSemesterAttendanceRow[];
  summary: {
    totalSiswa: number;
    totalLaki: number;
    totalPerempuan: number;
    rataRataKehadiran: number;
    totalHadir: number;
    totalTerlambat: number;
    totalSakit: number;
    totalIzin: number;
    totalAlpa: number;
  };
  catatanWaliKelas: string;
}

export interface SubjectGradeItem {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  kktp: number;
  formatif1: number;
  formatif2: number;
  rataFormatif: number;
  sts: number;
  sas: number;
  nilaiAkhir: number;
  predikat: "A" | "B" | "C" | "D";
  capaianTertinggi?: string;
  perluPeningkatan?: string;
}

export interface StudentGradeRow {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  jk: "L" | "P";
  subjectGrades: Record<string, SubjectGradeItem>;
  totalNilai: number;
  rataRataNilai: number;
  ranking: number;
  presensi: {
    sakit: number;
    izin: number;
    alpa: number;
    persentaseHadir: number;
  };
  statusKelulusan: "Tuntas" | "Belum Tuntas";
  catatanWaliKelas?: string;
}

export interface ClassGradeLegerReport {
  classId: string;
  className: string;
  waliKelas: string;
  nipWaliKelas: string;
  semester: "Semester Ganjil" | "Semester Genap";
  tahunAjaran: string;
  tahun: number;
  kurikulum: "Kurikulum Merdeka" | "Kurikulum 2013";
  kktpStandar: number;
  subjects: {
    id: string;
    code: string;
    name: string;
    kktp: number;
    guruPengampu: string;
  }[];
  students: StudentGradeRow[];
  summary: {
    totalSiswa: number;
    totalLaki: number;
    totalPerempuan: number;
    rataRataKelas: number;
    nilaiTertinggi: number;
    nilaiTerendah: number;
    persentaseKetuntasan: number;
    subjectAverages: Record<string, number>;
  };
  catatanKurikulum: string;
}

export interface TeacherMonthlyAttendanceRow {
  id: string;
  nip: string;
  nama: string;
  mapel: string;
  hariKerja: number;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alpa: number;
  cuti: number;
  persentase: number;
  keterangan: string;
}

const INDO_MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export const apiGetMonthlyClassReport = async (
  token: string,
  classId: string,
  monthIndex: number, // 0 = Jan, 8 = Sept
  year: number = 2026
): Promise<ApiResponse<MonthlyClassAttendanceReport>> => {
  await new Promise(r => setTimeout(r, 450));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const targetClass = MOCK_CLASSES.find(c => c.id === classId) || (MOCK_CLASSES.length > 0 ? MOCK_CLASSES[0] : { id: classId || "C1", name: classId ? `Kelas ${classId}` : "Belum Ada Kelas", wali_kelas: "-" });
  const classStudents = MOCK_SISWA_LIST.filter(s => s.kelas_id === targetClass.id || s.kelas_id === classId);
  const studentsToUse = classStudents;

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let hariEfektif = 0;

  // Determine effective working days (exclude Sunday = 0 and Saturday = 6)
  const isWeekendDay: Record<number, boolean> = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      isWeekendDay[day] = true;
    } else {
      isWeekendDay[day] = false;
      hariEfektif++;
    }
  }

  // Pre-seed patterns per student
  const studentRows: StudentMonthlyAttendanceRow[] = studentsToUse.map((s, idx) => {
    const dailyStatus: Record<number, "H" | "T" | "S" | "I" | "A" | "-" | "L"> = {};
    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      if (isWeekendDay[day]) {
        dailyStatus[day] = "L"; // Libur akhir pekan
      } else {
        const seed = (idx * 7 + day * 3) % 100;
        if (idx === 3 && (day === 4 || day === 5)) {
          dailyStatus[day] = "S";
          sakit++;
        } else if (idx === 5 && day === 12) {
          dailyStatus[day] = "A";
          alpa++;
        } else if (idx === 1 && day === 8) {
          dailyStatus[day] = "I";
          izin++;
        } else if (seed > 88) {
          dailyStatus[day] = "T";
          terlambat++;
        } else {
          dailyStatus[day] = "H";
          hadir++;
        }
      }
    }

    const effectiveAttended = hadir + terlambat;
    const persentase = hariEfektif > 0 ? Math.round((effectiveAttended / hariEfektif) * 100) : 0;

    return {
      id: s.id,
      nis: (s as any).nis || `202300${idx + 1}`,
      nisn: (s as any).nisn || `008765432${idx + 1}`,
      name: s.nama || s.name || `Siswa ${idx + 1}`,
      jk: ((s as any).jk as "L" | "P") || (idx % 2 === 0 ? "L" : "P"),
      dailyStatus,
      totalHadir: hadir,
      totalTerlambat: terlambat,
      totalSakit: sakit,
      totalIzin: izin,
      totalAlpa: alpa,
      persentase
    };
  });

  const totalLaki = studentRows.filter(s => s.jk === "L").length;
  const totalPerempuan = studentRows.filter(s => s.jk === "P").length;
  const avgPersen = studentRows.length > 0 ? Math.round(studentRows.reduce((acc, s) => acc + s.persentase, 0) / studentRows.length) : 0;

  const totalHadirAll = studentRows.reduce((acc, s) => acc + s.totalHadir, 0);
  const totalTerlambatAll = studentRows.reduce((acc, s) => acc + s.totalTerlambat, 0);
  const totalSakitAll = studentRows.reduce((acc, s) => acc + s.totalSakit, 0);
  const totalIzinAll = studentRows.reduce((acc, s) => acc + s.totalIzin, 0);
  const totalAlpaAll = studentRows.reduce((acc, s) => acc + s.totalAlpa, 0);

  const report: MonthlyClassAttendanceReport = {
    classId: targetClass.id,
    className: targetClass.name,
    waliKelas: targetClass.wali_kelas || "Wali Kelas",
    nipWaliKelas: targetClass.nip_wali_kelas || "-",
    semester: monthIndex < 6 ? "Semester Genap" : "Semester Ganjil",
    tahunAjaran: `${year}/${year + 1}`,
    bulanAngka: monthIndex + 1,
    bulanNama: INDO_MONTH_NAMES[monthIndex] || "September",
    tahun: year,
    hariEfektif,
    daysInMonth,
    students: studentRows,
    summary: {
      totalSiswa: studentRows.length,
      totalLaki,
      totalPerempuan,
      rataRataKehadiran: avgPersen,
      totalHadir: totalHadirAll,
      totalTerlambat: totalTerlambatAll,
      totalSakit: totalSakitAll,
      totalIzin: totalIzinAll,
      totalAlpa: totalAlpaAll
    },
    catatanWaliKelas: studentRows.length > 0
      ? "Laporan rekap presensi kelas bulanan siap untuk diarsipkan dan ditandatangani."
      : "Belum ada data siswa pada rombel ini."
  };

  return { success: true, message: "Success", data: report };
};

export const apiGetSemesterClassReport = async (
  token: string,
  classId: string,
  semesterType: "ganjil" | "genap" = "ganjil",
  year: number = 2026
): Promise<ApiResponse<SemesterClassAttendanceReport>> => {
  await new Promise(r => setTimeout(r, 450));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const targetClass = MOCK_CLASSES.find(c => c.id === classId) || { id: classId, name: "Kelas" };
  const classStudents = MOCK_SISWA_LIST.filter(s => s.kelas_id === classId);
  const studentsToUse = classStudents;

  const monthsList = semesterType === "ganjil" 
    ? ["Juli", "Agustus", "September", "Oktober", "November", "Desember"]
    : ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];

  const effectiveDaysPerMonth = [21, 22, 21, 23, 22, 16]; // ~125 hari efektif 1 semester
  const totalHariEfektif = effectiveDaysPerMonth.reduce((a, b) => a + b, 0);

  const studentRows: StudentSemesterAttendanceRow[] = studentsToUse.map((s, idx) => {
    let totHadir = 0;
    let totTerlambat = 0;
    let totSakit = 0;
    let totIzin = 0;
    let totAlpa = 0;

    const monthlyBreakdown = monthsList.map((mName, mIdx) => {
      const eff = effectiveDaysPerMonth[mIdx];
      // Seeded realistic data
      let sCount = 0;
      let iCount = 0;
      let aCount = 0;
      let tCount = 0;

      if (idx === 3 && (mIdx === 2 || mIdx === 3)) {
        sCount = 2; // Deni sakit
      } else if (idx === 5 && mIdx === 1) {
        aCount = 1; // Fajar alpa
      } else if (idx === 1 && mIdx === 0) {
        iCount = 1;
      } else if (idx === 8 && mIdx === 4) {
        sCount = 1;
      }

      if ((idx + mIdx) % 4 === 0) {
        tCount = 1;
      }

      const hCount = eff - (sCount + iCount + aCount);
      totHadir += hCount;
      totTerlambat += tCount;
      totSakit += sCount;
      totIzin += iCount;
      totAlpa += aCount;

      return {
        monthName: mName,
        hadir: hCount,
        sakit: sCount,
        izin: iCount,
        alpa: aCount,
        terlambat: tCount
      };
    });

    const attendedCount = totHadir;
    const persentase = totalHariEfektif > 0 ? Math.round((attendedCount / totalHariEfektif) * 100) : 100;
    
    let predikat: "Sangat Baik" | "Baik" | "Cukup" | "Perlu Pembinaan" = "Sangat Baik";
    if (persentase >= 95) predikat = "Sangat Baik";
    else if (persentase >= 85) predikat = "Baik";
    else if (persentase >= 75) predikat = "Cukup";
    else predikat = "Perlu Pembinaan";

    return {
      id: s.id,
      nis: (s as any).nis || `202300${idx + 1}`,
      nisn: (s as any).nisn || `008765432${idx + 1}`,
      name: (s as any).nama || s.name || `Siswa ${idx + 1}`,
      jk: ((s as any).jk as "L" | "P") || (idx % 2 === 0 ? "L" : "P"),
      monthlyBreakdown,
      totalHadir: totHadir,
      totalTerlambat: totTerlambat,
      totalSakit: totSakit,
      totalIzin: totIzin,
      totalAlpa: totAlpa,
      totalHariEfektif,
      persentase,
      predikat
    };
  });

  const totalLaki = studentRows.filter(s => s.jk === "L").length;
  const totalPerempuan = studentRows.filter(s => s.jk === "P").length;
  const avgPersen = studentRows.length > 0 ? Math.round(studentRows.reduce((acc, s) => acc + s.persentase, 0) / studentRows.length) : 0;
  const totHadir = studentRows.reduce((acc, s) => acc + s.totalHadir, 0);
  const totTerlambat = studentRows.reduce((acc, s) => acc + s.totalTerlambat, 0);
  const totSakit = studentRows.reduce((acc, s) => acc + s.totalSakit, 0);
  const totIzin = studentRows.reduce((acc, s) => acc + s.totalIzin, 0);
  const totAlpa = studentRows.reduce((acc, s) => acc + s.totalAlpa, 0);

  const report: SemesterClassAttendanceReport = {
    classId: targetClass.id,
    className: targetClass.name,
    waliKelas: targetClass.wali_kelas || "Wali Kelas",
    nipWaliKelas: targetClass.nip_wali_kelas || "-",
    semester: semesterType === "ganjil" ? "Semester Ganjil" : "Semester Genap",
    tahunAjaran: `${year}/${year + 1}`,
    tahun: year,
    totalHariEfektif,
    monthsList,
    students: studentRows,
    summary: {
      totalSiswa: studentRows.length,
      totalLaki,
      totalPerempuan,
      rataRataKehadiran: avgPersen,
      totalHadir: totHadir,
      totalTerlambat: totTerlambat,
      totalSakit: totSakit,
      totalIzin: totIzin,
      totalAlpa: totAlpa
    },
    catatanWaliKelas: "Rekapitulasi kehadiran 1 semester siap dituangkan pada Buku Induk dan Laporan Hasil Belajar (Rapor Siswa)."
  };

  return { success: true, message: "Success", data: report };
};

export const apiGetMonthlyTeacherReport = async (
  token: string,
  monthIndex: number,
  year: number = 2026
): Promise<ApiResponse<{
  bulanNama: string;
  tahun: number;
  totalGuru: number;
  hariKerja: number;
  rataRataKehadiran: number;
  teachers: TeacherMonthlyAttendanceRow[];
}>> => {
  await new Promise(r => setTimeout(r, 450));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const hariKerja = 22;
  const teachers: TeacherMonthlyAttendanceRow[] = MOCK_GURU_LIST.map((g) => ({
    id: g.id,
    nip: g.nip || "-",
    nama: g.nama,
    mapel: g.mata_pelajaran || "-",
    hariKerja,
    hadir: 0,
    terlambat: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
    cuti: 0,
    persentase: 100,
    keterangan: "Aktif"
  }));

  const avg = teachers.length > 0 ? Math.round(teachers.reduce((acc, t) => acc + t.persentase, 0) / teachers.length) : 0;

  return {
    success: true,
    message: "Success",
    data: {
      bulanNama: INDO_MONTH_NAMES[monthIndex] || "September",
      tahun: year,
      totalGuru: teachers.length,
      hariKerja,
      rataRataKehadiran: avg,
      teachers
    }
  };
};

// ==========================================
// PHASE 46: GATE SCANNER KIOSK & WALLBOARD API
// ==========================================

export interface GateAttendanceRecord {
  id: string;
  type: "siswa" | "guru";
  personId: string;
  nama: string;
  identifier: string; // NIS for siswa, NIP for guru
  nisn?: string;
  subInfo: string; // Kelas or Mapel
  foto: string;
  mode: "masuk" | "pulang";
  timestamp: string; // ISO string
  timeStr: string; // HH:mm:ss
  dateStr: string; // YYYY-MM-DD
  status: "Hadir" | "Terlambat" | "Pulang" | "Pulang Cepat";
  menitKeterlambatan: number;
  metodeScan: "QR_CAMERA" | "BARCODE_SCANNER" | "MANUAL_INPUT";
  parentInfo?: {
    namaWali: string;
    noWa: string;
    hubungan: string;
  };
  waNotificationStatus: "SENT" | "DISABLED" | "FAILED" | "PENDING_SYNC";
  waMessagePreview?: string;
}

export interface GateScanResult {
  record: GateAttendanceRecord;
  isPunctual: boolean;
  isDoubleScan?: boolean;
  voiceMessage: string;
  chimeType: "success" | "warning" | "error";
  rawInput: string;
}

export interface GateStats {
  totalScans: number;
  totalHadir: number;
  totalTerlambat: number;
  totalPulang: number;
  totalSiswaTerdaftar: number;
  persentaseKehadiran: number;
  siswaBelumHadir: number;
}

// In-memory stream for Gate Kiosk (bersih dari data dummy)
let MOCK_GATE_STREAM: GateAttendanceRecord[] = [];

export const apiScanGateAttendance = async (
  token: string,
  payload: {
    qrOrBarcode: string;
    mode: "masuk" | "pulang";
    metodeScan: "QR_CAMERA" | "BARCODE_SCANNER" | "MANUAL_INPUT";
    sendWhatsApp?: boolean;
    cooldownMinutes?: number;
  }
): Promise<ApiResponse<GateScanResult>> => {
  await new Promise(r => setTimeout(r, 350));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const raw = (payload.qrOrBarcode || "").trim();
  if (!raw) {
    return { success: false, message: "Kode QR atau Barcode tidak boleh kosong." };
  }

  // Parse QR payload or fallback to raw string (NIS, NISN, or NIP)
  let parsedId = "";
  let parsedNis = "";
  let parsedNisn = "";
  let parsedNama = "";

  try {
    if (raw.startsWith("{") && raw.endsWith("}")) {
      const obj = JSON.parse(raw);
      parsedId = obj.id || "";
      parsedNis = obj.nis || "";
      parsedNisn = obj.nisn || "";
      parsedNama = obj.nama || "";
    }
  } catch (e) {
    // raw string
  }

  const query = (parsedNis || parsedNisn || parsedId || raw).toLowerCase();

  // Find in Siswa List
  let matchedStudent = MOCK_SISWA_LIST.find(s => 
    (parsedId && s.id === parsedId) ||
    (s.rfid_uid && s.rfid_uid.toLowerCase() === query) ||
    s.nis.toLowerCase() === query ||
    s.nisn.toLowerCase() === query ||
    s.id.toLowerCase() === query ||
    s.nama.toLowerCase() === query ||
    (parsedNama && s.nama.toLowerCase().includes(parsedNama.toLowerCase()))
  );

  // Find in Guru List
  let matchedTeacher = !matchedStudent ? MOCK_GURU_LIST.find(g => 
    (g.rfid_uid && g.rfid_uid.toLowerCase() === query) ||
    g.nip.toLowerCase() === query ||
    g.id.toLowerCase() === query ||
    g.nama.toLowerCase() === query ||
    (parsedNama && g.nama.toLowerCase().includes(parsedNama.toLowerCase()))
  ) : null;

  if (!matchedStudent && !matchedTeacher) {
    return {
      success: false,
      message: `Identitas "${raw}" tidak ditemukan di basis data sekolah. Pastikan Kartu Pelajar terdaftar.`,
      error_code: "PERSON_NOT_FOUND"
    };
  }

  const isStudent = !!matchedStudent;
  const person = matchedStudent || matchedTeacher!;
  const personId = person.id;
  const personName = person.nama;
  const identifier = isStudent ? (person as any).nis : (person as any).nip;
  const subInfo = isStudent ? (person as any).kelas_nama : (person as any).mata_pelajaran || "Guru";
  const foto = (person as any).foto || "https://ui-avatars.com/api/?name=" + encodeURIComponent(personName);

  const now = new Date();
  const currentDateStr = now.toISOString().split("T")[0];
  const currentTimeStr = now.toTimeString().split(" ")[0]; // HH:mm:ss
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  // Check anti-double tap (cooldown)
  const cooldownMin = payload.cooldownMinutes ?? 3;
  const recentScan = MOCK_GATE_STREAM.find(
    rec => rec.personId === personId && 
           rec.dateStr === currentDateStr && 
           rec.mode === payload.mode &&
           (Date.now() - new Date(rec.timestamp).getTime()) < cooldownMin * 60 * 1000
  );

  if (recentScan) {
    return {
      success: false,
      message: `Peringatan: Kartu ${personName} sudah dipindai pada pukul ${recentScan.timeStr}. Harap tunggu ${cooldownMin} menit sebelum scan ulang.`,
      data: {
        record: recentScan,
        isPunctual: recentScan.status === "Hadir",
        isDoubleScan: true,
        voiceMessage: `Perhatian, kartu ${personName} sudah dipindai sebelumnya.`,
        chimeType: "error",
        rawInput: raw
      }
    };
  }

  // Punctuality rule:
  // Masuk: target 07:15, tolerance 15 mins (07:30 cutoff)
  // Pulang: target 14:00 (students) or 15:00 (teachers)
  const cutoffMasuk = 7 * 60 + 15; // 07:15
  let status: "Hadir" | "Terlambat" | "Pulang" | "Pulang Cepat" = "Hadir";
  let menitKeterlambatan = 0;
  let isPunctual = true;

  if (payload.mode === "masuk") {
    if (currentTotalMinutes > cutoffMasuk) {
      menitKeterlambatan = currentTotalMinutes - cutoffMasuk;
      status = "Terlambat";
      isPunctual = false;
    } else {
      status = "Hadir";
      isPunctual = true;
    }
  } else {
    // Pulang
    const cutoffPulang = isStudent ? 14 * 60 : 15 * 60;
    if (currentTotalMinutes < cutoffPulang) {
      status = "Pulang Cepat";
      isPunctual = false;
    } else {
      status = "Pulang";
      isPunctual = true;
    }
  }

  // Parent WhatsApp Notification simulation (Phase 44 integration)
  let parentInfo: any = undefined;
  let waStatus: "SENT" | "DISABLED" | "FAILED" = "DISABLED";
  let waPreview = "";

  if (isStudent && (person as any).no_wa_wali) {
    parentInfo = {
      namaWali: (person as any).nama_wali || "Orang Tua / Wali",
      noWa: (person as any).no_wa_wali,
      hubungan: (person as any).hubungan_wali || "Wali"
    };

    if (payload.sendWhatsApp !== false) {
      waStatus = "SENT";
      if (payload.mode === "masuk") {
        waPreview = isPunctual
          ? `Yth. ${parentInfo.namaWali}, Ananda ${personName} (${subInfo}) telah tiba di sekolah pada pukul ${currentTimeStr} WIB. Status: Hadir Tepat Waktu. Selamat belajar!`
          : `Yth. ${parentInfo.namaWali}, Ananda ${personName} (${subInfo}) tiba di sekolah pukul ${currentTimeStr} WIB. Status: Terlambat ${menitKeterlambatan} menit.`;
      } else {
        waPreview = `Yth. ${parentInfo.namaWali}, Ananda ${personName} (${subInfo}) telah melakukan presensi pulang sekolah pada pukul ${currentTimeStr} WIB. Hati-hati di perjalanan pulang.`;
      }
    }
  }

  const newRecord: GateAttendanceRecord = {
    id: `GATE-${Date.now().toString().slice(-6)}`,
    type: isStudent ? "siswa" : "guru",
    personId,
    nama: personName,
    identifier,
    nisn: (person as any).nisn,
    subInfo,
    foto,
    mode: payload.mode,
    timestamp: now.toISOString(),
    timeStr: currentTimeStr,
    dateStr: currentDateStr,
    status,
    menitKeterlambatan,
    metodeScan: payload.metodeScan,
    parentInfo,
    waNotificationStatus: waStatus,
    waMessagePreview: waPreview
  };

  // Prepend to mock stream
  MOCK_GATE_STREAM.unshift(newRecord);

  // In-app Parent Notification trigger (Option A)
  if (isStudent) {
    try {
      apiCreateParentNotification({
        student_id: personId,
        student_name: personName,
        student_nisn: (person as any).nisn || identifier,
        title: payload.mode === "masuk"
          ? (isPunctual ? "Presensi Masuk Berhasil" : `Presensi Masuk - Terlambat (${menitKeterlambatan} menit)`)
          : "Presensi Pulang Sekolah",
        message: payload.mode === "masuk"
          ? `Ananda ${personName} (${subInfo}) telah melakukan presensi MASUK pada pukul ${currentTimeStr} WIB. Status: ${status}.`
          : `Ananda ${personName} (${subInfo}) telah melakukan presensi PULANG pada pukul ${currentTimeStr} WIB.`,
        type: payload.mode === "masuk" ? (isPunctual ? "masuk" : "terlambat") : "pulang",
        timestamp: now.toISOString(),
        timeStr: `${currentTimeStr} WIB`,
        dateStr: "Hari ini",
        kioskGate: (payload as any).gateLocation || "Gerbang Utama",
        foto: foto
      });
    } catch (e) {
      // ignore
    }
  }

  // Generate voice message
  let voiceMessage = "";
  if (payload.mode === "masuk") {
    if (isPunctual) {
      voiceMessage = `Selamat pagi, ${personName}. Presensi masuk berhasil, tepat waktu. Semangat!`;
    } else {
      voiceMessage = `Perhatian, ${personName}. Anda tercatat terlambat ${menitKeterlambatan} menit.`;
    }
  } else {
    voiceMessage = `Selamat sore, ${personName}. Presensi pulang berhasil. Hati-hati di jalan.`;
  }

  const chimeType: "success" | "warning" | "error" = isPunctual ? "success" : "warning";

  return {
    success: true,
    message: `Presensi ${personName} berhasil dicatat.`,
    data: {
      record: newRecord,
      isPunctual,
      isDoubleScan: false,
      voiceMessage,
      chimeType,
      rawInput: raw
    }
  };
};

export const apiGetGateLiveStream = async (
  token: string,
  filterDate?: string
): Promise<ApiResponse<GateAttendanceRecord[]>> => {
  await new Promise(r => setTimeout(r, 200));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const targetDate = filterDate || new Date().toISOString().split("T")[0];
  const records = MOCK_GATE_STREAM.filter(r => r.dateStr === targetDate);
  return { success: true, message: "Success", data: records };
};

export const apiGetGateStats = async (
  token: string
): Promise<ApiResponse<GateStats>> => {
  await new Promise(r => setTimeout(r, 200));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const today = new Date().toISOString().split("T")[0];
  const todayRecords = MOCK_GATE_STREAM.filter(r => r.dateStr === today);

  const totalScans = todayRecords.length;
  const totalHadir = todayRecords.filter(r => r.status === "Hadir").length;
  const totalTerlambat = todayRecords.filter(r => r.status === "Terlambat").length;
  const totalPulang = todayRecords.filter(r => r.status === "Pulang" || r.status === "Pulang Cepat").length;
  
  const totalSiswaTerdaftar = MOCK_SISWA_LIST.filter(s => s.status === "Aktif").length;
  const distinctStudentsPresent = new Set(todayRecords.filter(r => r.type === "siswa").map(r => r.personId)).size;
  const siswaBelumHadir = Math.max(0, totalSiswaTerdaftar - distinctStudentsPresent);
  const persentaseKehadiran = totalSiswaTerdaftar > 0 
    ? Math.round((distinctStudentsPresent / totalSiswaTerdaftar) * 100) 
    : 100;

  return {
    success: true,
    message: "Success",
    data: {
      totalScans,
      totalHadir,
      totalTerlambat,
      totalPulang,
      totalSiswaTerdaftar,
      persentaseKehadiran,
      siswaBelumHadir
    }
  };
};

export const apiResetGateAttendanceToday = async (
  token: string
): Promise<ApiResponse<null>> => {
  await new Promise(r => setTimeout(r, 300));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const today = new Date().toISOString().split("T")[0];
  MOCK_GATE_STREAM = MOCK_GATE_STREAM.filter(r => r.dateStr !== today);
  return { success: true, message: "Data presensi gerbang hari ini telah di-reset." };
};

// ============================================================================
// --- PRESENSI GURU DI KELAS PER MATA PELAJARAN (KBM) (TANPA GPS + FOTO WATERMARK) ---
// ============================================================================

const PRESENSI_MENGAJAR_KEY = "presensi_mengajar_kbm_records_v1";

const INITIAL_PRESENSI_MENGAJAR: PresensiMengajar[] = [];

function getStoredPresensiMengajar(): PresensiMengajar[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRESENSI_MENGAJAR_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredPresensiMengajar(data: PresensiMengajar[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRESENSI_MENGAJAR_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Gagal menyimpan presensi mengajar ke localStorage", e);
  }
}

export const apiGetTeacherSchedulesToday = async (
  token: string,
  guruId: string = "G001"
): Promise<ApiResponse<{
  hariIni: string;
  tanggalStr: string;
  schedules: (JadwalPelajaran & {
    presensi?: PresensiMengajar | null;
    isCurrentActiveTime: boolean;
  })[];
}>> => {
  await new Promise(r => setTimeout(r, 400));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const now = new Date();
  const daysOfWeek = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const currentDayName = daysOfWeek[now.getDay()];
  const todayDateStr = now.toISOString().split("T")[0];

  // Ambil semua jadwal dari master admin
  let allSchedules = [...MOCK_SCHEDULES_ADMIN];
  
  // Ambil jadwal aktif guru ini hari ini
  let guruSchedules = allSchedules.filter(s => s.guru_id === guruId && s.hari.toLowerCase() === currentDayName.toLowerCase());

  const presensiList = getStoredPresensiMengajar();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const formattedSchedules = guruSchedules.map(sch => {
    const existingPresensi = presensiList.find(
      p => (p.jadwal_id === sch.id || (p.kelas_id === sch.kelas_id && p.mata_pelajaran === sch.mata_pelajaran)) &&
           p.tanggal === todayDateStr &&
           p.guru_id === guruId
    );

    const [startH, startM] = sch.jam_mulai.split(":").map(Number);
    const [endH, endM] = sch.jam_selesai.split(":").map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    // Aktif jika dalam rentang atau toleransi ±30 menit sebelum/setelah
    const isCurrentActiveTime = currentMinutes >= (startTotal - 30) && currentMinutes <= (endTotal + 60);

    return {
      ...sch,
      presensi: existingPresensi || null,
      isCurrentActiveTime
    };
  });

  return {
    success: true,
    message: "Success",
    data: {
      hariIni: currentDayName,
      tanggalStr: todayDateStr,
      schedules: formattedSchedules
    }
  };
};

export const apiSubmitPresensiKelas = async (
  token: string,
  payload: {
    jadwal_id: string;
    guru_id: string;
    guru_nama: string;
    nip?: string;
    kelas_id: string;
    kelas_nama: string;
    mata_pelajaran: string;
    jam_jadwal: string;
    topik_materi: string;
    foto_kbm: string;
    catatan_khusus?: string;
    jumlah_hadir_siswa?: number;
    total_siswa?: number;
  }
): Promise<ApiResponse<PresensiMengajar>> => {
  await new Promise(r => setTimeout(r, 600));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;
  const dateStr = now.toISOString().split("T")[0];
  const daysOfWeek = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const hari = daysOfWeek[now.getDay()];

  const newRecord: PresensiMengajar = {
    id: `KBM-${Date.now()}`,
    jadwal_id: payload.jadwal_id,
    guru_id: payload.guru_id,
    guru_nama: payload.guru_nama,
    nip: payload.nip || "198001012005011001",
    kelas_id: payload.kelas_id,
    kelas_nama: payload.kelas_nama,
    mata_pelajaran: payload.mata_pelajaran,
    hari,
    tanggal: dateStr,
    jam_jadwal: payload.jam_jadwal,
    jam_masuk_kelas: timeStr,
    jam_selesai_kelas: null,
    status: "Sedang Mengajar",
    topik_materi: payload.topik_materi,
    foto_kbm: payload.foto_kbm,
    catatan_khusus: payload.catatan_khusus || "",
    jumlah_hadir_siswa: payload.jumlah_hadir_siswa ?? 32,
    total_siswa: payload.total_siswa ?? 32
  };

  const list = getStoredPresensiMengajar();
  // Update jika sudah ada untuk jadwal & tanggal yang sama
  const filtered = list.filter(
    item => !(item.jadwal_id === payload.jadwal_id && item.tanggal === dateStr && item.guru_id === payload.guru_id)
  );
  filtered.unshift(newRecord);
  saveStoredPresensiMengajar(filtered);

  return {
    success: true,
    message: `Presensi KBM ${payload.mata_pelajaran} di ${payload.kelas_nama} berhasil disimpan!`,
    data: newRecord
  };
};

export const apiFinishPresensiKelas = async (
  token: string,
  presensiId: string,
  catatanSelesai?: string
): Promise<ApiResponse<PresensiMengajar>> => {
  await new Promise(r => setTimeout(r, 400));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

  const list = getStoredPresensiMengajar();
  const index = list.findIndex(p => p.id === presensiId);
  if (index === -1) {
    return { success: false, message: "Data presensi kelas tidak ditemukan." };
  }

  const updated: PresensiMengajar = {
    ...list[index],
    jam_selesai_kelas: timeStr,
    status: "Selesai",
    catatan_khusus: catatanSelesai 
      ? (list[index].catatan_khusus ? `${list[index].catatan_khusus} | Catatan Selesai: ${catatanSelesai}` : catatanSelesai)
      : list[index].catatan_khusus
  };

  list[index] = updated;
  saveStoredPresensiMengajar(list);

  return {
    success: true,
    message: `Sesi mengajar ${updated.mata_pelajaran} di ${updated.kelas_nama} telah ditandai Selesai (${timeStr}).`,
    data: updated
  };
};

export const apiGetPresensiMengajarList = async (
  token: string,
  filters?: {
    tanggal?: string;
    kelasId?: string;
    guruId?: string;
    status?: string;
    search?: string;
  }
): Promise<ApiResponse<PresensiMengajar[]>> => {
  await new Promise(r => setTimeout(r, 400));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  let data = getStoredPresensiMengajar();

  if (filters?.tanggal) {
    data = data.filter(d => d.tanggal === filters.tanggal);
  }
  if (filters?.kelasId && filters.kelasId !== "all") {
    data = data.filter(d => d.kelas_id === filters.kelasId);
  }
  if (filters?.guruId && filters.guruId !== "all") {
    data = data.filter(d => d.guru_id === filters.guruId);
  }
  if (filters?.status && filters.status !== "all") {
    data = data.filter(d => d.status.toLowerCase() === filters.status?.toLowerCase());
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    data = data.filter(d => 
      d.guru_nama.toLowerCase().includes(q) ||
      d.kelas_nama.toLowerCase().includes(q) ||
      d.mata_pelajaran.toLowerCase().includes(q) ||
      d.topik_materi.toLowerCase().includes(q)
    );
  }

  return {
    success: true,
    message: "Success",
    data
  };
};

// ==========================================
// --- MOCK & LOCALSTORAGE DATA FOR LEGER NILAI ---
// ==========================================
export const STANDARD_SUBJECTS = [
  { id: "SUB_PAI", code: "PAI", name: "Pendidikan Agama & BP", kktp: 75, guruPengampu: "Siti Rahmah, S.Ag" },
  { id: "SUB_PPKN", code: "PPKN", name: "Pendidikan Pancasila", kktp: 75, guruPengampu: "Drs. Bambang S." },
  { id: "SUB_BIND", code: "BIND", name: "Bahasa Indonesia", kktp: 75, guruPengampu: "Siti Aminah, M.Pd" },
  { id: "SUB_MAT", code: "MAT", name: "Matematika", kktp: 72, guruPengampu: "Ahmad Guru, S.Pd" },
  { id: "SUB_IPA", code: "IPA", name: "Ilmu Pengetahuan Alam", kktp: 73, guruPengampu: "Dr. Irfan Hakim, M.Si" },
  { id: "SUB_IPS", code: "IPS", name: "Ilmu Pengetahuan Sosial", kktp: 75, guruPengampu: "Rina Novita, S.Pd" },
  { id: "SUB_BING", code: "BING", name: "Bahasa Inggris", kktp: 73, guruPengampu: "David Prasetyo, S.Pd" },
  { id: "SUB_SBK", code: "SBK", name: "Seni Budaya", kktp: 76, guruPengampu: "Maya Kartika, S.Sn" },
  { id: "SUB_PJOK", code: "PJOK", name: "PJOK", kktp: 75, guruPengampu: "Hendra Wijaya, S.Pd" },
  { id: "SUB_INF", code: "INF", name: "Informatika", kktp: 75, guruPengampu: "Bayu Pratama, S.Kom" },
];

const LEGER_NILAI_STORAGE_KEY = "sims_school_leger_nilai_data_v1";

interface StoredClassGrades {
  // classId -> semester -> subjectCode -> studentId -> { formatif1, formatif2, sts, sas, capaianTertinggi, perluPeningkatan }
  [key: string]: any;
}

const getStoredClassGrades = (): StoredClassGrades => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LEGER_NILAI_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

const saveStoredClassGrades = (data: StoredClassGrades) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LEGER_NILAI_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Gagal simpan leger nilai ke localStorage", e);
  }
};

export const calculateGradePredicate = (nilai: number): "A" | "B" | "C" | "D" => {
  if (nilai >= 90) return "A";
  if (nilai >= 80) return "B";
  if (nilai >= 73) return "C";
  return "D";
};

// Seed realistic score based on student index and subject
const generateBaseScore = (studentIdx: number, subjectIdx: number): { f1: number; f2: number; sts: number; sas: number } => {
  // Create natural variety with top performers and moderate performers
  const studentAbility = 92 - (studentIdx * 3.5);
  const subjectVariance = ((subjectIdx * 7) % 11) - 4; // -4 to +6
  
  const base = Math.min(98, Math.max(68, Math.round(studentAbility + subjectVariance)));
  const f1 = Math.min(100, Math.max(65, base + ((studentIdx + subjectIdx) % 5) - 2));
  const f2 = Math.min(100, Math.max(65, base + ((studentIdx * 2 + subjectIdx) % 5) - 1));
  const sts = Math.min(100, Math.max(60, base + ((subjectIdx) % 6) - 3));
  const sas = Math.min(100, Math.max(60, base + ((studentIdx) % 5) - 2));

  return { f1, f2, sts, sas };
};

export const apiGetClassGradeLeger = async (
  token: string,
  classId: string,
  semester: "ganjil" | "genap" = "ganjil",
  year: number = 2026
): Promise<ApiResponse<ClassGradeLegerReport>> => {
  await new Promise(r => setTimeout(r, 450));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const targetClass = MOCK_CLASSES.find(c => c.id === classId) || (MOCK_CLASSES.length > 0 ? MOCK_CLASSES[0] : { id: classId || "C1", name: classId ? `Kelas ${classId}` : "Belum Ada Kelas", wali_kelas: "-" });
  const studentsInClass = MOCK_SISWA_LIST.filter(s => s.kelas_id === targetClass.id || s.kelas_id === classId);
  const storedData = getStoredClassGrades();
  const storagePathKey = `${targetClass.id}_${semester}_${year}`;

  const classStorage = storedData[storagePathKey] || {};

  // Build students with grades
  const studentRows: StudentGradeRow[] = studentsInClass.map((student, sIdx) => {
    let totalScore = 0;
    const subjectGrades: Record<string, SubjectGradeItem> = {};

    STANDARD_SUBJECTS.forEach((sub, subIdx) => {
      const savedScore = classStorage[sub.code]?.[student.id];
      let f1: number, f2: number, sts: number, sas: number;
      let capTertinggi = "";
      let perluTingkat = "";

      if (savedScore) {
        f1 = Number(savedScore.formatif1) || 0;
        f2 = Number(savedScore.formatif2) || 0;
        sts = Number(savedScore.sts) || 0;
        sas = Number(savedScore.sas) || 0;
        capTertinggi = savedScore.capaianTertinggi || "";
        perluTingkat = savedScore.perluPeningkatan || "";
      } else {
        const gen = generateBaseScore(sIdx, subIdx);
        f1 = gen.f1;
        f2 = gen.f2;
        sts = gen.sts;
        sas = gen.sas;
        capTertinggi = `Menunjukkan penguasaan yang sangat baik dalam materi dasar ${sub.name}`;
        perluTingkat = f1 < sub.kktp ? `Perlu bimbingan lebih lanjut dalam pemahaman materi ${sub.name}` : "";
      }

      const rataFormatif = Math.round(((f1 + f2) / 2) * 10) / 10;
      const nilaiAkhir = Math.round((rataFormatif * 2 + sts + sas) / 4);
      totalScore += nilaiAkhir;

      subjectGrades[sub.code] = {
        subjectId: sub.id,
        subjectCode: sub.code,
        subjectName: sub.name,
        kktp: sub.kktp,
        formatif1: f1,
        formatif2: f2,
        rataFormatif,
        sts,
        sas,
        nilaiAkhir,
        predikat: calculateGradePredicate(nilaiAkhir),
        capaianTertinggi: capTertinggi,
        perluPeningkatan: perluTingkat
      };
    });

    const rataRata = Math.round((totalScore / STANDARD_SUBJECTS.length) * 100) / 100;
    
    // Check if below KKTP count > 2
    const belowKktpCount = Object.values(subjectGrades).filter(g => g.nilaiAkhir < g.kktp).length;
    const statusKelulusan = belowKktpCount <= 2 ? "Tuntas" : "Belum Tuntas";

    // Presensi sinkron
    const sakit = (sIdx % 4 === 1) ? 2 : (sIdx % 5 === 2 ? 1 : 0);
    const izin = (sIdx % 3 === 2) ? 1 : 0;
    const alpa = (sIdx === 3) ? 1 : 0;
    const hadir = 110 - (sakit + izin + alpa);
    const persentaseHadir = Math.round((hadir / 110) * 100);

    return {
      id: student.id,
      nis: student.nis,
      nisn: student.nisn || `00876543${sIdx + 20}`,
      name: student.nama,
      jk: (student.jk as "L" | "P") || (sIdx % 2 === 0 ? "L" : "P"),
      subjectGrades,
      totalNilai: totalScore,
      rataRataNilai: rataRata,
      ranking: 0, // will calculate below
      presensi: {
        sakit,
        izin,
        alpa,
        persentaseHadir
      },
      statusKelulusan,
      catatanWaliKelas: rataRata >= 85 
        ? "Prestasi belajar sangat memuaskan, pertahankan kedisiplinan dan semangat belajar."
        : rataRata >= 75
        ? "Capaian pembelajaran baik, tingkatkan pemahaman pada mata pelajaran eksakta."
        : "Perlu bimbingan dan waktu belajar tambahan di rumah."
    };
  });

  // Calculate Rankings
  const sortedStudents = [...studentRows].sort((a, b) => b.totalNilai - a.totalNilai);
  sortedStudents.forEach((st, idx) => {
    st.ranking = idx + 1;
  });

  // Calculate Class Averages per Subject
  const subjectAverages: Record<string, number> = {};
  STANDARD_SUBJECTS.forEach(sub => {
    const sum = studentRows.reduce((acc, curr) => acc + (curr.subjectGrades[sub.code]?.nilaiAkhir || 0), 0);
    subjectAverages[sub.code] = Math.round((sum / (studentRows.length || 1)) * 10) / 10;
  });

  const totalClassScore = studentRows.reduce((acc, curr) => acc + curr.rataRataNilai, 0);
  const classAvg = Math.round((totalClassScore / (studentRows.length || 1)) * 10) / 10;
  const tuntasCount = studentRows.filter(s => s.statusKelulusan === "Tuntas").length;

  const result: ClassGradeLegerReport = {
    classId: targetClass.id,
    className: targetClass.name,
    waliKelas: targetClass.wali_kelas || "Wali Kelas",
    nipWaliKelas: targetClass.nip_wali_kelas || "-",
    semester: semester === "ganjil" ? "Semester Ganjil" : "Semester Genap",
    tahunAjaran: `${year}/${year + 1}`,
    tahun: year,
    kurikulum: "Kurikulum Merdeka",
    kktpStandar: 75,
    subjects: STANDARD_SUBJECTS,
    students: sortedStudents, // sorted by rank
    summary: {
      totalSiswa: studentRows.length,
      totalLaki: studentRows.filter(s => s.jk === "L").length,
      totalPerempuan: studentRows.filter(s => s.jk === "P").length,
      rataRataKelas: classAvg,
      nilaiTertinggi: sortedStudents[0]?.totalNilai || 0,
      nilaiTerendah: sortedStudents[sortedStudents.length - 1]?.totalNilai || 0,
      persentaseKetuntasan: Math.round((tuntasCount / (studentRows.length || 1)) * 100),
      subjectAverages
    },
    catatanKurikulum: "Leger Nilai Semester resmi diverifikasi oleh Tim Kurikulum dan Wali Kelas."
  };

  return {
    success: true,
    message: "Success",
    data: result
  };
};

export const apiSaveStudentSubjectGrades = async (
  token: string,
  classId: string,
  subjectCode: string,
  semester: "ganjil" | "genap",
  year: number,
  grades: {
    studentId: string;
    formatif1: number;
    formatif2: number;
    sts: number;
    sas: number;
    capaianTertinggi?: string;
    perluPeningkatan?: string;
  }[]
): Promise<ApiResponse> => {
  await new Promise(r => setTimeout(r, 600));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const storagePathKey = `${classId}_${semester}_${year}`;
  const storedData = getStoredClassGrades();
  if (!storedData[storagePathKey]) {
    storedData[storagePathKey] = {};
  }
  if (!storedData[storagePathKey][subjectCode]) {
    storedData[storagePathKey][subjectCode] = {};
  }

  grades.forEach(g => {
    storedData[storagePathKey][subjectCode][g.studentId] = {
      formatif1: g.formatif1,
      formatif2: g.formatif2,
      sts: g.sts,
      sas: g.sas,
      capaianTertinggi: g.capaianTertinggi || "",
      perluPeningkatan: g.perluPeningkatan || ""
    };
  });

  saveStoredClassGrades(storedData);

  return {
    success: true,
    message: "Nilai mata pelajaran berhasil disimpan!"
  };
};

export const apiResetClassGrades = async (
  token: string,
  classId: string,
  semester: "ganjil" | "genap",
  year: number
): Promise<ApiResponse> => {
  await new Promise(r => setTimeout(r, 400));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const storagePathKey = `${classId}_${semester}_${year}`;
  const storedData = getStoredClassGrades();
  delete storedData[storagePathKey];
  saveStoredClassGrades(storedData);

  return {
    success: true,
    message: "Data nilai berhasil direset ke nilai awal."
  };
};

export interface StudentParentGradeReport {
  student: {
    id: string;
    nis: string;
    nisn: string;
    nama: string;
    kelas: string;
    kelas_id: string;
    wali_kelas?: string;
    nip_wali_kelas?: string;
    foto?: string;
  };
  semester: "ganjil" | "genap";
  semesterTitle: string;
  tahunAjaran: string;
  tahun: number;
  kurikulum: string;
  kktpStandar: number;
  totalNilai: number;
  rataRataNilai: number;
  ranking: number;
  totalSiswaKelas: number;
  statusKetuntasan: "Tuntas" | "Belum Tuntas";
  catatanWaliKelas: string;
  presensi: {
    sakit: number;
    izin: number;
    alpa: number;
    persentaseHadir: number;
  };
  subjects: {
    id: string;
    code: string;
    name: string;
    kktp: number;
    formatif1: number;
    formatif2: number;
    rataFormatif: number;
    sts: number;
    sas: number;
    nilaiAkhir: number;
    predikat: "A" | "B" | "C" | "D";
    capaianTertinggi: string;
    perluPeningkatan: string;
  }[];
  schoolSettings?: any;
}

export const apiGetStudentGradesForParent = async (
  studentId: string,
  semester: "ganjil" | "genap" = "ganjil",
  year: number = 2024
): Promise<ApiResponse<StudentParentGradeReport>> => {
  await new Promise(r => setTimeout(r, 200));
  const student = MOCK_SISWA_LIST.find(s => s.id === studentId) || (MOCK_SISWA_LIST.length > 0 ? MOCK_SISWA_LIST[0] : null);
  if (!student) {
    return { success: false, message: "Data siswa belum tersedia." };
  }
  const targetClassId = student.kelas_id || "C1";

  const legerRes = await apiGetClassGradeLeger("internal_parent_token", targetClassId, semester, year);
  if (!legerRes.success || !legerRes.data) {
    return { success: false, message: "Gagal memuat informasi nilai rapor siswa." };
  }

  const leger = legerRes.data;
  const studentRow = leger.students.find(s => s.id === student.id) || (leger.students.length > 0 ? leger.students[0] : null);
  if (!studentRow) {
    return { success: false, message: "Nilai rapor untuk siswa ini belum diinput." };
  }

  const subjectsList = leger.subjects.map(sub => {
    const grade = studentRow.subjectGrades[sub.code];
    return {
      id: sub.id,
      code: sub.code,
      name: sub.name,
      kktp: sub.kktp,
      formatif1: grade?.formatif1 ?? 80,
      formatif2: grade?.formatif2 ?? 82,
      rataFormatif: grade?.rataFormatif ?? 81,
      sts: grade?.sts ?? 80,
      sas: grade?.sas ?? 85,
      nilaiAkhir: grade?.nilaiAkhir ?? 82,
      predikat: grade?.predikat ?? "B",
      capaianTertinggi: grade?.capaianTertinggi || `Menunjukkan penguasaan materi ${sub.name} dengan sangat baik`,
      perluPeningkatan: grade?.perluPeningkatan || ""
    };
  });

  return {
    success: true,
    message: "Success",
    data: {
      student: {
        id: student.id,
        nis: student.nis,
        nisn: student.nisn || "0087654321",
        nama: student.nama,
        kelas: student.kelas,
        kelas_id: student.kelas_id,
        wali_kelas: leger.waliKelas,
        nip_wali_kelas: leger.nipWaliKelas,
        foto: student.foto
      },
      semester,
      semesterTitle: semester === "ganjil" ? "Semester Ganjil" : "Semester Genap",
      tahunAjaran: leger.tahunAjaran,
      tahun: year,
      kurikulum: "Kurikulum Merdeka",
      kktpStandar: leger.kktpStandar,
      totalNilai: studentRow.totalNilai,
      rataRataNilai: studentRow.rataRataNilai,
      ranking: studentRow.ranking,
      totalSiswaKelas: leger.students.length,
      statusKetuntasan: (studentRow.statusKelulusan as "Tuntas" | "Belum Tuntas") || "Tuntas",
      catatanWaliKelas: studentRow.catatanWaliKelas,
      presensi: studentRow.presensi,
      subjects: subjectsList,
      schoolSettings: { ...MOCK_SETTINGS }
    }
  };
};

// ==========================================
// --- DATA BACKUP & RESTORE (CADANGAN) ---
// ==========================================

export interface SchoolBackupBundle {
  metadata: {
    appName: string;
    version: string;
    exportedAt: string;
    exportedBy: string;
    schoolName: string;
    totalSiswa: number;
    totalGuru: number;
    totalKelas: number;
    summary: string;
  };
  settings: any;
  adminCredentials?: any;
  legerNilai: any;
  presensiMengajar: any;
  parentNotifications: any;
  siswaList: any[];
  guruList: any[];
  classesList: any[];
  schedules: any[];
  whatsappConfig: any;
}

export const apiExportAllBackupData = async (token: string): Promise<ApiResponse<SchoolBackupBundle>> => {
  await new Promise(r => setTimeout(r, 600));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  const currentSettings = getInitialSettings();
  const currentLeger = getStoredClassGrades();
  const currentPresensiKbm = getStoredPresensiMengajar();
  const currentParentNotifs = getStoredParentNotifications();

  let adminCreds: any = null;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
      if (raw) adminCreds = JSON.parse(raw);
    } catch (e) {
      // ignore
    }
  }

  const bundle: SchoolBackupBundle = {
    metadata: {
      appName: "Sistem Informasi Manajemen Sekolah Terpadu (SIMS)",
      version: "2.5.0",
      exportedAt: new Date().toISOString(),
      exportedBy: "Administrator",
      schoolName: currentSettings.schoolName || "Sekolah",
      totalSiswa: MOCK_SISWA_LIST.length,
      totalGuru: MOCK_GURU_LIST.length,
      totalKelas: MOCK_CLASSES.length,
      summary: `${MOCK_SISWA_LIST.length} Siswa, ${MOCK_GURU_LIST.length} Guru, ${MOCK_CLASSES.length} Rombel, Dokumen Rapor & Pengaturan Lengkap`
    },
    settings: currentSettings,
    adminCredentials: adminCreds,
    legerNilai: currentLeger,
    presensiMengajar: currentPresensiKbm,
    parentNotifications: currentParentNotifs,
    siswaList: [...MOCK_SISWA_LIST],
    guruList: [...MOCK_GURU_LIST],
    classesList: [...MOCK_CLASSES],
    schedules: [...MOCK_SCHEDULES_ADMIN],
    whatsappConfig: { ...MOCK_WHATSAPP_CONFIG }
  };

  return {
    success: true,
    message: "Cadangan data sistem berhasil disiapkan.",
    data: bundle
  };
};

export const apiImportBackupData = async (
  token: string, 
  bundle: any
): Promise<ApiResponse<{ restoredSummary: string }>> => {
  await new Promise(r => setTimeout(r, 900));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  if (!bundle || typeof bundle !== "object") {
    return { success: false, message: "Format file JSON cadangan tidak valid." };
  }

  // Basic validation check
  if (!bundle.settings && !bundle.siswaList && !bundle.metadata) {
    return { success: false, message: "File JSON bukan merupakan cadangan valid dari sistem SIMS Sekolah." };
  }

  try {
    if (bundle.settings && typeof window !== "undefined") {
      MOCK_SETTINGS = { ...bundle.settings };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(MOCK_SETTINGS));
    }

    if (bundle.legerNilai && typeof window !== "undefined") {
      localStorage.setItem(LEGER_NILAI_STORAGE_KEY, JSON.stringify(bundle.legerNilai));
    }

    if (bundle.presensiMengajar && typeof window !== "undefined") {
      localStorage.setItem(PRESENSI_MENGAJAR_KEY, JSON.stringify(bundle.presensiMengajar));
    }

    if (bundle.parentNotifications && typeof window !== "undefined") {
      localStorage.setItem(PARENT_NOTIF_KEY, JSON.stringify(bundle.parentNotifications));
    }

    if (bundle.adminCredentials && typeof window !== "undefined") {
      localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(bundle.adminCredentials));
    }

    if (Array.isArray(bundle.siswaList) && bundle.siswaList.length > 0) {
      MOCK_SISWA_LIST = [...bundle.siswaList];
    }

    if (Array.isArray(bundle.guruList) && bundle.guruList.length > 0) {
      MOCK_GURU_LIST = [...bundle.guruList];
    }

    if (Array.isArray(bundle.classesList) && bundle.classesList.length > 0) {
      MOCK_CLASSES = [...bundle.classesList];
    }

    if (Array.isArray(bundle.schedules) && bundle.schedules.length > 0) {
      MOCK_SCHEDULES_ADMIN.length = 0;
      MOCK_SCHEDULES_ADMIN.push(...bundle.schedules);
    }

    if (bundle.whatsappConfig) {
      MOCK_WHATSAPP_CONFIG = { ...bundle.whatsappConfig };
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("school-settings-updated"));
      window.dispatchEvent(new Event("school-database-restored"));
    }

    const summary = `${bundle.siswaList?.length || 0} Siswa, ${bundle.guruList?.length || 0} Guru, Pengaturan & Buku Nilai`;

    return {
      success: true,
      message: `Pemulihan data berhasil! Seluruh data (${summary}) telah diterapkan ke sistem.`,
      data: { restoredSummary: summary }
    };
  } catch (err: any) {
    return {
      success: false,
      message: "Terjadi kesalahan saat memproses data cadangan: " + (err?.message || "Format data corrupt")
    };
  }
};

export const apiResetToFactoryDefault = async (token: string): Promise<ApiResponse> => {
  await new Promise(r => setTimeout(r, 800));
  if (!token) return { success: false, message: "Unauthenticated", error_code: "AUTH_INVALID" };

  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      localStorage.removeItem(LEGER_NILAI_STORAGE_KEY);
      localStorage.removeItem(PRESENSI_MENGAJAR_KEY);
      localStorage.removeItem(PARENT_NOTIF_KEY);
      localStorage.removeItem(ADMIN_CREDENTIALS_KEY);
    }

    MOCK_SETTINGS = getInitialSettings();
    
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("school-settings-updated"));
      window.dispatchEvent(new Event("school-database-restored"));
    }

    return {
      success: true,
      message: "Sistem telah berhasil dikembalikan ke pengaturan dan data bawaan pabrik."
    };
  } catch (e: any) {
    return {
      success: false,
      message: "Gagal mereset data: " + (e?.message || "")
    };
  }
};





