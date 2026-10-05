# SOP INTERNAL: PANDUAN DEPLOYMENT APLIKASI MASTER (MODEL A)
> **DOKUMEN RAHASIA VENDOR / PENGEMBANG**  
> *Panduan ini ditujukan khusus bagi developer/operator untuk mendistribusikan aplikasi SIMS ke sekolah klien baru.*

---

## 1. Konsep Arsitektur (Model A - Multi-Instance)
Setiap sekolah klien mendapatkan instalasi dan konfigurasi mandiri (*isolated environment*):
* **Data Angka/Teks/Relasi**: Dikelola oleh **PostgreSQL 16 di Sumopod.com** (atau database PostgreSQL mandiri sekolah).
* **File Gambar/Foto/Dokumen**: Disimpan di **Google Drive milik sekolah bersangkutan** melalui webhook Google Apps Script.
* **Keuntungan**:
  - Kerahasiaan data siswa, guru, dan nilai antar sekolah terpisah 100%.
  - Kuota penyimpanan dan biaya operasional ditanggung masing-masing sekolah.
  - Tampilan visual aplikasi di klien bersih dan profesional tanpa instruksi teknis pengembang.

---

## 2. Langkah Cepat Duplikasi ke Sekolah Baru (Estimasi: 5 Menit)

