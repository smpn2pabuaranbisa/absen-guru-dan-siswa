function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const schema = {
    "Users": ["user_id", "username", "password_hash", "role", "reference_id", "status", "created_at", "updated_at"],
    "Guru": ["guru_id", "user_id", "nama", "nip", "nuptk", "email", "no_hp", "jabatan", "mata_pelajaran", "foto"],
    "Siswa": ["siswa_id", "nis", "nisn", "nama", "jenis_kelamin", "kelas_id", "foto", "status", "created_at", "updated_at"],
    "Kelas": ["kelas_id", "nama_kelas", "tingkat", "wali_kelas_id", "tahun_ajaran", "status"],
    "Jadwal": ["jadwal_id", "hari", "jam_mulai", "jam_selesai", "kelas_id", "guru_id", "mata_pelajaran", "ruangan", "status"],
    "Absensi_Guru": ["attendance_id", "guru_id", "tanggal", "jam_datang", "jam_pulang", "latitude_datang", "longitude_datang", "latitude_pulang", "longitude_pulang", "jarak_datang", "jarak_pulang", "foto_datang", "foto_pulang", "status", "keterangan", "created_at", "updated_at"],
    "Absensi_Siswa": ["attendance_id", "tanggal", "jadwal_id", "kelas_id", "siswa_id", "guru_id", "jam", "status", "keterangan", "created_at", "updated_at"],
    "Izin_Sakit": ["izin_id", "guru_id", "jenis", "tanggal_mulai", "tanggal_selesai", "alasan", "keterangan", "lampiran", "status", "approved_by", "approved_at", "catatan_admin", "created_at", "updated_at"],
    "Settings": ["school_name", "school_address", "school_latitude", "school_longitude", "attendance_radius", "attendance_start_time", "late_threshold", "attendance_end_time", "timezone"],
    "Audit_Log": ["log_id", "user_id", "role", "action", "target_type", "target_id", "timestamp", "device", "description"]
  };

  for (const sheetName in schema) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Set headers
    const headers = schema[sheetName];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f4f6");
    
    // Freeze header row
    sheet.setFrozenRows(1);
  }
  
  // Create default admin user if not exists
  const usersSheet = ss.getSheetByName("Users");
  if (usersSheet.getLastRow() === 1) {
    const now = new Date().toISOString();
    usersSheet.appendRow(["U001", "admin", "admin123", "admin", "A001", "active", now, now]);
  }

  // Create default settings if not exists
  const settingsSheet = ss.getSheetByName("Settings");
  if (settingsSheet.getLastRow() === 1) {
    settingsSheet.appendRow(["SMA Negeri 1", "Jl. Pendidikan No. 1", "-6.200000", "106.816666", "100", "06:00", "07:00", "15:00", "Asia/Jakarta"]);
  }

  // Delete default "Sheet1" if it exists and is empty
  const sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1 && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet1);
  }
}

// Basic entry points for the API (Phase 4 scaffold)
function doPost(e) {
  return handleRequest(e, 'POST');
}

function doGet(e) {
  return handleRequest(e, 'GET');
}

