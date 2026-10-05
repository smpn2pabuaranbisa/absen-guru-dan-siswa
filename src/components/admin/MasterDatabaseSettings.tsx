import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  Server, 
  Cloud, 
  HardDrive, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertTriangle, 
  Code2, 
  Play, 
  FileText, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Image as ImageIcon
} from "lucide-react";

export default function MasterDatabaseSettings() {
  // PostgreSQL State
  const [dbUrl, setDbUrl] = useState("");
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{
    success: boolean;
    message: string;
    version?: string;
    publicTables?: number;
  } | null>(null);

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    message: string;
    tables?: string[];
  } | null>(null);

  // Google Drive State
  const [gdriveWebhook, setGdriveWebhook] = useState("");
  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<{
    success: boolean;
    message: string;
    url?: string;
    fileId?: string;
  } | null>(null);

  // Script Modal / Copy
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Initial Server Status Check
  const [serverHealth, setServerHealth] = useState<any>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);

  const fetchHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setServerHealth(data);
      }
    } catch (e) {
      console.warn("Server backend status check:", e);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Load from localStorage if previously stored in client
    const savedWebhook = localStorage.getItem("sims_gdrive_webhook_url");
    if (savedWebhook) setGdriveWebhook(savedWebhook);
  }, []);

  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    setDbTestResult(null);
    try {
      const res = await fetch("/api/db/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionUrl: dbUrl || undefined }),
      });
      const data = await res.json();
      setDbTestResult(data);
      if (data.success) fetchHealth();
    } catch (err: any) {
      setDbTestResult({
        success: false,
        message: "Gagal menghubungi backend: " + err.message,
      });
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleInitTables = async () => {
    if (!confirm("Inisialisasi tabel akan menjalankan skema database (db/schema.sql). Lanjutkan?")) {
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const res = await fetch("/api/db/init-tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionUrl: dbUrl || undefined }),
      });
      const data = await res.json();
      setMigrationResult(data);
      if (data.success) fetchHealth();
    } catch (err: any) {
      setMigrationResult({
        success: false,
        message: "Gagal inisialisasi tabel: " + err.message,
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSaveWebhook = () => {
    if (gdriveWebhook) {
      localStorage.setItem("sims_gdrive_webhook_url", gdriveWebhook);
    }
  };

  const handleTestDrive = async () => {
    setIsTestingDrive(true);
    setDriveTestResult(null);
    handleSaveWebhook();

    // Small 1x1 test transparent png in base64
    const sampleBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    try {
      const res = await fetch("/api/upload-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Data: sampleBase64,
          fileName: `test_ping_${Date.now()}.png`,
          mimeType: "image/png",
          webhookUrl: gdriveWebhook || undefined,
        }),
      });
      const data = await res.json();
      setDriveTestResult(data);
    } catch (err: any) {
      setDriveTestResult({
        success: false,
        message: "Gagal menghubungi Webhook Google Drive: " + err.message,
      });
    } finally {
      setIsTestingDrive(false);
    }
  };

  const appsScriptCode = `// KODE GOOGLE APPS SCRIPT - PENGUNGGAH FOTO KE GOOGLE DRIVE SEKOLAH
var FOLDER_ID = "MASUKKAN_FOLDER_ID_GOOGLE_DRIVE_DI_SINI";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var targetFolderId = data.folderId || FOLDER_ID;
    var folder = DriveApp.getFolderById(targetFolderId);

    var contentType = data.mimeType || "image/jpeg";
    var fileName = data.fileName || "foto_" + new Date().getTime() + ".jpg";
    
    var base64Clean = data.base64Data;
    if (base64Clean.indexOf(",") > -1) {
      base64Clean = base64Clean.split(",")[1];
    }

    var bytes = Utilities.base64Decode(base64Clean);
    var blob = Utilities.newBlob(bytes, contentType, fileName);

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    var directViewUrl = "https://lh3.googleusercontent.com/d/" + fileId;

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      fileId: fileId,
      url: directViewUrl,
      fileName: fileName
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER BANNER */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Arsitektur Master (Model A - Multi-Instance)</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">
              Pusat Konfigurasi Database & Cloud Storage
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Konfigurasi independen untuk setiap sekolah: data angka/teks dikelola oleh <strong className="text-white">PostgreSQL 16 di Sumopod</strong>, sedangkan seluruh file foto & bukti presensi tersimpan otomatis di <strong className="text-white">Google Drive Sekolah</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={fetchHealth}
              disabled={isLoadingHealth}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? "animate-spin" : ""}`} />
              <span>Cek Status Server</span>
            </Button>
          </div>
        </div>

        {/* STATUS BAR QUICK INFO */}
        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2 bg-white/5 p-2.5 rounded-lg border border-white/10">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[10px]">PostgreSQL (Sumopod)</div>
              <div className="font-semibold text-white">
                {serverHealth?.database?.status === "connected" ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Terhubung ({serverHealth.database.tablesCount} Tabel)
                  </span>
                ) : (
                  <span className="text-amber-300 flex items-center gap-1">
                    Siap Dihubungkan / Demo Mode
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 p-2.5 rounded-lg border border-white/10">
            <Cloud className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[10px]">Google Drive Storage</div>
              <div className="font-semibold text-white">
                {serverHealth?.googleDrive?.configured || gdriveWebhook ? (
                  <span className="text-blue-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Webhook Aktif
                  </span>
                ) : (
                  <span className="text-slate-400">Belum Terpasang</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 p-2.5 rounded-lg border border-white/10">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[10px]">Kemandirian Data</div>
              <div className="font-semibold text-indigo-300">100% Terisolasi per Sekolah</div>
            </div>
          </div>
        </div>
      </div>

      {/* DUA KOLOM UTAMA: POSTGRESQL & GOOGLE DRIVE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* KARTU 1: POSTGRESQL 16 (SUMOPOD) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Database PostgreSQL 16</h3>
                  <p className="text-xs text-gray-500">Koneksi ke Sumopod.com atau VPS mandiri</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                Data Angka & Teks
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  URL Koneksi PostgreSQL (DATABASE_URL)
                </label>
                <input
                  type="text"
                  value={dbUrl}
                  onChange={(e) => setDbUrl(e.target.value)}
                  placeholder="postgres://username:password@host.sumopod.com:5432/nama_database"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Kosongkan jika ingin menggunakan nilai <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">DATABASE_URL</code> dari file <code className="font-semibold">.env</code> server.
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleTestDatabase}
                  disabled={isTestingDb}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isTestingDb ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menguji Koneksi...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Tes Koneksi ke Sumopod</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleInitTables}
                  disabled={isMigrating}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {isMigrating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Membuat Tabel...</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Inisialisasi Tabel (`schema.sql`)</span>
                    </>
                  )}
                </Button>
              </div>

              {/* HASIL TEST DATABASE */}
              {dbTestResult && (
                <div className={`p-4 rounded-xl text-xs border ${
                  dbTestResult.success 
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" 
                    : "bg-red-50/70 border-red-200 text-red-900"
                }`}>
                  <div className="flex items-start gap-2">
                    {dbTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">{dbTestResult.message}</p>
                      {dbTestResult.version && (
                        <p className="text-[11px] text-gray-600 mt-1 font-mono truncate">
                          Versi: {dbTestResult.version}
                        </p>
                      )}
                      {dbTestResult.publicTables !== undefined && (
                        <p className="text-[11px] font-semibold text-emerald-800 mt-0.5">
                          Tabel aktif di skema public: {dbTestResult.publicTables} tabel
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* HASIL MIGRATION */}
              {migrationResult && (
                <div className={`p-4 rounded-xl text-xs border ${
                  migrationResult.success 
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" 
                    : "bg-red-50/70 border-red-200 text-red-900"
                }`}>
                  <p className="font-bold flex items-center gap-1.5">
                    {migrationResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                    {migrationResult.message}
                  </p>
                  {migrationResult.tables && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {migrationResult.tables.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded bg-white text-emerald-800 font-mono text-[10px] border border-emerald-200">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>File skema: <code className="font-mono text-gray-700 bg-gray-100 px-1 py-0.5 rounded">db/schema.sql</code></span>
            <span className="text-emerald-700 font-semibold">PostgreSQL 16 Compatible</span>
          </div>
        </div>

        {/* KARTU 2: GOOGLE DRIVE STORAGE */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Google Drive Storage</h3>
                  <p className="text-xs text-gray-500">Penyimpanan foto siswa, guru & bukti presensi</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                File Gambar & Arsip
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  URL Webhook Google Apps Script
                </label>
                <input
                  type="text"
                  value={gdriveWebhook}
                  onChange={(e) => setGdriveWebhook(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Didapatkan setelah menerapkan skrip Apps Script di Google Drive sekolah.
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleTestDrive}
                  disabled={isTestingDrive}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isTestingDrive ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menguji Upload...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Tes Upload Foto ke Drive</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowScriptModal(true)}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Lihat Skrip Apps Script</span>
                </Button>
              </div>

              {/* HASIL TEST DRIVE */}
              {driveTestResult && (
                <div className={`p-4 rounded-xl text-xs border ${
                  driveTestResult.success 
                    ? "bg-blue-50/70 border-blue-200 text-blue-900" 
                    : "bg-red-50/70 border-red-200 text-red-900"
                }`}>
                  <div className="flex items-start gap-2">
                    {driveTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">{driveTestResult.message || (driveTestResult.success ? "Upload berhasil!" : "Upload gagal")}</p>
                      {driveTestResult.url && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[11px] text-gray-600">Link CDN Google Drive:</p>
                          <a 
                            href={driveTestResult.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="font-mono text-[10px] text-blue-700 hover:underline break-all block"
                          >
                            {driveTestResult.url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Kapasitas penyimpanan: <strong className="text-gray-700">15 GB (Gratis) / Unlimited (.sch.id)</strong></span>
            <span className="text-blue-700 font-semibold">DriveApp API</span>
          </div>
        </div>
      </div>

      {/* MODAL LIHAT & SALIN SKRIP GOOGLE APPS SCRIPT */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">Skrip Google Apps Script untuk Google Drive</h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowScriptModal(false)}
                className="text-gray-400 hover:text-gray-700 text-xs cursor-pointer"
              >
                ✕ Tutup
              </Button>
            </div>

            <div className="my-4 overflow-y-auto flex-1 space-y-3">
              <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-xs leading-relaxed border border-blue-200">
                <strong>Cara Memasang:</strong>
                <ol className="list-decimal pl-4 mt-1 space-y-0.5">
                  <li>Buka <a href="https://script.google.com" target="_blank" rel="noreferrer" className="underline font-bold">script.google.com</a> dengan akun Google sekolah.</li>
                  <li>Buat Proyek Baru, lalu ganti seluruh kodenya dengan skrip di bawah ini.</li>
                  <li>Ubah variabel <code className="font-mono bg-blue-100 px-1 rounded">FOLDER_ID</code> dengan ID folder Google Drive sekolah.</li>
                  <li>Klik <strong>Terapkan (Deploy)</strong> $\rightarrow$ <strong>Penerapan Baru</strong> $\rightarrow$ Pilih <strong>Aplikasi Web</strong>.</li>
                  <li>Setel <em>"Yang memiliki akses"</em> ke <strong>"Siapa saja (Anyone)"</strong>, lalu salin URL Web App yang muncul.</li>
                </ol>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 text-[11px] font-mono p-4 rounded-xl overflow-x-auto max-h-[300px]">
                  {appsScriptCode}
                </pre>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="absolute top-3 right-3 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm cursor-pointer"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Skrip</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <Button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold"
              >
                Selesai
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
