export type Role = "guru" | "admin" | "satpam" | "wali";

export interface User {
  user_id: string;
  username: string;
  role: Role;
  name: string;
  reference_id: string; // ID for guru, admin, siswa, or student_id for wali
  status: "active" | "inactive";
  foto?: string;
  student_data?: {
    id: string;
    nama: string;
    nis: string;
    nisn: string;
    kelas_nama: string;
    foto?: string;
    nama_wali?: string;
    no_wa_wali?: string;
    hubungan_wali?: string;
  };
}

export interface ParentNotification {
  id: string;
  student_id: string;
  student_name: string;
  student_nisn: string;
  title: string;
  message: string;
  type: "masuk" | "pulang" | "terlambat" | "izin" | "sakit" | "info";
  timestamp: string;
  timeStr: string;
  dateStr: string;
  isRead: boolean;
  kioskGate?: string;
  foto?: string;
}

export interface GuruProfile {
  id: string;
  user_id: string;
  nama: string;
  nip: string;
  nuptk: string;
  email: string;
  no_hp: string;
  jabatan: string;
  mata_pelajaran: string;
  kelas_diajar: string[];
  foto?: string;
}

export interface JadwalPelajaran {
  id: string;
  kelas_id: string;
  kelas_nama: string;
  guru_id: string;
  guru_nama: string;
  mata_pelajaran: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  ruang?: string;
}

export interface PresensiMengajar {
  id: string;
  jadwal_id: string;
  guru_id: string;
  guru_nama: string;
  nip?: string;
  kelas_id: string;
  kelas_nama: string;
  mata_pelajaran: string;
  hari: string;
  tanggal: string;
  jam_jadwal: string;
  jam_masuk_kelas: string;
  jam_selesai_kelas?: string | null;
  status: "Sedang Mengajar" | "Selesai" | "Terlambat";
  topik_materi: string;
  foto_kbm: string;
  catatan_khusus?: string;
  jumlah_hadir_siswa?: number;
  total_siswa?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error_code?: string;
}
