/**
 * Service Offline-First untuk Kiosk Gerbang
 * Menyimpan cache data master (Siswa, Guru, Jam Masuk)
 * Menyimpan antrean presensi offline (IndexedDB / LocalStorage)
 * Sinkronisasi otomatis ke server saat internet online
 */

import { GateAttendanceRecord, GateScanResult } from "@/services/api";

export interface OfflinePersonData {
  id: string;
  type: "siswa" | "guru";
  nama: string;
  identifier: string; // NIS atau NIP
  nisn?: string;
  rfid_uid?: string;
  subInfo: string; // Kelas atau Mata Pelajaran
  foto?: string;
  no_wa_wali?: string;
  nama_wali?: string;
  hubungan_wali?: string;
}

export interface OfflinePendingAttendance {
  localId: string;
  code: string;
  mode: "masuk" | "pulang";
  metodeScan: "QR_CAMERA" | "BARCODE_SCANNER" | "MANUAL_INPUT";
  timestamp: string; // ISO
  timeStr: string;
  dateStr: string;
  sendWhatsApp: boolean;
  personName: string;
  identifier: string;
  subInfo: string;
  status: "Hadir" | "Terlambat" | "Pulang" | "Pulang Cepat";
  menitKeterlambatan: number;
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  retryCount: number;
  lastError?: string;
}

const STORAGE_KEYS = {
  MASTER_CACHE: "kiosk_offline_master_cache_v1",
  MASTER_TIMESTAMP: "kiosk_offline_master_timestamp_v1",
  QUEUE: "kiosk_offline_attendance_queue_v1",
  IS_FORCE_OFFLINE: "kiosk_simulated_offline_mode",
};

