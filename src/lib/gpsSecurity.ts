import { getDistance } from "./utils";

export interface GpsTelemetry {
  lat: number;
  lng: number;
  accuracy: number; // in meters
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
  isMocked?: boolean;
}

export interface GpsSecurityAudit {
  isValid: boolean;
  status: "verified" | "warning" | "rejected";
  accuracyStatus: "excellent" | "acceptable" | "poor";
  message: string;
  isMockDetected: boolean;
  accuracyMeters: number;
  distanceMeters: number;
  isWithinRadius: boolean;
  isStale: boolean;
}

export const MAX_ALLOWED_GPS_ACCURACY_METERS = 50; // Lebih dari 50m dianggap sinyal seluler/tidak akurat
export const MAX_GPS_CACHE_AGE_MS = 25000; // 25 detik

export function evaluateGpsSecurity(
  telemetry: GpsTelemetry,
  schoolCoords: { lat: number; lng: number },
  maxRadiusMeters: number
): GpsSecurityAudit {
  const distance = Math.round(getDistance(telemetry.lat, telemetry.lng, schoolCoords.lat, schoolCoords.lng));
  const isWithinRadius = distance <= maxRadiusMeters;
  const isMockDetected = Boolean(telemetry.isMocked);
  const now = Date.now();
  const isStale = (now - telemetry.timestamp) > MAX_GPS_CACHE_AGE_MS;

  let accuracyStatus: "excellent" | "acceptable" | "poor" = "acceptable";
  if (telemetry.accuracy <= 20) {
    accuracyStatus = "excellent";
  } else if (telemetry.accuracy > MAX_ALLOWED_GPS_ACCURACY_METERS) {
    accuracyStatus = "poor";
  }

  // 1. Deteksi Mock Location
  if (isMockDetected) {
    return {
      isValid: false,
      status: "rejected",
      accuracyStatus,
      message: "Terdeteksi aplikasi Mock Location (Fake GPS) aktif di perangkat. Harap nonaktifkan untuk melanjutkan absensi.",
      isMockDetected: true,
      accuracyMeters: Math.round(telemetry.accuracy),
      distanceMeters: distance,
      isWithinRadius,
      isStale
    };
  }

  // 2. Deteksi Akurasi Terlalu Rendah (> 50 meter)
  if (telemetry.accuracy > MAX_ALLOWED_GPS_ACCURACY_METERS) {
    return {
      isValid: false,
      status: "warning",
      accuracyStatus: "poor",
      message: `Akurasi sinyal GPS rendah (±${Math.round(telemetry.accuracy)}m, batas aman maksimal ${MAX_ALLOWED_GPS_ACCURACY_METERS}m). Sinyal diduga berasal dari estimasi jaringan seluler BTS. Berpindahlah ke luar ruangan untuk kalibrasi satelit.`,
      isMockDetected: false,
      accuracyMeters: Math.round(telemetry.accuracy),
      distanceMeters: distance,
      isWithinRadius,
      isStale
    };
  }

  // 3. Deteksi Stale Location Cache
  if (isStale) {
    return {
      isValid: false,
      status: "warning",
      accuracyStatus,
      message: "Data sinyal GPS kedaluwarsa (stale location cache). Sistem memerlukan pemindaian sinyal satelit langsung.",
      isMockDetected: false,
      accuracyMeters: Math.round(telemetry.accuracy),
      distanceMeters: distance,
      isWithinRadius,
      isStale: true
    };
  }

  // 4. Deteksi Geofence
  if (!isWithinRadius) {
    return {
      isValid: false,
      status: "rejected",
      accuracyStatus,
      message: `Anda berada di luar area sekolah (${distance}m dari pusat sekolah, batas toleransi ${maxRadiusMeters}m). Pastikan Anda telah berada di dalam lingkungan sekolah.`,
      isMockDetected: false,
      accuracyMeters: Math.round(telemetry.accuracy),
      distanceMeters: distance,
      isWithinRadius: false,
      isStale: false
    };
  }

  return {
    isValid: true,
    status: "verified",
    accuracyStatus,
    message: `Koordinat GPS terverifikasi asli dari satelit (Jarak: ${distance}m, Akurasi: ±${Math.round(telemetry.accuracy)}m).`,
    isMockDetected: false,
    accuracyMeters: Math.round(telemetry.accuracy),
    distanceMeters: distance,
    isWithinRadius: true,
    isStale: false
  };
}