### Langkah 1: Siapkan Database di Sumopod.com (1 Menit)
1. Buka dashboard [Sumopod.com](https://sumopod.com).
2. Buat database PostgreSQL 16 baru untuk sekolah klien (misal: `db_smpn1teladan`).
3. Catat Connection String yang diberikan, contoh:
   ```text
   postgres://username:password@pgsql.sumopod.com:5432/db_smpn1teladan
   ```
4. Pastikan firewall / *Access Control* Sumopod mengizinkan akses koneksi (0.0.0.0/0 atau IP server).

---

### Langkah 2: Siapkan Penyimpanan Foto di Google Drive Sekolah (2 Menit)
1. Buka Google Drive dengan akun Google resmi sekolah (Gmail biasa atau Google Workspace `@sekolah.sch.id` / `belajar.id`).
2. Buat folder baru, beri nama: `SIMS_ARSIP_FOTO`.
3. Klik kanan folder $\rightarrow$ **Bagikan (Share)** $\rightarrow$ Ubah Akses Umum menjadi **"Siapa saja yang memiliki tautan"** (*Anyone with the link can view*).
4. Buka folder tersebut, salin **Folder ID** dari address bar browser (kode acak setelah `/folders/...`).
5. Buka [script.google.com](https://script.google.com/) $\rightarrow$ **+ Proyek Baru**.
6. Tempel isi skrip dari file `google_drive_script.js` yang ada di proyek ini.
7. Ganti variabel `FOLDER_ID` di baris atas dengan Folder ID yang telah disalin.
8. Klik tombol **Terapkan (Deploy)** $\rightarrow$ **Penerapan Baru (New Deployment)**:
   - Jenis: **Aplikasi Web (Web App)**
   - Jalankan sebagai: **Saya (Akun Google Sekolah)**
   - Akses: **Siapa saja (Anyone)**
9. Klik **Terapkan** dan salin **URL Web App** yang dihasilkan (contoh: `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Langkah 3: Konfigurasi File Lingkungan (.env) (1 Menit)
Pada server atau hosting instance sekolah baru, buat file `.env` (bisa menyalin dari `.env.example`):

```env
PORT=3000
NODE_ENV=production

# Identitas Sekolah
VITE_APP_TITLE="Sistem Informasi Manajemen Sekolah"
VITE_SCHOOL_NAME="SMP Negeri 1 Teladan"
VITE_SCHOOL_NPSN="10203040"

# Koneksi PostgreSQL Sumopod
DATABASE_URL="postgres://username:password@pgsql.sumopod.com:5432/db_smpn1teladan"
DB_SSL=false

# Webhook Google Drive
GDRIVE_UPLOAD_WEBHOOK="https://script.google.com/macros/s/AKfycb.../exec"
```

---

### Langkah 4: Inisialisasi Database (1 Menit)
1. Jalankan aplikasi atau buka dashboard Admin di browser:
   `https://domain-sekolah.sch.id/admin/pengaturan`
2. Masuk ke tab **"Database & Drive Master"**.
3. Klik tombol **"Tes Koneksi ke Sumopod"** (pastikan muncul tanda centang hijau).
4. Klik tombol **"Inisialisasi Tabel (`schema.sql`)"** untuk membuat 10 tabel database dan data default admin secara otomatis.
5. Klik **"Tes Upload Foto ke Drive"** untuk memastikan foto langsung tersimpan di Google Drive sekolah.

---

## 3. Skema Kredensial & Akun Login (Data Riil Sekolah)

Aplikasi SIMS dirancang dengan prinsip **Universal Identity & Zero-Setup Accounts**. Ketika data guru dan siswa diimpor (dari Dapodik / berkas Excel), **seluruh akun otomatis aktif** tanpa mengharuskan admin membuat akun satu per satu.

---

### A. Akun Administrator Sekolah (Serah Terima Awal)
* **Username Default**: `admin`
* **Password Default**: `password`
* **SOP Vendor**:
  1. Berikan akun ini kepada Kepala Sekolah atau Penanggung Jawab IT Sekolah saat serah terima.
  2. Dampingi Admin Sekolah untuk langsung mengubah username dan password baru di menu:  
     **Admin $\rightarrow$ Pengaturan $\rightarrow$ Akun Login Admin**.

---

### B. Akun Guru & Tenaga Pendidik (Data Riil)
Setelah data guru diunggah via Excel / Dapodik, setiap guru langsung dapat login ke **Portal Guru** (`/guru/home`) menggunakan:

| Kolom Input | Nilai yang Diterima (Pilih Salah Satu) |
|---|---|
| **Username** | 1. **NIP Guru** (contoh: `198205122008011015`)<br>2. **NUPTK** (contoh: `4538760662200023`)<br>3. **Email Resmi** (contoh: `bambang@sekolah.sch.id`)<br>4. **Nomor HP / WhatsApp** (contoh: `081234567891`) |
| **Password Default** | `password` **atau** nomor **NIP / NUPTK** masing-masing guru |

*Catatan: Guru dapat memperbarui kata sandi secara mandiri setelah login perdana.*

---

### C. Akun Wali Murid / Orang Tua Siswa (Data Riil)
Orang tua murid otomatis memiliki akses ke **Portal Wali Murid** (`/wali/home`) begitu data anak tersimpan di sistem:

| Kolom Input | Nilai yang Diterima (Pilih Salah Satu) |
|---|---|
| **Username** | 1. **Nomor WhatsApp Wali** (contoh: `081298765431`)<br>2. **NISN Siswa** (contoh: `0051234567`)<br>3. **NIS Siswa** (contoh: `2024001`) |
| **Password Default** | `password` **atau** nomor **NISN Siswa** |

*Keunggulan Praktis: Menggunakan nomor **NISN anak** sebagai password sangat disukai orang tua murid karena mudah diingat dan tercantum di rapor/kartu pelajar tanpa perlu menghafal sandi baru.*

---

### D. Akun Petugas Gerbang / Satpam (Kiosk Standalone)
* **Username**: `satpam`
* **Password**: `password`
* **Fungsi**: Khusus untuk perangkat tablet/PC di pos gerbang sekolah dalam mode *Kiosk Standalone Scan RFID / Kamera QR Siswa*.

---

### E. Template Pesan Broadcast WhatsApp (Siap Dibagikan ke Sekolah)

Sebagai nilai tambah layanan Anda, berikan template pesan ini kepada sekolah untuk dibagikan ke grup WhatsApp resmi:

#### 1. Template Pesan untuk Guru:
```text
Bapak/Ibu Guru yang kami hormati,
Aplikasi Presensi & Akademik Digital sekolah kita sudah aktif.
Bapak/Ibu dapat masuk ke portal melalui: [MASUKKAN_URL_SEKOLAH]

• Username: NIP / No. WhatsApp Bapak/Ibu
• Password Default: password (atau NIP masing-masing)

Silakan login untuk memantau kehadiran siswa, jurnal mengajar, dan nilai rapor. Terima kasih.
```

#### 2. Template Pesan untuk Wali Murid:
```text
Yth. Bapak/Ibu Orang Tua / Wali Murid,
Untuk memantau kehadiran dan kegiatan belajar ananda secara real-time, silakan akses Portal SIMS Sekolah di:
[MASUKKAN_URL_SEKOLAH]

• Username: Nomor WhatsApp Ayah/Bunda ATAU NISN ananda
• Password: password ATAU NISN ananda

Melalui portal ini, Bapak/Ibu dapat memantau jam masuk/pulang ananda dan mengajukan surat izin secara online. Terima kasih.
```

---

## 4. File-File Penting Terkait Deployment
| File | Fungsi |
|---|---|
| `db/schema.sql` | Skrip DDL 10 tabel PostgreSQL 16 + Indeks performa + Seed Data |
| `google_drive_script.js` | Kode Google Apps Script untuk Google Drive sekolah |
| `.env.example` | Template variabel lingkungan untuk instance baru |
| `server.ts` | Backend Express & API Proxy koneksi database/storage |
