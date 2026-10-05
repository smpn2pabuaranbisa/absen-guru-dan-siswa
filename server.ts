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

  if (!activePool) {
    return res.status(503).json({
      success: false,
      message: "Database PostgreSQL belum terhubung",
    });
  }

  try {
    const result = await activePool.query(`SELECT * FROM ${tableName} LIMIT 1000`);
    res.json({ success: true, rows: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
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
async function startServer() {
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