export class KioskOfflineStorage {
  // Simpan data master siswa & guru ke cache lokal
  static saveMasterCache(persons: OfflinePersonData[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.MASTER_CACHE, JSON.stringify(persons));
      localStorage.setItem(STORAGE_KEYS.MASTER_TIMESTAMP, new Date().toISOString());
      console.log(`[Offline Kiosk] Saved ${persons.length} records to local master cache.`);
    } catch (e) {
      console.error("[Offline Kiosk] Gagal menyimpan cache master:", e);
    }
  }

  // Dapatkan data master dari cache lokal
  static getMasterCache(): OfflinePersonData[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MASTER_CACHE);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("[Offline Kiosk] Gagal membaca cache master:", e);
      return [];
    }
  }

  // Dapatkan waktu terakhir update cache
  static getMasterCacheTimestamp(): string | null {
    return localStorage.getItem(STORAGE_KEYS.MASTER_TIMESTAMP);
  }

  // Dapatkan antrean presensi offline
  static getPendingQueue(): OfflinePendingAttendance[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("[Offline Kiosk] Gagal membaca antrean offline:", e);
      return [];
    }
  }

  // Tambah rekaman presensi ke antrean offline
  static enqueueAttendance(item: OfflinePendingAttendance) {
    try {
      const queue = this.getPendingQueue();
      queue.unshift(item); // terbaru di atas
      localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
      return queue;
    } catch (e) {
      console.error("[Offline Kiosk] Gagal menambahkan ke antrean offline:", e);
      return [];
    }
  }

  // Hapus item yang sudah berhasil disinkronkan
  static removeQueueItem(localId: string) {
    try {
      const queue = this.getPendingQueue().filter(q => q.localId !== localId);
      localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
      return queue;
    } catch (e) {
      console.error("[Offline Kiosk] Gagal menghapus antrean:", e);
      return [];
    }
  }

  // Bersihkan seluruh antrean
  static clearQueue() {
    localStorage.removeItem(STORAGE_KEYS.QUEUE);
  }

  // Fitur simulasi pemutusan koneksi untuk uji coba petugas
  static isSimulatedOffline(): boolean {
    return localStorage.getItem(STORAGE_KEYS.IS_FORCE_OFFLINE) === "true";
  }

  static setSimulatedOffline(val: boolean) {
    localStorage.setItem(STORAGE_KEYS.IS_FORCE_OFFLINE, val ? "true" : "false");
  }

  /**
   * Evaluasi pemindaian secara 100% LOKAL tanpa koneksi internet!
   */
  static evaluateScanLocally(
    code: string,
    mode: "masuk" | "pulang",
    metodeScan: "QR_CAMERA" | "BARCODE_SCANNER" | "MANUAL_INPUT",
    sendWhatsApp: boolean = true
  ): { success: boolean; message: string; data?: GateScanResult; queueItem?: OfflinePendingAttendance } {
    const raw = code.trim();
    if (!raw) {
      return { success: false, message: "Kode QR atau Barcode tidak boleh kosong." };
    }

    // Parsing payload jika dalam format JSON
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
      // raw barcode biasa
    }

    const query = (parsedNis || parsedNisn || parsedId || raw).toLowerCase();
    const masterList = this.getMasterCache();

    const matched = masterList.find(p => 
      (parsedId && p.id === parsedId) ||
      (p.rfid_uid && p.rfid_uid.toLowerCase() === query) ||
      p.identifier.toLowerCase() === query ||
      (p.nisn && p.nisn.toLowerCase() === query) ||
      p.id.toLowerCase() === query ||
      p.nama.toLowerCase() === query ||
      (parsedNama && p.nama.toLowerCase().includes(parsedNama.toLowerCase()))
    );

    if (!matched) {
      return {
        success: false,
        message: `[MODE OFFLINE] Identitas "${raw}" tidak ditemukan di database lokal kiosk. Pastikan kartu terdaftar.`
      };
    }

    const now = new Date();
    const currentDateStr = now.toISOString().split("T")[0];
    const currentTimeStr = now.toTimeString().split(" ")[0];
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    // Cek anti-double tap di antrean lokal (cooldown 3 menit)
    const queue = this.getPendingQueue();
    const recentScan = queue.find(
      q => q.identifier === matched.identifier &&
           q.dateStr === currentDateStr &&
           q.mode === mode &&
           (Date.now() - new Date(q.timestamp).getTime()) < 3 * 60 * 1000
    );

    if (recentScan) {
      const mockRecord: GateAttendanceRecord = {
        id: recentScan.localId,
        type: matched.type,
        personId: matched.id,
        nama: matched.nama,
        identifier: matched.identifier,
        nisn: matched.nisn,
        subInfo: matched.subInfo,
        foto: matched.foto,
        mode: mode,
        timestamp: recentScan.timestamp,
        timeStr: recentScan.timeStr,
        dateStr: recentScan.dateStr,
        status: recentScan.status,
        menitKeterlambatan: recentScan.menitKeterlambatan,
        metodeScan: recentScan.metodeScan,
        waNotificationStatus: "PENDING_SYNC",
        waMessagePreview: "(Offline Queue) Pesan WA tersimpan dan akan dikirim saat internet aktif."
      };

      return {
        success: false,
        message: `[OFFLINE] Kartu ${matched.nama} sudah dipindai pada ${recentScan.timeStr}. Harap tunggu sebelum scan ulang.`,
        data: {
          record: mockRecord,
          isPunctual: recentScan.status === "Hadir",
          isDoubleScan: true,
          voiceMessage: `Perhatian, kartu ${matched.nama} sudah dipindai sebelumnya.`,
          chimeType: "error",
          rawInput: raw
        }
      };
    }

    // Hitung status ketepatan waktu
    const cutoffMasuk = 7 * 60 + 15; // 07:15 WIB
    let status: "Hadir" | "Terlambat" | "Pulang" | "Pulang Cepat" = "Hadir";
    let menitKeterlambatan = 0;
    let isPunctual = true;

    if (mode === "masuk") {
      if (currentTotalMinutes > cutoffMasuk) {
        menitKeterlambatan = currentTotalMinutes - cutoffMasuk;
        status = "Terlambat";
        isPunctual = false;
      } else {
        status = "Hadir";
        isPunctual = true;
      }
    } else {
      const cutoffPulang = matched.type === "siswa" ? 14 * 60 : 15 * 60;
      if (currentTotalMinutes < cutoffPulang) {
        status = "Pulang Cepat";
        isPunctual = false;
      } else {
        status = "Pulang";
        isPunctual = true;
      }
    }

    const localId = `OFFLINE-${Date.now().toString().slice(-6)}`;

    // Buat item antrean offline
    const pendingItem: OfflinePendingAttendance = {
      localId,
      code: raw,
      mode,
      metodeScan,
      timestamp: now.toISOString(),
      timeStr: currentTimeStr,
      dateStr: currentDateStr,
      sendWhatsApp,
      personName: matched.nama,
      identifier: matched.identifier,
      subInfo: matched.subInfo,
      status,
      menitKeterlambatan,
      syncStatus: "pending",
      retryCount: 0
    };

    // Simpan ke antrean lokal
    this.enqueueAttendance(pendingItem);

    // Format objek Record untuk UI
    const localRecord: GateAttendanceRecord = {
      id: localId,
      type: matched.type,
      personId: matched.id,
      nama: matched.nama,
      identifier: matched.identifier,
      nisn: matched.nisn,
      subInfo: matched.subInfo,
      foto: matched.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(matched.nama)}&background=10b981&color=fff`,
      mode,
      timestamp: now.toISOString(),
      timeStr: currentTimeStr,
      dateStr: currentDateStr,
      status,
      menitKeterlambatan,
      metodeScan,
      parentInfo: matched.no_wa_wali ? {
        namaWali: matched.nama_wali || "Orang Tua / Wali",
        noWa: matched.no_wa_wali,
        hubungan: matched.hubungan_wali || "Wali"
      } : undefined,
      waNotificationStatus: "PENDING_SYNC",
      waMessagePreview: `[Tersimpan Offline] Notifikasi WhatsApp akan dikirim ke ${matched.no_wa_wali || "Wali Murid"} saat online.`
    };

    let voiceMessage = "";
    if (mode === "masuk") {
      voiceMessage = isPunctual
        ? `Selamat pagi, ${matched.nama}. Presensi offline berhasil, tepat waktu.`
        : `Perhatian, ${matched.nama}. Anda terlambat ${menitKeterlambatan} menit. Tersimpan offline.`;
    } else {
      voiceMessage = `Selamat sore, ${matched.nama}. Presensi pulang offline berhasil.`;
    }

    return {
      success: true,
      message: `[OFFLINE STORED] Presensi ${matched.nama} disimpan di memori lokal kiosk.`,
      data: {
        record: localRecord,
        isPunctual,
        isDoubleScan: false,
        voiceMessage,
        chimeType: isPunctual ? "success" : "warning",
        rawInput: raw
      },
      queueItem: pendingItem
    };
  }
}
