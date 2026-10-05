import React, { useState, useEffect } from "react";
import { useAuth } from "@/store/useAuth";
import { 
  apiGetWhatsAppSettings, 
  apiUpdateWhatsAppSettings, 
  apiSendTestWhatsApp, 
  apiGetWhatsAppLogs, 
  apiResendWhatsApp,
  apiCheckWhatsAppDevice,
  apiGetWhatsAppQr,
  WhatsAppConfig,
  WhatsAppLog,
  DeviceStatusResult
} from "@/services/api";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Smartphone, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ExternalLink, 
  Search, 
  Filter, 
  Settings2, 
  FileText, 
  History, 
  ShieldCheck, 
  CheckCheck, 
  Bell, 
  PhoneCall, 
  QrCode,
  Clock,
  Sparkles,
  Info,
  Wifi,
  WifiOff
} from "lucide-react";

export default function AdminWhatsAppGateway() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<"gateway" | "template" | "test" | "logs">("gateway");
  
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingDevice, setIsCheckingDevice] = useState(false);
  const [deviceCheckInfo, setDeviceCheckInfo] = useState<DeviceStatusResult | null>(null);

  // QR Modal states
  const [showQrModal, setShowQrModal] = useState(false);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [fonnteQrUrl, setFonnteQrUrl] = useState<string | null>(null);
  const [qrMessage, setQrMessage] = useState<string | null>(null);
  
  // Feedback alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Test send state
  const [testPhone, setTestPhone] = useState("081298765431");
  const [testMessage, setTestMessage] = useState(
    "Halo Bpk. Hendra Gunawan, ini adalah pesan uji coba dari sistem bot WhatsApp Presensi SMP Negeri 1 Nusantara."
  );
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Logs filters
  const [logFilter, setLogFilter] = useState("all");
  const [logSearch, setLogSearch] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Selected template view for preview
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<"hadir" | "terlambat" | "alpa" | "izin">("hadir");

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [settingsRes, logsRes] = await Promise.all([
        apiGetWhatsAppSettings(token),
        apiGetWhatsAppLogs(token, logFilter, logSearch)
      ]);

      if (settingsRes.success && settingsRes.data) {
        setConfig(settingsRes.data);
      }
      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data);
      }
    } catch (err) {
      setErrorMsg("Gagal memuat data WhatsApp Gateway.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleConfigChange = (key: keyof WhatsAppConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  const handleTemplateChange = (key: keyof WhatsAppConfig["templates"], value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      templates: {
        ...config.templates,
        [key]: value
      }
    });
  };

  const handleSaveSettings = async () => {
    if (!token || !config) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiUpdateWhatsAppSettings(token, config);
      if (res.success && res.data) {
        setConfig(res.data);
        setSuccessMsg("Konfigurasi WhatsApp Gateway & Template pesan berhasil disimpan.");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(res.message || "Gagal menyimpan konfigurasi.");
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Uji Coba Koneksi & Cek Status Perangkat Fonnte
  const handleCheckDevice = async () => {
    if (!token || !config) return;
    if (!config.apiKey || config.apiKey.trim() === "") {
      setErrorMsg("Masukkan API Key / Token Fonnte terlebih dahulu sebelum melakukan uji koneksi.");
      return;
    }

    setIsCheckingDevice(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiCheckWhatsAppDevice(token, config.apiKey, config.provider);
      if (res.data) {
        setDeviceCheckInfo(res.data);
        setConfig(prev => prev ? {
          ...prev,
          deviceStatus: res.data?.deviceStatus === "connected" ? "connected" : "disconnected",
          senderNumber: res.data?.device || prev.senderNumber,
          senderDeviceName: res.data?.name || prev.senderDeviceName
        } : null);
      }

      if (res.success && res.data) {
        if (res.data.deviceStatus === "connected") {
          setSuccessMsg(`KONEKSI BERHASIL! Perangkat WhatsApp terhubung aktif (Nomor: ${res.data.device || '-'}). Sisa kuota: ${res.data.quota ?? 'Tersedia'}`);
        } else {
          setErrorMsg(res.data.message || res.message);
        }
      } else {
        setErrorMsg(res.message || "Uji koneksi gagal. Periksa kembali API Key Anda.");
      }
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan saat menguji koneksi: " + err.message);
    } finally {
      setIsCheckingDevice(false);
    }
  };

  // Ambil QR Code Asli dari Fonnte
  const handleFetchQr = async () => {
    if (!token || !config?.apiKey) {
      setErrorMsg("Masukkan API Key terlebih dahulu.");
      return;
    }
    setIsLoadingQr(true);
    setQrMessage(null);
    setFonnteQrUrl(null);

    try {
      const res = await apiGetWhatsAppQr(token, config.apiKey);
      if (res.success && res.data?.qrUrl) {
        setFonnteQrUrl(res.data.qrUrl);
        setQrMessage(res.data.message || "Scan QR Code ini melalui aplikasi WhatsApp Anda.");
      } else {
        setQrMessage(res.message || "Tidak dapat memuat QR Code. Pastikan API Key valid dan perangkat belum terhubung.");
      }
    } catch (err: any) {
      setQrMessage("Gagal meminta QR Code dari Fonnte: " + err.message);
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSendingTest(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiSendTestWhatsApp(
        token, 
        testPhone, 
        testMessage, 
        config?.apiKey, 
        config?.provider
      );
      if (res.success) {
        setSuccessMsg(res.message);
        // refresh logs
        const refreshedLogs = await apiGetWhatsAppLogs(token);
        if (refreshedLogs.success && refreshedLogs.data) {
          setLogs(refreshedLogs.data);
        }
      } else {
        setErrorMsg(res.message);
        // refresh logs to show failed entry
        const refreshedLogs = await apiGetWhatsAppLogs(token);
        if (refreshedLogs.success && refreshedLogs.data) {
          setLogs(refreshedLogs.data);
        }
      }
    } catch (err) {
      setErrorMsg("Gagal mengirimkan pesan uji coba.");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleResend = async (logId: string) => {
    if (!token) return;
    setResendingId(logId);
    try {
      const res = await apiResendWhatsApp(token, logId);
      if (res.success && res.data) {
        setLogs(prev => prev.map(l => l.id === logId ? res.data! : l));
        setSuccessMsg(res.message);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setErrorMsg("Gagal mengirim ulang pesan.");
    } finally {
      setResendingId(null);
    }
  };

  // Helper template preview generator
  const getTemplatePreview = () => {
    if (!config) return "";
    let template = config.templates[selectedTemplateKey];
    return template
      .replace(/{nama_wali}/g, "Bpk. Hendra Gunawan")
      .replace(/{nama_siswa}/g, "Ahmad Riyadi")
      .replace(/{kelas}/g, "Kelas 7A")
      .replace(/{jam}/g, "07:10 WIB")
      .replace(/{tanggal}/g, "Kamis, 3 September 2026")
      .replace(/{mata_pelajaran}/g, "Matematika")
      .replace(/{nama_guru}/g, "Ahmad Guru, S.Pd")
      .replace(/{sekolah}/g, "SMP Negeri 1 Nusantara")
      .replace(/{status}/g, selectedTemplateKey === "izin" ? "Izin" : "Hadir")
      .replace(/{keterangan}/g, "Keperluan keluarga");
  };

  const insertVariable = (varName: string) => {
    if (!config) return;
    const current = config.templates[selectedTemplateKey];
    handleTemplateChange(selectedTemplateKey, current + " " + varName);
  };

  const filteredLogs = logs.filter(log => {
    const matchFilter = logFilter === "all" || 
      log.status_kehadiran.toLowerCase() === logFilter.toLowerCase() ||
      log.status_kirim.toLowerCase() === logFilter.toLowerCase();
    
    const matchSearch = !logSearch || 
      log.siswa_nama.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.wali_nama.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.no_wa.includes(logSearch);

    return matchFilter && matchSearch;
  });

  // Calculate statistics
  const totalSent = logs.filter(l => l.status_kirim === "Terkirim").length;
  const totalAlpaNotif = logs.filter(l => l.status_kehadiran === "Alpa").length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-gray-600">Memuat konfigurasi WhatsApp Gateway...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 bg-emerald-600/50 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-emerald-100 border border-emerald-400/30">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Phase 44: Integrasi Otomatisasi WhatsApp Orang Tua</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-emerald-300" />
            WhatsApp Gateway & Notifikasi Wali
          </h1>
          <p className="text-xs text-emerald-100/90 max-w-2xl leading-relaxed">
            Kirimkan notifikasi instan secara otomatis ke nomor WhatsApp orang tua ketika siswa diabsen oleh guru, terlambat, atau terdata alpa di kelas.
          </p>
        </div>

        {/* Live Device Status Pill */}
        <div className={`backdrop-blur-md rounded-xl p-3.5 border flex items-center gap-3 transition-colors ${
          config?.deviceStatus === "connected"
            ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-100"
            : config?.deviceStatus === "demo"
            ? "bg-blue-500/20 border-blue-400/40 text-blue-100"
            : "bg-amber-500/20 border-amber-400/40 text-amber-100"
        }`}>
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            {config?.deviceStatus === "connected" ? (
              <Wifi className="w-6 h-6 text-emerald-300" />
            ) : (
              <WifiOff className="w-6 h-6 text-amber-300" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${
                config?.deviceStatus === "connected" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}></span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {config?.deviceStatus === "connected" ? "Device Online" : config?.deviceStatus === "demo" ? "Mode Demo" : "Device Disconnected"}
              </span>
            </div>
            <p className="text-xs font-semibold">{config?.senderNumber || "Belum Tertaut"}</p>
            <p className="text-[10px] opacity-80">{config?.senderDeviceName || "Fonnte WhatsApp API"}</p>
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-3 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-xs font-semibold">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center space-x-3 shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-xs font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Quick Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Pesan Terkirim</p>
            <p className="text-lg font-bold text-gray-900">{totalSent} pesan</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Alert Alpa Terkirim</p>
            <p className="text-lg font-bold text-rose-700">{totalAlpaNotif} peringatan</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CheckCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Delivery Rate</p>
            <p className="text-lg font-bold text-gray-900">99.4%</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Sisa Kuota API</p>
            <p className="text-lg font-bold text-amber-800">4,850 / 5,000</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 flex flex-wrap gap-1 shadow-xs">
        <button
          onClick={() => setActiveTab("gateway")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "gateway"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>Konfigurasi Gateway</span>
        </button>

        <button
          onClick={() => setActiveTab("template")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "template"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Template Pesan WhatsApp</span>
        </button>

        <button
          onClick={() => setActiveTab("test")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "test"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Uji Coba Kirim (Test)</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "logs"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Log Riwayat Pengiriman ({logs.length})</span>
        </button>
      </div>

      {/* TAB 1: KONFIGURASI GATEWAY */}
      {activeTab === "gateway" && config && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">Koneksi Server WhatsApp API</h2>
                <p className="text-xs text-gray-500">Tentukan provider dan integrasi pengiriman pesan otomatis</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowQrModal(true);
                    if (config.apiKey && !config.apiKey.startsWith("fnt_demo_")) {
                      handleFetchQr();
                    }
                  }}
                  className="text-xs border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold"
                >
                  <QrCode className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Scan QR Perangkat
                </Button>
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={isSaving} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                  Simpan Konfigurasi
                </Button>
              </div>
            </div>

            {/* PANDUAN INTEGRASI FONNTE */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-900">Mengapa status "Belum Konek" saat input API Key Fonnte?</h4>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Di Fonnte, memiliki <b>API Key (Token) saja belum cukup</b>. Perangkat WhatsApp pengirim sekolah Anda <b>wajib ditautkan (scan QR)</b> terlebih dahulu di Fonnte. Jika belum di-scan, Fonnte akan menolak pesan dengan status <i>"device disconnected"</i>.
                  </p>
                  <div className="pt-1 flex flex-wrap gap-2 text-[11px]">
                    <span className="font-semibold text-gray-700">Langkah menghubungkan:</span>
                    <span className="text-gray-600">1. Salin Token dari <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold underline">fonnte.com</a></span>
                    <span className="text-gray-400">&bull;</span>
                    <span className="text-gray-600">2. Tempel token & klik <b>"Uji Koneksi"</b></span>
                    <span className="text-gray-400">&bull;</span>
                    <span className="text-gray-600">3. Klik <b>"Scan QR Perangkat"</b> untuk tautkan WA Anda</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Provider WhatsApp Gateway
                </label>
                <select
                  value={config.provider}
                  onChange={(e) => handleConfigChange("provider", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="fonnte">Fonnte WhatsApp API (Rekomendasi Indonesia)</option>
                  <option value="wablas">Wablas Gateway</option>
                  <option value="ruangwa">RuangWA API Gateway</option>
                  <option value="custom">Custom Webhook / Internal Gateway</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Mendukung integrasi resmi webhook & REST API penyedia gateway lokal tanpa batas sesi.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  API Key / Token Rahasia Fonnte
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.apiKey}
                    onChange={(e) => handleConfigChange("apiKey", e.target.value)}
                    placeholder="Masukkan token dari dashboard Fonnte..."
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Button
                    type="button"
                    onClick={handleCheckDevice}
                    disabled={isCheckingDevice || !config.apiKey}
                    className="shrink-0 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isCheckingDevice ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    )}
                    Uji Koneksi
                  </Button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Kunci otorisasi akun Fonnte. Klik tombol <b>"Uji Koneksi"</b> untuk memverifikasi apakah token aktif dan WhatsApp sudah tertaut.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Nomor WhatsApp Pengirim Sekolah
                </label>
                <input
                  type="text"
                  value={config.senderNumber}
                  onChange={(e) => handleConfigChange("senderNumber", e.target.value)}
                  placeholder="Otomatis terisi saat terhubung (misal: 62812...)"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Nama Label Perangkat
                </label>
                <input
                  type="text"
                  value={config.senderDeviceName}
                  onChange={(e) => handleConfigChange("senderDeviceName", e.target.value)}
                  placeholder="Server Bot Presensi Sekolah"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* DIAGNOSIS HASIL CEK STATUS */}
            {deviceCheckInfo && (
              <div className={`p-4 rounded-xl border animate-in fade-in ${
                deviceCheckInfo.deviceStatus === "connected"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}>
                <div className="flex items-start gap-3">
                  {deviceCheckInfo.deviceStatus === "connected" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold">
                      {deviceCheckInfo.deviceStatus === "connected" 
                        ? "Hasil Pengecekan Fonnte: Terhubung Sempurna (Connect)" 
                        : "Hasil Pengecekan Fonnte: Token Diterima, Namun WhatsApp Belum Tertaut (Disconnect)"}
                    </h4>
                    <p className="text-xs leading-relaxed">{deviceCheckInfo.message}</p>
                    {deviceCheckInfo.deviceStatus === "disconnected" && (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setShowQrModal(true);
                            handleFetchQr();
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-7"
                        >
                          <QrCode className="w-3.5 h-3.5 mr-1" />
                          Scan QR Code Sekarang
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pemicu Notifikasi Otomatis */}
            <div className="pt-6 border-t border-gray-100 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Pemicu Otomatisasi Notifikasi (Event Triggers)</h3>
                <p className="text-xs text-gray-500">Pilih kondisi absensi apa saja yang akan otomatis mengirimkan pesan WhatsApp ke orang tua</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-start p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={config.notifyOnHadir}
                    onChange={(e) => handleConfigChange("notifyOnHadir", e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <div className="ml-3">
                    <span className="text-xs font-bold text-gray-900 block">Siswa Hadir Tepat Waktu</span>
                    <span className="text-[11px] text-gray-500">Kirim notifikasi konfirmasi siswa telah tiba di kelas dengan selamat.</span>
                  </div>
                </label>

                <label className="flex items-start p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={config.notifyOnTerlambat}
                    onChange={(e) => handleConfigChange("notifyOnTerlambat", e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <div className="ml-3">
                    <span className="text-xs font-bold text-gray-900 block">Siswa Hadir Terlambat</span>
                    <span className="text-[11px] text-gray-500">Kirim notifikasi jam keterlambatan agar wali murid dapat mengingatkan anak.</span>
                  </div>
                </label>

                <label className="flex items-start p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={config.notifyOnAlpa}
                    onChange={(e) => handleConfigChange("notifyOnAlpa", e.target.checked)}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                  />
                  <div className="ml-3">
                    <span className="text-xs font-bold text-rose-900 block">Siswa Alpa / Tidak Hadir (Penting)</span>
                    <span className="text-[11px] text-rose-700">Peringatan darurat ke orang tua untuk konfirmasi keberadaan ananda jika tidak masuk.</span>
                  </div>
                </label>

                <label className="flex items-start p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={config.notifyOnIzin}
                    onChange={(e) => handleConfigChange("notifyOnIzin", e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <div className="ml-3">
                    <span className="text-xs font-bold text-gray-900 block">Siswa Izin / Sakit</span>
                    <span className="text-[11px] text-gray-500">Konfirmasi bahwa permohonan izin/sakit siswa telah diterima oleh pihak sekolah.</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATE PESAN */}
      {activeTab === "template" && config && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
          {/* Editor Column */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">Editor Template Pesan WhatsApp</h2>
                <p className="text-xs text-gray-500">Kustomisasi teks notifikasi dengan tag variabel otomatis</p>
              </div>
              <Button onClick={handleSaveSettings} disabled={isSaving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                Simpan Template
              </Button>
            </div>

            {/* Template Selector Pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "hadir", label: "Template Hadir", color: "emerald" },
                { key: "terlambat", label: "Template Terlambat", color: "amber" },
                { key: "alpa", label: "Template Alpa (Peringatan)", color: "rose" },
                { key: "izin", label: "Template Izin / Sakit", color: "blue" },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSelectedTemplateKey(t.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    selectedTemplateKey === t.key
                      ? "bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-200"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Quick Variable Injector */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Sisipkan Variabel Dinamis (Klik untuk menambahkan):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "{nama_wali}",
                  "{nama_siswa}",
                  "{kelas}",
                  "{status}",
                  "{jam}",
                  "{tanggal}",
                  "{mata_pelajaran}",
                  "{nama_guru}",
                  "{sekolah}",
                  "{keterangan}"
                ].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="px-2 py-1 text-[11px] font-mono bg-gray-100 hover:bg-emerald-100 hover:text-emerald-800 text-gray-700 rounded-md border border-gray-300 transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea Editor */}
            <div>
              <textarea
                rows={10}
                value={config.templates[selectedTemplateKey]}
                onChange={(e) => handleTemplateChange(selectedTemplateKey, e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-4 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed bg-gray-50/50"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Gunakan simbol WhatsApp: <span className="font-bold">*teks tebal*</span>, <span className="italic">_teks miring_</span>, atau ~teks coret~.
              </p>
            </div>
          </div>

          {/* WhatsApp Chat Live Preview Column */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="bg-[#e5ddd5] rounded-3xl border-4 border-gray-800 overflow-hidden shadow-xl flex flex-col h-[520px]">
              {/* WhatsApp Chat Header */}
              <div className="bg-[#075e54] px-4 py-3 text-white flex items-center gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-emerald-200 text-[#075e54] font-bold flex items-center justify-center text-xs flex-shrink-0">
                  SMP
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold leading-tight truncate">Bot Presensi SMPN 1</p>
                  <p className="text-[10px] text-emerald-200 truncate">Online resmi sekolah</p>
                </div>
              </div>

              {/* Chat Message Bubble Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#e5ddd5] flex flex-col justify-end">
                <div className="text-center">
                  <span className="bg-white/70 backdrop-blur-xs text-gray-600 text-[10px] px-2.5 py-0.5 rounded-md shadow-2xs">
                    Hari ini
                  </span>
                </div>

                {/* Message Bubble */}
                <div className="max-w-[90%] bg-white rounded-2xl rounded-tl-none p-3 shadow-xs text-xs text-gray-800 whitespace-pre-line leading-relaxed self-start border border-gray-200/50">
                  {getTemplatePreview()}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-400">
                    <span>07:15</span>
                    <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Bottom WhatsApp bar */}
              <div className="bg-gray-100 px-3 py-2 border-t border-gray-200 flex items-center text-gray-400 text-xs">
                <span className="italic">Pratinjau pesan di WhatsApp Wali</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: UJI COBA KIRIM PESAN (TEST SEND) */}
      {activeTab === "test" && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-base font-bold text-gray-900">Uji Coba Pengiriman Pesan WhatsApp</h2>
            <p className="text-xs text-gray-500">
              Kirimkan pesan simulasi untuk memastikan integrasi API WhatsApp Gateway Anda terhubung dengan benar.
            </p>
          </div>

          <form onSubmit={handleSendTest} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Nomor WhatsApp Tujuan
              </label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="08123456789 atau 628123456789"
                required
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Gunakan nomor HP aktif Anda atau salah satu wali murid untuk verifikasi penerimaan pesan.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Isi Pesan Uji Coba
              </label>
              <textarea
                rows={5}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 p-3.5 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>

            <Button
              type="submit"
              disabled={isSendingTest}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm"
            >
              {isSendingTest ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirimkan Pesan WhatsApp...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Send className="w-4 h-4" />
                  <span>Kirim Pesan WhatsApp Sekarang</span>
                </div>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* TAB 4: LOG RIWAYAT PENGIRIMAN (DELIVERY LOGS) */}
      {activeTab === "logs" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Cari siswa, nama wali, atau nomor WA..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="text-xs rounded-xl border border-gray-200 py-2 px-3 bg-gray-50 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Status</option>
                <option value="Hadir">Hadir</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Alpa">Alpa</option>
                <option value="Sakit">Sakit</option>
                <option value="Izin">Izin</option>
                <option value="Terkirim">Terkirim</option>
                <option value="Gagal">Gagal</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="text-xs text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh Log
            </Button>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Waktu</th>
                    <th className="py-3.5 px-4">Siswa & Kelas</th>
                    <th className="py-3.5 px-4">Wali Murid</th>
                    <th className="py-3.5 px-4">Status Absen</th>
                    <th className="py-3.5 px-4">Ringkasan Pesan</th>
                    <th className="py-3.5 px-4 text-center">Status Kirim</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-400 text-xs">
                        Tidak ada log pengiriman yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      let statusBadge = "bg-gray-100 text-gray-700";
                      if (log.status_kehadiran === "Hadir") statusBadge = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                      else if (log.status_kehadiran === "Terlambat") statusBadge = "bg-amber-50 text-amber-700 border border-amber-200";
                      else if (log.status_kehadiran === "Alpa") statusBadge = "bg-rose-50 text-rose-700 border border-rose-200 font-bold";
                      else if (log.status_kehadiran === "Sakit" || log.status_kehadiran === "Izin") statusBadge = "bg-blue-50 text-blue-700 border border-blue-200";

                      return (
                        <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <p className="font-semibold text-gray-900">{log.jam_kirim}</p>
                            <p className="text-[10px] text-gray-400">{log.tanggal_kirim}</p>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <p className="font-bold text-gray-900">{log.siswa_nama}</p>
                            <p className="text-[10px] text-gray-500">{log.kelas_nama}</p>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <p className="font-semibold text-gray-800">{log.wali_nama}</p>
                            <p className="text-[10px] text-emerald-700 font-mono flex items-center gap-1">
                              <span>📱</span> {log.no_wa}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge}`}>
                              {log.status_kehadiran}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate text-gray-600">
                            {log.pesan_singkat}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              {log.status_kirim}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleResend(log.id)}
                                disabled={resendingId === log.id}
                                title="Kirim Ulang Pesan"
                                className="p-1 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${resendingId === log.id ? 'animate-spin' : ''}`} />
                              </button>
                              <a
                                href={`https://wa.me/${log.no_wa.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(log.pesan_singkat)}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Buka di WhatsApp Web"
                                className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QR CODE SCAN MODAL (REAL FONNTE QR & GUIDANCE) */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Tautkan Perangkat WhatsApp Fonnte</h3>
              <p className="text-xs text-gray-500 mt-1">
                Buka WhatsApp di ponsel Anda &gt; menu titik tiga / Pengaturan &gt; <b>Perangkat Tertaut</b> &gt; <b>Tautkan Perangkat</b>, lalu scan kode QR di bawah:
              </p>
            </div>

            {/* QR Box */}
            <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center min-h-[200px]">
              {isLoadingQr ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-2">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  <p className="text-xs text-gray-500">Meminta QR Code dari Fonnte...</p>
                </div>
              ) : fonnteQrUrl ? (
                <div className="space-y-2">
                  <img 
                    src={fonnteQrUrl} 
                    alt="QR Code Fonnte" 
                    className="w-48 h-48 mx-auto rounded-lg shadow-xs bg-white p-2"
                  />
                  <p className="text-[11px] text-emerald-600 font-semibold">
                    ✓ QR Code aktif dari server Fonnte
                  </p>
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  <p className="text-xs text-gray-600 max-w-xs">
                    {qrMessage || "Klik tombol di bawah untuk meminta QR Code langsung dari server Fonnte, atau buka dashboard Fonnte."}
                  </p>
                  <Button
                    size="sm"
                    onClick={handleFetchQr}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Minta QR Code Fonnte
                  </Button>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs text-left space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                Atau Tautkan Langsung di Dashboard Fonnte:
              </p>
              <p className="text-[11px] text-gray-500">
                Anda juga dapat langsung membuka dashboard Fonnte &gt; Device &gt; klik <b>Connect / QR</b> untuk scan kode QR di ponsel Anda.
              </p>
              <a
                href="https://fonnte.com"
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs font-bold text-emerald-600 hover:underline pt-0.5"
              >
                Kunjungi Dashboard Fonnte (https://fonnte.com) &rarr;
              </a>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowQrModal(false);
                  handleCheckDevice();
                }} 
                className="flex-1 text-xs cursor-pointer"
              >
                Selesai & Cek Status
              </Button>
              <Button 
                onClick={() => setShowQrModal(false)} 
                className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                Tutup Jendela
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
