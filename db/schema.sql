-- ==========================================================
-- SKEMA DATABASE POSTGRESQL 16 - APLIKASI MASTER SIMS SEKOLAH
-- Kompatibel dengan: Sumopod.com / Supabase / Neon / Cloud SQL / Local
-- ==========================================================

-- Ekstensi UUID (opsional, bawaan PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL PROFIL SEKOLAH (IDENTITAS & LOGO RESMI)
CREATE TABLE IF NOT EXISTS school_profiles (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    npsn VARCHAR(20) NOT NULL,
    nama_sekolah VARCHAR(255) NOT NULL,
    jenjang VARCHAR(20) DEFAULT 'SMP', -- SD, SMP, SMA, SMK
    status_sekolah VARCHAR(20) DEFAULT 'Negeri',
    alamat TEXT,
    desa_kelurahan VARCHAR(100),
    kecamatan VARCHAR(100),
    kabupaten_kota VARCHAR(100),
    provinsi VARCHAR(100),
    kode_pos VARCHAR(10),
    telepon VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(100),
    kepala_sekolah VARCHAR(255),
    nip_kepala_sekolah VARCHAR(50),
    logo_kiri_url TEXT,       -- URL Google Drive atau Base64
    logo_kanan_url TEXT,      -- URL Google Drive atau Base64
    stempel_url TEXT,         -- URL Google Drive atau Base64
    ttd_kepala_url TEXT,      -- URL Google Drive atau Base64
    koordinat_lat NUMERIC(10, 7),
    koordinat_lng NUMERIC(10, 7),
    radius_meter INTEGER DEFAULT 100,
    jam_masuk TIME DEFAULT '07:00:00',
    jam_pulang TIME DEFAULT '14:00:00',
    toleransi_menit INTEGER DEFAULT 15,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL PENGGUNA (USERS & AUTHENTICATION)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL, -- 'admin', 'guru', 'satpam', 'siswa', 'orangtua'
    name VARCHAR(255) NOT NULL,
    reference_id VARCHAR(50),  -- Menghubungkan ke ID Siswa atau ID Guru
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive'
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL KELAS / ROMBEL
CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- contoh: '7A', '8B', '9C'
    tingkat VARCHAR(10) NOT NULL, -- '7', '8', '9'
    wali_kelas_id VARCHAR(50),
    tahun_ajaran VARCHAR(20) DEFAULT '2025/2026',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABEL SISWA (STUDENTS)
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY,
    nis VARCHAR(30) UNIQUE NOT NULL,
    nisn VARCHAR(30) UNIQUE,
    name VARCHAR(255) NOT NULL,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
    gender VARCHAR(10) DEFAULT 'L', -- 'L' / 'P'
    phone_ortu VARCHAR(50),
    address TEXT,
    qr_code VARCHAR(100) UNIQUE,
    foto_url TEXT, -- Link file gambar di Google Drive
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'alumni', 'mutasi'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABEL GURU & STAF (TEACHERS)
CREATE TABLE IF NOT EXISTS teachers (
    id VARCHAR(50) PRIMARY KEY,
    nip VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    foto_url TEXT, -- Link file gambar di Google Drive
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABEL MATA PELAJARAN (SUBJECTS)
CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    tingkat VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABEL PRESENSI SISWA (ATTENDANCES)
CREATE TABLE IF NOT EXISTS attendances (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id VARCHAR(50),
    time_in TIME,
    time_out TIME,
    status VARCHAR(10) NOT NULL, -- 'H' (Hadir), 'T' (Terlambat), 'S' (Sakit), 'I' (Izin), 'A' (Alpa)
    method VARCHAR(30) DEFAULT 'QR_SCAN', -- 'QR_SCAN', 'MANUAL_TEACHER', 'KIOSK', 'SELFIE'
    location_lat NUMERIC(10, 7),
    location_lng NUMERIC(10, 7),
    foto_url TEXT, -- Foto bukti selfie/kamera saat tap hadir (Google Drive)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABEL JURNAL MENGAJAR GURU (TEACHING PRESENCES)
CREATE TABLE IF NOT EXISTS teaching_presences (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    teacher_id VARCHAR(50) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id VARCHAR(50),
    subject_name VARCHAR(150) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic TEXT NOT NULL,
    student_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABEL SURAT IZIN & SAKIT (PERMITS)
CREATE TABLE IF NOT EXISTS permits (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'S' (Sakit) / 'I' (Izin)
    reason TEXT NOT NULL,
    lampiran_url TEXT, -- Link file foto surat dokter/keterangan di Google Drive
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    approved_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABEL LEGER NILAI RAPOR (GRADES)
CREATE TABLE IF NOT EXISTS grades (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id VARCHAR(50) NOT NULL,
    academic_year VARCHAR(20) NOT NULL, -- misal '2025/2026'
    semester VARCHAR(10) NOT NULL,      -- '1' / '2' (Ganjil / Genap)
    subject_id VARCHAR(50) NOT NULL,
    score_tp NUMERIC(5, 2),            -- Rata-rata Formatif / TP
    score_sumatif NUMERIC(5, 2),       -- Rata-rata Sumatif Lingkup Materi
    score_akhir NUMERIC(5, 2) NOT NULL,-- Nilai Akhir Rapor (0-100)
    predikat VARCHAR(5),               -- 'A', 'B', 'C', 'D'
    deskripsi TEXT,                    -- Capaian Kompetensi Kurikulum Merdeka
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEKS OPTIMASI QUERY (PERFORMA TINGGI)
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(date);
CREATE INDEX IF NOT EXISTS idx_attendances_student ON attendances(student_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_teaching_date ON teaching_presences(date);

-- DATA DEFAULT AWAL (INITIAL SEED DATA)
-- 1. Akun Admin Default
INSERT INTO users (id, username, password_hash, role, name, status)
VALUES ('U001', 'admin', 'password', 'admin', 'Admin Sekolah', 'active')
ON CONFLICT (username) DO NOTHING;

-- 2. Profil Sekolah Default
INSERT INTO school_profiles (id, npsn, nama_sekolah, jenjang, status_sekolah, alamat, kabupaten_kota, provinsi, kepala_sekolah, nip_kepala_sekolah)
VALUES (
    'default',
    '20605159',
    'SMPN 2 PABUARAN SERANG',
    'SMP',
    'Negeri',
    'Pabuaran',
    'Kabupaten Serang',
    'Banten',
    'Kepala Sekolah',
    '-'
)
ON CONFLICT (id) DO NOTHING;
