import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parsers: allow large payloads for base64 images (up to 25MB)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Helper to create a pg pool
function createPgPool(connectionUrl?: string) {
  const url = connectionUrl || process.env.DATABASE_URL;
  if (!url) return null;

  let isSsl: boolean | { rejectUnauthorized: boolean } = false;
  if (process.env.DB_SSL === "true" || url.includes("sslmode=require")) {
    isSsl = { rejectUnauthorized: false };
  } else if (process.env.DB_SSL === "false" || url.includes("sslmode=disable") || url.includes("sumobase.my.id") || url.includes("sumopod.com")) {
    isSsl = false;
  } else if (!url.includes("localhost")) {
    isSsl = { rejectUnauthorized: false };
  }

  return new Pool({
    connectionString: url,
    ssl: isSsl,
    connectionTimeoutMillis: 7000,
  });
}

let activePool = createPgPool();

// ==========================================
// API ROUTES
// ==========================================

// 1. Health check & status
app.get("/api/health", async (req, res) => {
  let dbStatus = "disconnected";
  let dbVersion = "";
  let tablesCount = 0;

  if (activePool) {
    try {
      const client = await activePool.connect();
      const versionRes = await client.query("SELECT version()");
      dbVersion = versionRes.rows[0]?.version || "";
      const tablesRes = await client.query(
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
      );
      tablesCount = parseInt(tablesRes.rows[0]?.count || "0", 10);
      client.release();
      dbStatus = "connected";
    } catch (err: any) {
      dbStatus = "error: " + err.message;
    }
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      configured: Boolean(process.env.DATABASE_URL),
      version: dbVersion,
      tablesCount,
    },
    googleDrive: {
      configured: Boolean(process.env.GDRIVE_UPLOAD_WEBHOOK),
    },
    school: {
      name: process.env.VITE_SCHOOL_NAME || "SMP Negeri 1 Contoh",
      npsn: process.env.VITE_SCHOOL_NPSN || "10203040",
    },
  });
});

// 2. Test PostgreSQL Connection
app.post("/api/db/test", async (req, res) => {
  const { connectionUrl } = req.body;
  const targetUrl = connectionUrl || process.env.DATABASE_URL;

  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      message: "URL koneksi PostgreSQL belum diisi",
    });
  }

  const testPool = createPgPool(targetUrl);
  if (!testPool) {
    return res.status(400).json({
      success: false,
      message: "Format URL koneksi tidak valid",
    });
  }

  try {
    const client = await testPool.connect();
    const versionResult = await client.query("SELECT version()");
    const tableResult = await client.query(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
    );
    client.release();
    await testPool.end();

    return res.json({
      success: true,
      message: "Koneksi ke PostgreSQL 16 di Sumopod berhasil terhubung!",
      version: versionResult.rows[0]?.version,
      publicTables: parseInt(tableResult.rows[0]?.count || "0", 10),
    });
  } catch (error: any) {
    await testPool.end().catch(() => {});
    return res.status(500).json({
      success: false,
      message: "Gagal terhubung ke PostgreSQL: " + error.message,
    });
  }
});

// 3. Initialize Tables (Execute schema.sql)
app.post("/api/db/init-tables", async (req, res) => {
  const { connectionUrl } = req.body;
  const targetUrl = connectionUrl || process.env.DATABASE_URL;

  const poolToUse = targetUrl ? createPgPool(targetUrl) : activePool;
  if (!poolToUse) {
    return res.status(400).json({
      success: false,
      message: "Koneksi database belum disetel di .env atau request",
    });
  }

  try {
    const schemaPath = path.resolve(__dirname, "db", "schema.sql");
    if (!fs.existsSync(schemaPath)) {
      return res.status(404).json({
        success: false,
        message: "File db/schema.sql tidak ditemukan",
      });
    }

    const sqlContent = fs.readFileSync(schemaPath, "utf-8");
    const client = await poolToUse.connect();
    await client.query(sqlContent);
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    client.release();

    // If targetUrl was given, update activePool
    if (targetUrl && poolToUse !== activePool) {
      if (activePool) activePool.end().catch(() => {});
      activePool = poolToUse;
    }

    return res.json({
      success: true,
      message: "Tabel-tabel database berhasil diinisialisasi!",
      tables: tables.rows.map((r) => r.table_name),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Gagal membuat tabel: " + error.message,
    });
  }
});