function handleRequest(e, method) {
  // CORS Headers allowing requests from the web app
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  
  let responseData = {
    success: false,
    message: "Unknown request",
    data: null
  };

  try {
    const action = e.parameter.action;
    let payload = {};
    
    // Parse POST payload if exists
    if (method === 'POST' && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        // Ignore parse error, maybe it's urlencoded
      }
    }
    
    // Router
    switch(action) {
      case "ping":
        responseData = { success: true, message: "Pong!" };
        break;
      case "login":
        responseData = processLogin(payload.username, payload.password);
        break;
      case "getDashboard":
        responseData = processGetDashboard(payload.token);
        break;
      default:
        responseData = { success: false, message: "Action not found", error_code: "UNKNOWN_ACTION" };
    }
    
  } catch (error) {
    responseData = {
      success: false,
      message: error.message,
      error_code: "SERVER_ERROR"
    };
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- CORE API IMPLEMENTATIONS --- //

function processLogin(username, password) {
  if (!username || !password) {
    return { success: false, message: "Username dan password wajib diisi", error_code: "VALIDATION_ERROR" };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usersSheet = ss.getSheetByName("Users");
  const usersData = getSheetDataAsObjects(usersSheet);
  
  const user = usersData.find(u => u.username === username);
  
  if (!user || user.password_hash !== password) {
    return { success: false, message: "Username atau password salah.", error_code: "AUTH_INVALID" };
  }
  
  if (user.status !== "active") {
    return { success: false, message: "Akun Anda tidak aktif. Silakan hubungi admin.", error_code: "USER_INACTIVE" };
  }

  // Generate simple token (Stateless, Base64 of ID + Timestamp)
  // In production, use JWT or store session in DB. For MVP, we use a simple structure.
  const tokenPayload = {
    user_id: user.user_id,
    role: user.role,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours expiry
  };
  const token = Utilities.base64Encode(JSON.stringify(tokenPayload));
  
  // Get detailed profile
  let name = user.username;
  let foto = "";
  
  if (user.role === "guru") {
    const guruSheet = ss.getSheetByName("Guru");
    const guruData = getSheetDataAsObjects(guruSheet);
    const guruProfile = guruData.find(g => g.user_id === user.user_id);
    if (guruProfile) {
      name = guruProfile.nama;
      foto = guruProfile.foto;
    }
  }

  return {
    success: true,
    message: "Login berhasil",
    data: {
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        name: name,
        reference_id: user.reference_id,
        status: user.status,
        foto: foto
      },
      token: token
    }
  };
}

function processGetDashboard(token) {
  const auth = validateToken(token, "guru"); // Only guru can access this specific dashboard
  if (!auth.success) return auth;
  
  const user_id = auth.user_id;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Find Guru ID
  const guruSheet = ss.getSheetByName("Guru");
  const guruData = getSheetDataAsObjects(guruSheet);
  const guru = guruData.find(g => g.user_id === user_id);
  
  if (!guru) {
    return { success: false, message: "Profil guru tidak ditemukan", error_code: "VALIDATION_ERROR" };
  }

  // Get Today's Attendance
  const absensiSheet = ss.getSheetByName("Absensi_Guru");
  const absensiData = getSheetDataAsObjects(absensiSheet);
  
  // Get YYYY-MM-DD
  const today = new Date();
  const todayStr = Utilities.formatDate(today, "Asia/Jakarta", "yyyy-MM-dd");
  
  const todayAttendance = absensiData.find(a => a.guru_id === guru.guru_id && a.tanggal === todayStr);

  return {
    success: true,
    message: "Berhasil mengambil data dashboard",
    data: {
      attendance: {
        datang: todayAttendance ? todayAttendance.jam_datang : null,
        pulang: todayAttendance ? todayAttendance.jam_pulang : null,
        status: todayAttendance ? todayAttendance.status : "Belum Absen",
      }
    }
  };
}

// --- HELPER FUNCTIONS --- //

function validateToken(token, requiredRole) {
  if (!token) {
    return { success: false, message: "Token tidak valid", error_code: "AUTH_INVALID" };
  }
  
  try {
    const decodedStr = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    const payload = JSON.parse(decodedStr);
    
    if (payload.exp < Date.now()) {
      return { success: false, message: "Sesi telah berakhir", error_code: "AUTH_EXPIRED" };
    }
    
    if (requiredRole && payload.role !== requiredRole) {
      return { success: false, message: "Anda tidak memiliki akses", error_code: "AUTH_INVALID" };
    }
    
    return { success: true, user_id: payload.user_id, role: payload.role };
  } catch (e) {
    return { success: false, message: "Token tidak valid", error_code: "AUTH_INVALID" };
  }
}

function getSheetDataAsObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const objects = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    objects.push(obj);
  }
  
  return objects;
}
