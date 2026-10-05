/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - PENGUNGGAH FOTO OTOMATIS KE GOOGLE DRIVE SEKOLAH
 * =========================================================================
 * 
 * PETUNJUK PENERAPAN UNTUK SEKOLAH:
 * 1. Buat folder di Google Drive sekolah, misal: "SIMS_ARSIP_FOTO".
 * 2. Klik kanan folder -> Bagikan -> Ubah "Akses umum" ke "Siapa saja yang memiliki tautan" (Viewer).
 * 3. Salin Folder ID dari URL (kode acak setelah /folders/...).
 * 4. Buka https://script.google.com/ -> Buat Proyek Baru.
 * 5. Tempel kode di bawah ini, dan masukkan FOLDER_ID Anda di baris ke-20.
 * 6. Klik "Terapkan" (Deploy) -> "Penerapan Baru" (New deployment).
 * 7. Pilih tipe "Aplikasi Web" (Web app):
 *    - Jalankan sebagai: "Saya" (akun Google Anda)
 *    - Yang memiliki akses: "Siapa saja" (Anyone)
 * 8. Klik Terapkan dan salin URL Web App yang dihasilkan.
 * 9. Tempelkan URL tersebut ke konfigurasi .env atau menu Pengaturan SIMS.
 */

// GANTI DENGAN ID FOLDER GOOGLE DRIVE SEKOLAH ANDA:
var FOLDER_ID = "MASUKKAN_FOLDER_ID_GOOGLE_DRIVE_DI_SINI";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJson({ status: "error", message: "Data payload kosong" });
    }

    var data = JSON.parse(e.postData.contents);
    var targetFolderId = data.folderId || FOLDER_ID;
    var folder = DriveApp.getFolderById(targetFolderId);

    var contentType = data.mimeType || "image/jpeg";
    var fileName = data.fileName || "foto_" + new Date().getTime() + ".jpg";
    
    // Bersihkan header data base64 jika ada (data:image/jpeg;base64,...)
    var base64Clean = data.base64Data;
    if (base64Clean.indexOf(",") > -1) {
      base64Clean = base64Clean.split(",")[1];
    }

    var bytes = Utilities.base64Decode(base64Clean);
    var blob = Utilities.newBlob(bytes, contentType, fileName);

    // Buat file di Google Drive
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    // Gunakan URL CDN direct link berkecepatan tinggi dari Google
    var directViewUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    var previewUrl = file.getUrl();

    return responseJson({
      status: "success",
      fileId: fileId,
      url: directViewUrl,
      previewUrl: previewUrl,
      fileName: fileName
    });

  } catch (error) {
    return responseJson({
      status: "error",
      message: error.toString()
    });
  }
}

function doGet(e) {
  return responseJson({
    status: "online",
    message: "Google Apps Script Webhook SIMS Sekolah Aktif dan Siap Menerima File"
  });
}

function responseJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