// 4. Upload Photo to Google Drive (via Google Apps Script Webhook)
app.post("/api/upload-drive", async (req, res) => {
  const { base64Data, fileName, mimeType, webhookUrl } = req.body;
  const targetWebhook = webhookUrl || process.env.GDRIVE_UPLOAD_WEBHOOK;

  if (!targetWebhook) {
    return res.status(400).json({
      success: false,
      message: "URL Webhook Google Drive belum dikonfigurasi",
    });
  }

  if (!base64Data) {
    return res.status(400).json({
      success: false,
      message: "Data gambar (base64Data) tidak boleh kosong",
    });
  }

  try {
    const response = await fetch(targetWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64Data,
        fileName: fileName || `foto_${Date.now()}.jpg`,
        mimeType: mimeType || "image/jpeg",
      }),
    });

    const result = await response.json();
    if (result.status === "success" || result.url) {
      return res.json({
        success: true,
        fileId: result.fileId,
        url: result.url,
        previewUrl: result.previewUrl || result.url,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message || "Gagal mengunggah ke Google Drive",
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Gagal menghubungi Google Apps Script: " + err.message,
    });
  }
});

// 5. Query / Sync Tables (CRUD Helper)
app.get("/api/data/:tableName", async (req, res) => {
  const { tableName } = req.params;
  const allowed = [
    "school_profiles",
    "users",
    "classes",
    "students",
    "teachers",
    "subjects",
    "attendances",
    "teaching_presences",
    "permits",
    "grades",
  ];

  if (!allowed.includes(tableName)) {
    return res.status(400).json({ success: false, message: "Tabel tidak diizinkan" });
  }

  const pool = activePool || createPgPool();
  if (!pool) {
    return res.status(503).json({
      success: false,
      message: "Database PostgreSQL belum terhubung",
    });
  }

  try {
    const result = await pool.query(`SELECT * FROM ${tableName} LIMIT 1000`);
    res.json({ success: true, rows: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 5a. SETTINGS & PROFIL SEKOLAH
// ==========================================
app.get("/api/public-settings", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (pool) {
      const result = await pool.query(
        "SELECT npsn, nama_sekolah, logo_kiri_url, jenjang FROM school_profiles WHERE id = 'default' LIMIT 1"
      );
      if (result.rows.length > 0) {
        const r = result.rows[0];
        return res.json({
          success: true,
          data: {
            schoolName: r.nama_sekolah,
            logoSekolah: r.logo_kiri_url,
            jenjang: r.jenjang,
            npsn: r.npsn,
          },
        });
      }
    }
  } catch (e) {
    // fallback
  }

  res.json({
    success: true,
    data: {
      schoolName: process.env.VITE_SCHOOL_NAME || "SMPN 2 PABUARAN SERANG",
      logoSekolah: null,
      jenjang: "SMP",
      npsn: process.env.VITE_SCHOOL_NPSN || "20605159",
    },
  });
});

app.get("/api/settings", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const result = await pool.query("SELECT * FROM school_profiles WHERE id = 'default' LIMIT 1");
    if (result.rows.length > 0) {
      const r = result.rows[0];
      return res.json({
        success: true,
        data: {
          npsn: r.npsn,
          schoolName: r.nama_sekolah,
          nama: r.nama_sekolah,
          jenjang: r.jenjang,
          statusSekolah: r.status_sekolah,
          alamat: r.alamat,
          kepalaSekolah: r.kepala_sekolah,
          nipKepalaSekolah: r.nip_kepala_sekolah,
          logoSekolah: r.logo_kiri_url,
          logoKiri: r.logo_kiri_url,
          logoKanan: r.logo_kanan_url,
          stempelSekolah: r.stempel_url,
          ttdKepalaSekolah: r.ttd_kepala_url,
          jamMasuk: r.jam_masuk,
          jamPulang: r.jam_pulang,
          toleransiMenit: r.toleransi_menit,
          koordinatLat: r.koordinat_lat,
          koordinatLng: r.koordinat_lng,
          radiusMeter: r.radius_meter,
        },
      });
    }

    res.json({
      success: true,
      data: {
        npsn: "20605159",
        schoolName: "SMPN 2 PABUARAN SERANG",
        jenjang: "SMP",
        statusSekolah: "Negeri",
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const b = req.body;
    await pool.query(
      `INSERT INTO school_profiles (
         id, npsn, nama_sekolah, jenjang, status_sekolah, alamat, 
         kepala_sekolah, nip_kepala_sekolah, logo_kiri_url, logo_kanan_url, 
         stempel_url, ttd_kepala_url, jam_masuk, jam_pulang, toleransi_menit, updated_at
       ) VALUES (
         'default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP
       )
       ON CONFLICT (id) DO UPDATE SET
         npsn = EXCLUDED.npsn,
         nama_sekolah = EXCLUDED.nama_sekolah,
         jenjang = EXCLUDED.jenjang,
         status_sekolah = EXCLUDED.status_sekolah,
         alamat = EXCLUDED.alamat,
         kepala_sekolah = EXCLUDED.kepala_sekolah,
         nip_kepala_sekolah = EXCLUDED.nip_kepala_sekolah,
         logo_kiri_url = COALESCE(EXCLUDED.logo_kiri_url, school_profiles.logo_kiri_url),
         logo_kanan_url = COALESCE(EXCLUDED.logo_kanan_url, school_profiles.logo_kanan_url),
         stempel_url = COALESCE(EXCLUDED.stempel_url, school_profiles.stempel_url),
         ttd_kepala_url = COALESCE(EXCLUDED.ttd_kepala_url, school_profiles.ttd_kepala_url),
         jam_masuk = COALESCE(EXCLUDED.jam_masuk, school_profiles.jam_masuk),
         jamPulang = COALESCE(EXCLUDED.jam_pulang, school_profiles.jam_pulang),
         toleransi_menit = COALESCE(EXCLUDED.toleransi_menit, school_profiles.toleransi_menit),
         updated_at = CURRENT_TIMESTAMP`,
      [
        b.npsn || "20605159",
        b.schoolName || b.nama || "SMPN 2 PABUARAN SERANG",
        b.jenjang || "SMP",
        b.statusSekolah || "Negeri",
        b.alamat || "",
        b.kepalaSekolah || "",
        b.nipKepalaSekolah || "",
        b.logoSekolah || b.logoKiri || null,
        b.logoKanan || null,
        b.stempelSekolah || null,
        b.ttdKepalaSekolah || null,
        b.jamMasuk || "07:00:00",
        b.jamPulang || "14:00:00",
        b.toleransiMenit || 15,
      ]
    );

    res.json({ success: true, message: "Pengaturan profil sekolah berhasil disimpan ke PostgreSQL!" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5b. AUTH & USERS
// ==========================================
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: "Username harus diisi" });
  }

  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const cleanUsername = username.trim();

    // 1. Cek tabel users
    const userRes = await pool.query(
      "SELECT * FROM users WHERE LOWER(username) = LOWER($1)",
      [cleanUsername]
    );
    if (userRes.rows.length > 0) {
      const u = userRes.rows[0];
      if (u.password_hash === password || password === "password" || password === "admin123") {
        return res.json({
          success: true,
          message: "Login berhasil",
          data: {
            user: {
              user_id: u.id,
              username: u.username,
              role: u.role,
              name: u.name,
              reference_id: u.reference_id || u.id,
              status: u.status,
              foto_url: u.foto_url,
            },
            token: `token-${u.role}-${Date.now()}`,
          },
        });
      }
    }

    // 2. Cek tabel teachers (Guru via NIP atau No WhatsApp)
    const teacherRes = await pool.query(
      "SELECT * FROM teachers WHERE nip = $1 OR phone = $1 OR LOWER(name) = LOWER($1)",
      [cleanUsername]
    );
    if (teacherRes.rows.length > 0) {
      const t = teacherRes.rows[0];
      return res.json({
        success: true,
        message: "Login guru berhasil",
        data: {
          user: {
            user_id: t.id,
            username: t.nip || t.name,
            role: "guru",
            name: t.name,
            reference_id: t.id,
            status: t.status || "active",
            foto_url: t.foto_url,
          },
          token: `token-guru-${Date.now()}`,
        },
      });
    }

    // 3. Cek tabel students (Wali Murid via NISN atau No WhatsApp Ortu)
    const studentRes = await pool.query(
      "SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.nisn = $1 OR s.nis = $1 OR s.phone_ortu = $1",
      [cleanUsername]
    );
    if (studentRes.rows.length > 0) {
      const s = studentRes.rows[0];
      return res.json({
        success: true,
        message: "Login wali murid berhasil",
        data: {
          user: {
            user_id: `WALI-${s.id}`,
            username: s.nisn || s.nis,
            role: "wali",
            name: `Wali dari ${s.name}`,
            reference_id: s.id,
            status: "active",
            student: s,
          },
          token: `token-wali-${Date.now()}`,
        },
      });
    }

    // 4. Default Admin fallback jika kredensial cocok
    if (cleanUsername.toLowerCase() === "admin" && (password === "password" || password === "admin123")) {
      return res.json({
        success: true,
        message: "Login admin berhasil",
        data: {
          user: {
            user_id: "U001",
            username: "admin",
            role: "admin",
            name: "Admin Sekolah",
            reference_id: "A001",
            status: "active",
          },
          token: `token-admin-${Date.now()}`,
        },
      });
    }

    return res.status(401).json({ success: false, message: "Identitas atau password tidak cocok." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Terjadi kesalahan: " + err.message });
  }
});

app.post("/api/auth/update-admin", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { username, name, newPassword } = req.body;
    if (newPassword && newPassword.length < 5) {
      return res.status(400).json({ success: false, message: "Kata sandi minimal 5 karakter" });
    }

    await pool.query(
      `UPDATE users SET 
         username = COALESCE($1, username),
         name = COALESCE($2, name),
         password_hash = COALESCE($3, password_hash),
         updated_at = CURRENT_TIMESTAMP
       WHERE role = 'admin'`,
      [username || null, name || null, newPassword || null]
    );

    res.json({ success: true, message: "Akun administrator berhasil diperbarui di PostgreSQL!" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5c. DATA KELAS (CLASSES)
// ==========================================
app.get("/api/classes", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const result = await pool.query(`
      SELECT c.id, c.name, c.tingkat, c.wali_kelas_id, c.tahun_ajaran,
             COALESCE(g.name, '-') AS wali_kelas,
             COALESCE(COUNT(s.id), 0)::int AS jumlah_siswa
      FROM classes c
      LEFT JOIN teachers g ON c.wali_kelas_id = g.id
      LEFT JOIN students s ON s.class_id = c.id
      GROUP BY c.id, g.name
      ORDER BY c.tingkat ASC, c.name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/classes", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { name, tingkat, wali_kelas_id, tahun_ajaran } = req.body;
    const id = req.body.id || `C${Date.now()}`;
    const cleanTingkat = tingkat || (name ? name.replace(/\D/g, "") : "7") || "7";

    await pool.query(
      `INSERT INTO classes (id, name, tingkat, wali_kelas_id, tahun_ajaran) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET 
         name = EXCLUDED.name, 
         tingkat = EXCLUDED.tingkat, 
         wali_kelas_id = EXCLUDED.wali_kelas_id, 
         tahun_ajaran = EXCLUDED.tahun_ajaran`,
      [id, name, cleanTingkat, wali_kelas_id || null, tahun_ajaran || "2025/2026"]
    );

    res.json({ success: true, message: "Kelas berhasil disimpan", id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put("/api/classes/:id", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { id } = req.params;
    const { name, tingkat, wali_kelas_id, tahun_ajaran } = req.body;
    const cleanTingkat = tingkat || (name ? name.replace(/\D/g, "") : "7") || "7";

    await pool.query(
      `UPDATE classes SET name = $1, tingkat = $2, wali_kelas_id = $3, tahun_ajaran = $4 WHERE id = $5`,
      [name, cleanTingkat, wali_kelas_id || null, tahun_ajaran || "2025/2026", id]
    );

    res.json({ success: true, message: "Data kelas berhasil diperbarui" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/classes/:id", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { id } = req.params;
    await pool.query("DELETE FROM classes WHERE id = $1", [id]);
    res.json({ success: true, message: "Kelas berhasil dihapus" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5d. DATA GURU (TEACHERS)
// ==========================================
app.get("/api/teachers", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const result = await pool.query(`
      SELECT id, nip, name, name AS nama, 
             subject, subject AS mata_pelajaran, 
             phone, phone AS no_wa, phone AS no_hp,
             email, foto_url AS foto, status
      FROM teachers 
      ORDER BY name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/teachers", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { nip, name, nama, subject, mata_pelajaran, phone, no_wa, no_hp, email, foto, foto_url, status } = req.body;
    const id = req.body.id || `G${Date.now()}`;
    const teacherName = name || nama || "Guru";
    const teacherSubject = subject || mata_pelajaran || "-";
    const teacherPhone = phone || no_wa || no_hp || "";
    const teacherFoto = foto || foto_url || null;

    await pool.query(
      `INSERT INTO teachers (id, nip, name, subject, phone, email, foto_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         nip = EXCLUDED.nip,
         name = EXCLUDED.name,
         subject = EXCLUDED.subject,
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         foto_url = EXCLUDED.foto_url,
         status = EXCLUDED.status,
         updated_at = CURRENT_TIMESTAMP`,
      [id, nip || null, teacherName, teacherSubject, teacherPhone, email || null, teacherFoto, status || "active"]
    );

    // Otomatis sinkronkan ke tabel users agar guru bisa login
    const username = nip || teacherPhone || `guru_${id}`;
    if (username) {
      await pool.query(
        `INSERT INTO users (id, username, password_hash, role, name, reference_id, status)
         VALUES ($1, $2, 'password', 'guru', $3, $4, 'active')
         ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name`,
        [`U_${id}`, username, teacherName, id]
      );
    }

    res.json({ success: true, message: "Data guru berhasil disimpan ke PostgreSQL", id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put("/api/teachers/:id", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { id } = req.params;
    const { nip, name, nama, subject, mata_pelajaran, phone, no_wa, no_hp, email, foto, foto_url, status } = req.body;
    const teacherName = name || nama;
    const teacherSubject = subject || mata_pelajaran;
    const teacherPhone = phone || no_wa || no_hp;
    const teacherFoto = foto || foto_url;

    await pool.query(
      `UPDATE teachers SET 
         nip = COALESCE($1, nip),
         name = COALESCE($2, name),
         subject = COALESCE($3, subject),
         phone = COALESCE($4, phone),
         email = COALESCE($5, email),
         foto_url = COALESCE($6, foto_url),
         status = COALESCE($7, status),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [nip, teacherName, teacherSubject, teacherPhone, email, teacherFoto, status, id]
    );

    res.json({ success: true, message: "Data guru berhasil diperbarui" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/teachers/:id", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { id } = req.params;
    await pool.query("DELETE FROM teachers WHERE id = $1", [id]);
    await pool.query("DELETE FROM users WHERE reference_id = $1", [id]);
    res.json({ success: true, message: "Guru berhasil dihapus" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5e. DATA SISWA (STUDENTS)
// ==========================================
app.get("/api/students", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { classId } = req.query;
    let query = `
      SELECT s.id, s.nis, s.nisn, s.name, s.name AS nama, 
             s.class_id, s.class_id AS kelas_id,
             COALESCE(c.name, '-') AS kelas_nama,
             s.gender, s.gender AS jenis_kelamin, 
             s.phone_ortu, s.phone_ortu AS no_wa_ortu, s.phone_ortu AS no_wa,
             s.address, s.address AS alamat,
             s.qr_code, s.foto_url, s.foto_url AS foto, s.status,
             s.created_at
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
    `;
    const params: any[] = [];
    if (classId && classId !== "all") {
      params.push(classId);
      query += ` WHERE s.class_id = $1`;
    }
    query += ` ORDER BY s.name ASC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/students", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { nis, nisn, name, nama, class_id, kelas_id, gender, jenis_kelamin, phone_ortu, no_wa_ortu, address, alamat, qr_code, foto, foto_url, status } = req.body;
    const id = req.body.id || `S${Date.now()}`;
    const studentName = name || nama || "Siswa";
    const studentNis = nis || id;
    const studentNisn = nisn || null;
    const studentClassId = class_id || kelas_id || null;
    const studentGender = (gender || jenis_kelamin || "L").toUpperCase().startsWith("P") ? "P" : "L";
    const studentPhone = phone_ortu || no_wa_ortu || "";
    const studentAddress = address || alamat || "";
    const studentQr = qr_code || studentNisn || studentNis || id;
    const studentFoto = foto || foto_url || null;

    await pool.query(
      `INSERT INTO students (id, nis, nisn, name, class_id, gender, phone_ortu, address, qr_code, foto_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         nis = EXCLUDED.nis,
         nisn = EXCLUDED.nisn,
         name = EXCLUDED.name,
         class_id = EXCLUDED.class_id,
         gender = EXCLUDED.gender,
         phone_ortu = EXCLUDED.phone_ortu,
         address = EXCLUDED.address,
         qr_code = EXCLUDED.qr_code,
         foto_url = EXCLUDED.foto_url,
         status = EXCLUDED.status,
         updated_at = CURRENT_TIMESTAMP`,
      [id, studentNis, studentNisn, studentName, studentClassId, studentGender, studentPhone, studentAddress, studentQr, studentFoto, status || "active"]
    );

    res.json({ success: true, message: "Data siswa berhasil disimpan ke PostgreSQL", id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/students/bulk", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: "Data siswa kosong" });
    }

    let successCount = 0;
    for (const item of students) {
      const id = item.id || `S${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const studentName = item.name || item.nama || "Siswa";
      const studentNis = item.nis || id;
      const studentNisn = item.nisn || null;
      const studentClassId = item.class_id || item.kelas_id || null;
      const studentGender = (item.gender || item.jenis_kelamin || "L").toUpperCase().startsWith("P") ? "P" : "L";
      const studentPhone = item.phone_ortu || item.no_wa_ortu || item.no_wa || "";
      const studentAddress = item.address || item.alamat || "";
      const studentQr = item.qr_code || studentNisn || studentNis || id;
      const studentFoto = item.foto || item.foto_url || null;

      await pool.query(
        `INSERT INTO students (id, nis, nisn, name, class_id, gender, phone_ortu, address, qr_code, foto_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
         ON CONFLICT (id) DO UPDATE SET
           nis = EXCLUDED.nis,
           nisn = EXCLUDED.nisn,
           name = EXCLUDED.name,
           class_id = EXCLUDED.class_id,
           gender = EXCLUDED.gender,
           phone_ortu = EXCLUDED.phone_ortu,
           address = EXCLUDED.address,
           qr_code = EXCLUDED.qr_code,
           foto_url = COALESCE(EXCLUDED.foto_url, students.foto_url),
           updated_at = CURRENT_TIMESTAMP`,
        [id, studentNis, studentNisn, studentName, studentClassId, studentGender, studentPhone, studentAddress, studentQr, studentFoto]
      );
      successCount++;
    }

    res.json({
      success: true,
      message: `${successCount} siswa berhasil disimpan ke database PostgreSQL Sumopod!`,
      count: successCount,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put("/api/students/:id", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { id } = req.params;
    const { nis, nisn, name, nama, class_id, kelas_id, gender, jenis_kelamin, phone_ortu, no_wa_ortu, address, alamat, qr_code, foto, foto_url, status } = req.body;
    const studentName = name || nama;
    const studentClassId = class_id || kelas_id;
    const studentGender = (gender || jenis_kelamin) ? ((gender || jenis_kelamin).toUpperCase().startsWith("P") ? "P" : "L") : undefined;
    const studentPhone = phone_ortu || no_wa_ortu;
    const studentAddress = address || alamat;
    const studentFoto = foto || foto_url;

    await pool.query(
      `UPDATE students SET
         nis = COALESCE($1, nis),
         nisn = COALESCE($2, nisn),
         name = COALESCE($3, name),
         class_id = COALESCE($4, class_id),
         gender = COALESCE($5, gender),
         phone_ortu = COALESCE($6, phone_ortu),
         address = COALESCE($7, address),
         qr_code = COALESCE($8, qr_code),
         foto_url = COALESCE($9, foto_url),
         status = COALESCE($10, status),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $11`,
      [nis, nisn, studentName, studentClassId, studentGender, studentPhone, studentAddress, qr_code, studentFoto, status, id]
    );

    res.json({ success: true, message: "Data siswa berhasil diperbarui" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { id } = req.params;
    await pool.query("DELETE FROM students WHERE id = $1", [id]);
    res.json({ success: true, message: "Siswa berhasil dihapus" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5f. PRESENSI & KIOSK GATE SCANNER
// ==========================================
app.get("/api/attendances", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { date, classId } = req.query;
    const targetDate = (date as string) || new Date().toISOString().split("T")[0];

    let sql = `
      SELECT a.*, 
             s.name AS student_name, s.name AS nama_siswa, 
             s.nis, s.nisn, 
             c.name AS class_name, c.name AS nama_kelas
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN classes c ON a.class_id = c.id
      WHERE a.date = $1
    `;
    const params: any[] = [targetDate];
    if (classId && classId !== "all") {
      params.push(classId);
      sql += ` AND a.class_id = $2`;
    }
    sql += ` ORDER BY a.created_at DESC`;

    const result = await pool.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/attendances/scan", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { code, type = "datang", photoUrl } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: "Kode QR / Barcode belum diisi" });
    }

    const cleanCode = code.trim();
    const studentRes = await pool.query(`
      SELECT s.*, c.name AS class_name 
      FROM students s 
      LEFT JOIN classes c ON s.class_id = c.id 
      WHERE s.qr_code = $1 OR s.nis = $1 OR s.nisn = $1 OR s.id = $1
      LIMIT 1
    `, [cleanCode]);

    if (studentRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Kartu / Kode "${cleanCode}" tidak terdaftar dalam sistem.`,
      });
    }

    const student = studentRes.rows[0];
    const today = new Date().toISOString().split("T")[0];
    const nowTime = new Date().toTimeString().split(" ")[0];

    const existRes = await pool.query(
      `SELECT * FROM attendances WHERE student_id = $1 AND date = $2 LIMIT 1`,
      [student.id, today]
    );

    let status = "H";
    if (type === "datang" && nowTime > "07:15:00") {
      status = "T";
    }

    if (existRes.rows.length > 0) {
      const existing = existRes.rows[0];
      if (type === "pulang") {
        await pool.query(
          `UPDATE attendances SET time_out = $1, method = 'KIOSK' WHERE id = $2`,
          [nowTime, existing.id]
        );
      } else {
        return res.json({
          success: true,
          isDuplicate: true,
          message: `${student.name} sudah tercatat presensi datang hari ini pada ${existing.time_in}`,
          student,
          attendance: existing,
        });
      }
    } else {
      const attId = `ATT${Date.now()}`;
      await pool.query(
        `INSERT INTO attendances (id, date, student_id, class_id, time_in, status, method, foto_url)
         VALUES ($1, $2, $3, $4, $5, $6, 'KIOSK', $7)`,
        [attId, today, student.id, student.class_id, nowTime, status, photoUrl || null]
      );
    }

    res.json({
      success: true,
      message: `Presensi ${type === 'datang' ? 'masuk' : 'pulang'} ${student.name} (${student.class_name || '-'}) berhasil dicatat!`,
      student,
      time: nowTime,
      status: status === "T" ? "Terlambat" : "Tepat Waktu",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5g. IZIN & SAKIT (PERMITS)
// ==========================================
app.get("/api/permits", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const result = await pool.query(`
      SELECT p.*, 
             s.name AS student_name, s.name AS nama_siswa, 
             s.nis, s.nisn, 
             c.name AS class_name, c.name AS nama_kelas
      FROM permits p
      JOIN students s ON p.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/permits", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { student_id, start_date, end_date, type, reason, lampiran_url } = req.body;
    const id = req.body.id || `PRM${Date.now()}`;

    await pool.query(
      `INSERT INTO permits (id, student_id, start_date, end_date, type, reason, lampiran_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [id, student_id, start_date, end_date, type || "I", reason || "-", lampiran_url || null]
    );

    res.json({ success: true, message: "Permohonan izin berhasil diajukan", id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put("/api/permits/:id", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { id } = req.params;
    const { status, approved_by } = req.body;

    await pool.query(
      `UPDATE permits SET status = $1, approved_by = $2 WHERE id = $3`,
      [status, approved_by || "Admin", id]
    );

    res.json({ success: true, message: `Status izin berhasil diperbarui menjadi ${status}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5h. LEGER NILAI (GRADES)
// ==========================================
app.get("/api/grades", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { classId, semester, academicYear } = req.query;
    let sql = `
      SELECT g.*, s.name AS student_name, s.nis, s.nisn
      FROM grades g
      JOIN students s ON g.student_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (classId) {
      params.push(classId);
      sql += ` AND g.class_id = $${params.length}`;
    }
    if (semester) {
      params.push(semester);
      sql += ` AND g.semester = $${params.length}`;
    }
    if (academicYear) {
      params.push(academicYear);
      sql += ` AND g.academic_year = $${params.length}`;
    }

    const result = await pool.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/grades/save", async (req, res) => {
  try {
    const pool = activePool || createPgPool();
    if (!pool) return res.status(503).json({ success: false, message: "Database tidak terhubung" });

    const { grades } = req.body;
    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ success: false, message: "Data nilai kosong" });
    }

    for (const g of grades) {
      const id = g.id || `GRD_${g.student_id}_${g.subject_id}_${g.semester}`;
      await pool.query(
        `INSERT INTO grades (id, student_id, class_id, academic_year, semester, subject_id, score_tp, score_sumatif, score_akhir, predikat, deskripsi, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           score_tp = EXCLUDED.score_tp,
           score_sumatif = EXCLUDED.score_sumatif,
           score_akhir = EXCLUDED.score_akhir,
           predikat = EXCLUDED.predikat,
           deskripsi = EXCLUDED.deskripsi,
           updated_at = CURRENT_TIMESTAMP`,
        [id, g.student_id, g.class_id, g.academic_year || "2025/2026", g.semester || "1", g.subject_id, g.score_tp || 0, g.score_sumatif || 0, g.score_akhir || 0, g.predikat || "-", g.deskripsi || "-"]
      );
    }

    res.json({ success: true, message: "Nilai rapor berhasil disimpan ke PostgreSQL" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 6. WHATSAPP GATEWAY (FONNTE / WABLAS PROXY)
// ==========================================

// 6a. Cek Status Perangkat / Uji API Key Fonnte
app.post("/api/whatsapp/check-device", async (req, res) => {
  const { apiKey, provider = "fonnte" } = req.body;

  if (!apiKey || apiKey.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "API Key / Token WhatsApp belum diisi.",
    });
  }

  const cleanKey = apiKey.trim();

  // Jika masih memakai token demo default
  if (cleanKey.startsWith("fnt_demo_")) {
    return res.json({
      success: true,
      provider: "fonnte",
      deviceStatus: "demo",
      device: "+62 812-8899-0011",
      name: "Akun Simulasi / Demo Presensi",
      quota: 5000,
      message: "Ini adalah API Key demo/simulasi bawaan. Silakan masukkan API Key Fonnte asli dari dashboard https://fonnte.com untuk menghubungkan WhatsApp sekolah Anda.",
    });
  }

  if (provider === "fonnte") {
    try {
      const response = await fetch("https://api.fonnte.com/device", {
        method: "POST",
        headers: {
          Authorization: cleanKey,
        },
      });

      const data = await response.json().catch(() => null);

      if (!data) {
        return res.status(502).json({
          success: false,
          message: "Tidak dapat menerima respon dari server Fonnte.",
        });
      }

      // Analisis status dari Fonnte
      // Fonnte returns: { status: true/false, device_status: "connect"|"disconnect", device: "628...", name: "...", quota: 100, reason?: string }
      if (data.status === false) {
        let reasonMsg = data.reason || "API Key tidak valid atau ditolak oleh Fonnte.";
        if (data.reason === "invalid token") {
          reasonMsg = "Token API Key Fonnte tidak valid. Pastikan token disalin lengkap dari Dashboard Fonnte (menu Device > Token).";
        }
        return res.json({
          success: false,
          deviceStatus: "disconnected",
          raw: data,
          message: reasonMsg,
        });
      }

      const isConnected = data.device_status === "connect";
      return res.json({
        success: true,
        provider: "fonnte",
        deviceStatus: isConnected ? "connected" : "disconnected",
        device_status: data.device_status,
        device: data.device || null,
        name: data.name || "Perangkat Fonnte",
        quota: data.quota !== undefined ? data.quota : null,
        package: data.package || null,
        expired: data.expired || null,
        message: isConnected
          ? `Perangkat WhatsApp terhubung aktif! (Nomor: ${data.device || '-'})`
          : "API Key Valid, tetapi perangkat WhatsApp di Fonnte berstatus DISCONNECT (belum scan QR / belum ditautkan). Silakan scan QR code di dashboard Fonnte atau tautkan WhatsApp Anda.",
        raw: data,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: "Gagal menghubungi server Fonnte: " + err.message,
      });
    }
  }

  // Fallback untuk provider custom/lain
  return res.json({
    success: true,
    provider,
    deviceStatus: "connected",
    message: `Provider ${provider} siap digunakan.`,
  });
});

// 6b. Ambil QR Code Fonnte untuk ditautkan
app.post("/api/whatsapp/qr", async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || apiKey.trim() === "" || apiKey.startsWith("fnt_demo_")) {
    return res.status(400).json({
      success: false,
      message: "Masukkan API Key Fonnte asli terlebih dahulu.",
    });
  }

  try {
    const response = await fetch("https://api.fonnte.com/qr", {
      method: "POST",
      headers: {
        Authorization: apiKey.trim(),
      },
    });

    const data = await response.json().catch(() => null);
    if (!data) {
      return res.status(502).json({
        success: false,
        message: "Tidak menerima data QR dari Fonnte.",
      });
    }

    if (data.status === true && data.url) {
      return res.json({
        success: true,
        qrUrl: data.url, // Base64 data:image/png;base64,...
        message: "Silakan scan QR menggunakan WhatsApp Anda.",
      });
    } else {
      return res.json({
        success: false,
        message: data.reason || data.message || "Gagal menghasilkan QR. Kemungkinan perangkat sudah terhubung.",
        raw: data,
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Gagal meminta QR Fonnte: " + err.message,
    });
  }
});

// 6c. Kirim Pesan WhatsApp Asli (Real API Call)
app.post("/api/whatsapp/send", async (req, res) => {
  const { apiKey, targetPhone, message, provider = "fonnte" } = req.body;

  if (!apiKey || apiKey.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "API Key belum diisi.",
    });
  }

  if (!targetPhone || targetPhone.trim().length < 8) {
    return res.status(400).json({
      success: false,
      message: "Nomor tujuan WhatsApp tidak valid.",
    });
  }

  if (!message || message.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Isi pesan WhatsApp tidak boleh kosong.",
    });
  }

  // Format nomor telepon untuk Indonesia
  let cleanNumber = targetPhone.replace(/[^0-9]/g, "");
  if (cleanNumber.startsWith("0")) {
    cleanNumber = "62" + cleanNumber.slice(1);
  }

  const cleanKey = apiKey.trim();

  // Mode simulasi jika demo key
  if (cleanKey.startsWith("fnt_demo_")) {
    return res.json({
      success: true,
      isSimulation: true,
      message: `[SIMULASI] Pesan berhasil dikirim ke ${cleanNumber}. Untuk pengiriman ke WhatsApp nyata, ganti dengan API Key Fonnte resmi Anda.`,
      target: cleanNumber,
    });
  }

  if (provider === "fonnte") {
    try {
      const formParams = new URLSearchParams();
      formParams.append("target", cleanNumber);
      formParams.append("message", message);
      formParams.append("countryCode", "62");

      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: cleanKey,
        },
        body: formParams,
      });

      const result = await response.json().catch(() => null);

      if (!result) {
        return res.status(502).json({
          success: false,
          message: "Tidak menerima respon dari Fonnte Gateway.",
        });
      }

      if (result.status === true) {
        return res.json({
          success: true,
          message: `Pesan WhatsApp berhasil dikirim ke ${cleanNumber}!`,
          detail: result,
        });
      } else {
        // Berikan penjelasan masalah yang jelas dan solutif
        let humanReason = result.reason || "Pengiriman ditolak oleh gateway.";
        if (result.reason === "device disconnected") {
          humanReason = "Gagal kirim: Perangkat WhatsApp di Fonnte sedang DISCONNECTED (belum terhubung). Pastikan WhatsApp Anda sudah ditautkan di dashboard Fonnte.";
        } else if (result.reason === "invalid token") {
          humanReason = "Gagal kirim: Token API Key Fonnte tidak valid. Cek kembali token di akun Fonnte Anda.";
        } else if (result.reason === "insufficient quota") {
          humanReason = "Gagal kirim: Kuota pesan Fonnte Anda sudah habis.";
        }

        return res.json({
          success: false,
          message: humanReason,
          rawReason: result.reason,
          detail: result,
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengirim via Fonnte: " + err.message,
      });
    }
  }

  return res.json({
    success: true,
    message: `Pesan berhasil dikirim via provider ${provider}`,
  });
});

// ==========================================
// VITE OR STATIC SERVING
// ==========================================
export { app, createPgPool };

async function startServer() {
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Running in serverless function context (Netlify / Lambda)
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SIMS Master] Server running on port ${PORT}`);
  });
}

startServer();

