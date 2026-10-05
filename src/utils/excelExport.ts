import * as XLSX from "xlsx";
import { 
  MonthlyClassAttendanceReport, 
  StudentMonthlyAttendanceRow,
  SemesterClassAttendanceReport,
  StudentSemesterAttendanceRow,
  ClassGradeLegerReport,
  StudentGradeRow
} from "@/services/api";

/**
 * PHASE 45: Ekspor Laporan Rekap Bulanan Siswa (Matriks Ledger) ke format Microsoft Excel (.XLSX)
 * Sesuai standar tata persuratan & administrasi Dinas Pendidikan
 */
export function exportClassMonthlyReportToExcel(
  report: MonthlyClassAttendanceReport,
  schoolSettings?: any
) {
  const wb = XLSX.utils.book_new();

  const schoolName = schoolSettings?.schoolName || "SMP NEGERI 1 NUSANTARA";
  const npsn = schoolSettings?.npsn || "20104567";
  const address = schoolSettings?.address || "Jl. Pendidikan No. 123, Kota Pelajar";
  const kepalaSekolah = schoolSettings?.kepalaSekolah || "Drs. H. Mulyadi, M.Pd";
  const nipKepalaSekolah = schoolSettings?.nipKepalaSekolah || "196805121994031002";

  // Build 2D array of cells (AOA)
  const aoa: any[][] = [];

  // 1. KOP SURAT
  aoa.push(["DINAS PENDIDIKAN KABUPATEN / KOTA"]);
  aoa.push([schoolName.toUpperCase()]);
  aoa.push([`NPSN: ${npsn} | ${address}`]);
  aoa.push([]); // blank line

  // 2. JUDUL DOKUMEN
  aoa.push(["LEGER REKAPITULASI PRESENSI SISWA (BULANAN)"]);
  aoa.push([]);

  // 3. METADATA KELAS
  aoa.push(["Kelas", `: ${report.className}`, "", "Semester", `: ${report.semester}`]);
  aoa.push(["Wali Kelas", `: ${report.waliKelas}`, "", "Tahun Pelajaran", `: ${report.tahunAjaran}`]);
  aoa.push(["NIP Wali Kelas", `: ${report.nipWaliKelas}`, "", "Bulan", `: ${report.bulanNama} ${report.tahun}`]);
  aoa.push(["Hari Efektif Belajar", `: ${report.hariEfektif} Hari`, "", "Total Siswa", `: ${report.summary.totalSiswa} Siswa (L: ${report.summary.totalLaki}, P: ${report.summary.totalPerempuan})`]);
  aoa.push([]);

  // 4. HEADER TABEL
  const headerRow: string[] = ["No", "NIS", "NISN", "Nama Siswa", "L/P"];
  for (let d = 1; d <= report.daysInMonth; d++) {
    headerRow.push(String(d));
  }
  headerRow.push("H", "T", "S", "I", "A", "% Hadir");
  aoa.push(headerRow);

  // 5. DATA SISWA
  report.students.forEach((student: StudentMonthlyAttendanceRow, index: number) => {
    const row: any[] = [
      index + 1,
      student.nis,
      student.nisn,
      student.name,
      student.jk
    ];

    for (let d = 1; d <= report.daysInMonth; d++) {
      const st = student.dailyStatus[d] || "-";
      row.push(st === "L" ? "-" : st);
    }

    row.push(
      student.totalHadir,
      student.totalTerlambat,
      student.totalSakit,
      student.totalIzin,
      student.totalAlpa,
      `${student.persentase}%`
    );

    aoa.push(row);
  });

  // 6. TOTAL HARIAN KELAS
  const totalHarianRow: any[] = ["", "", "", "TOTAL HADIR HARIAN", ""];
  for (let d = 1; d <= report.daysInMonth; d++) {
    let dayHadir = 0;
    report.students.forEach(s => {
      const st = s.dailyStatus[d];
      if (st === "H" || st === "T") dayHadir++;
    });
    totalHarianRow.push(dayHadir > 0 ? dayHadir : "-");
  }
  totalHarianRow.push(
    report.summary.totalHadir,
    report.summary.totalTerlambat,
    report.summary.totalSakit,
    report.summary.totalIzin,
    report.summary.totalAlpa,
    `${report.summary.rataRataKehadiran}%`
  );
  aoa.push(totalHarianRow);

  // 7. KETERANGAN KODE ABSENSI
  aoa.push([]);
  aoa.push(["Keterangan Kode:"]);
  aoa.push(["H = Hadir Tepat Waktu", "T = Hadir Terlambat", "S = Sakit", "I = Izin Resmi", "A = Alpa (Tanpa Keterangan)", "- = Libur / Akhir Pekan"]);
  aoa.push([]);

  // 8. TANDA TANGAN PENGESAHAN (Wali Kelas & Kepala Sekolah)
  aoa.push(["", "", "", "", "", "", "", "", "", "", "", `Kota Pelajar, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`]);
  aoa.push(["Mengetahui,", "", "", "", "", "", "", "", "", "", "", "Wali Kelas,"]);
  aoa.push(["Kepala Sekolah,"]);
  aoa.push([]);
  aoa.push([]);
  aoa.push([]);
  aoa.push([
    kepalaSekolah,
    "", "", "", "", "", "", "", "", "", "",
    report.waliKelas
  ]);
  aoa.push([
    `NIP. ${nipKepalaSekolah}`,
    "", "", "", "", "", "", "", "", "", "",
    `NIP. ${report.nipWaliKelas}`
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set column widths
  const colWidths: any[] = [
    { wch: 5 },  // No
    { wch: 10 }, // NIS
    { wch: 14 }, // NISN
    { wch: 26 }, // Nama
    { wch: 5 },  // JK
  ];

  // Daily columns
  for (let d = 1; d <= report.daysInMonth; d++) {
    colWidths.push({ wch: 4 });
  }

  // Summary columns
  colWidths.push({ wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 10 });
  ws["!cols"] = colWidths;

  const fileName = `Rekap_Presensi_${report.className.replace(/\s+/g, '_')}_${report.bulanNama}_${report.tahun}.xlsx`;
  XLSX.utils.book_append_sheet(wb, ws, `Rekap ${report.className}`);
  XLSX.writeFile(wb, fileName);
}

/**
 * PHASE 45: Ekspor Laporan Rekapitulasi Umum / Sekolah ke format Excel (.XLSX)
 */
export function exportGeneralReportToExcel(
  data: any,
  startDate: string,
  endDate: string,
  filterRole: string,
  schoolSettings?: any
) {
  const wb = XLSX.utils.book_new();

  const schoolName = schoolSettings?.schoolName || "SMP NEGERI 1 NUSANTARA";
  const address = schoolSettings?.address || "Jl. Pendidikan No. 123, Kota Pelajar";

  const aoa: any[][] = [];

  // Kop
  aoa.push(["DINAS PENDIDIKAN KABUPATEN / KOTA"]);
  aoa.push([schoolName.toUpperCase()]);
  aoa.push([address]);
  aoa.push([]);

  // Title
  aoa.push(["LAPORAN REKAPITULASI KEHADIRAN SEKOLAH"]);
  aoa.push([`Periode: ${startDate} s/d ${endDate}`]);
  aoa.push([`Kategori: ${filterRole === 'all' ? 'Guru & Siswa' : filterRole.toUpperCase()}`]);
  aoa.push([`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`]);
  aoa.push([]);

  // Ringkasan Statistik
  if (data?.summary) {
    aoa.push(["RINGKASAN STATISTIK"]);
    aoa.push(["Total Hadir", data.summary.hadir || 0]);
    aoa.push(["Total Terlambat", data.summary.terlambat || 0]);
    aoa.push(["Total Izin", data.summary.izin || 0]);
    aoa.push(["Total Sakit", data.summary.sakit || 0]);
    aoa.push(["Total Alpa", data.summary.alpa || 0]);
    aoa.push([]);
  }

  // Tabel Detail
  aoa.push(["No", "Nama Lengkap", "Peran", "Total Hadir", "Total Terlambat", "Total Izin/Sakit", "Total Alpa", "Persentase Kehadiran"]);

  const tableData = data?.tableData || [];
  tableData.forEach((item: any, idx: number) => {
    aoa.push([
      idx + 1,
      item.nama,
      item.role,
      item.total_hadir,
      item.total_terlambat,
      item.total_izin,
      item.total_alpa,
      item.persentase
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Rekap Umum");
  XLSX.writeFile(wb, `Laporan_Presensi_Sekolah_${startDate}_sd_${endDate}.xlsx`);
}

/**
 * PHASE 45: Ekspor Laporan Rekap Kehadiran Guru ke format Excel (.XLSX)
 */
export function exportTeacherReportToExcel(
  report: {
    bulanNama: string;
    tahun: number;
    totalGuru: number;
    hariKerja: number;
    rataRataKehadiran: number;
    teachers: any[];
  },
  schoolSettings?: any
) {
  const wb = XLSX.utils.book_new();

  const schoolName = schoolSettings?.schoolName || "SMP NEGERI 1 NUSANTARA";
  const kepalaSekolah = schoolSettings?.kepalaSekolah || "Drs. H. Mulyadi, M.Pd";
  const nipKepalaSekolah = schoolSettings?.nipKepalaSekolah || "196805121994031002";

  const aoa: any[][] = [];

  aoa.push(["DINAS PENDIDIKAN KABUPATEN / KOTA"]);
  aoa.push([schoolName.toUpperCase()]);
  aoa.push([]);
  aoa.push(["REKAPITULASI PRESENSI & KEDISIPLINAN GURU / TENAGA KEPENDIDIKAN"]);
  aoa.push([`Bulan: ${report.bulanNama} ${report.tahun} | Jumlah Hari Kerja: ${report.hariKerja} Hari`]);
  aoa.push([]);

  aoa.push(["No", "NIP", "Nama Guru / Karyawan", "Mata Pelajaran / Jabatan", "Hari Kerja", "Hadir", "Terlambat", "Izin", "Sakit", "Cuti", "Alpa", "% Kehadiran", "Keterangan"]);

  report.teachers.forEach((t, idx) => {
    aoa.push([
      idx + 1,
      t.nip,
      t.nama,
      t.mapel,
      t.hariKerja,
      t.hadir,
      t.terlambat,
      t.izin,
      t.sakit,
      t.cuti,
      t.alpa,
      `${t.persentase}%`,
      t.keterangan
    ]);
  });

  aoa.push([]);
  aoa.push(["", "", "", "", "", "", "", "", "", `Kota Pelajar, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`]);
  aoa.push(["", "", "", "", "", "", "", "", "", "Kepala Sekolah,"]);
  aoa.push([]);
  aoa.push([]);
  aoa.push(["", "", "", "", "", "", "", "", "", kepalaSekolah]);
  aoa.push(["", "", "", "", "", "", "", "", "", `NIP. ${nipKepalaSekolah}`]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 26 },
    { wch: 24 },
    { wch: 10 },
    { wch: 8 },
    { wch: 10 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 14 },
    { wch: 18 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Rekap Guru");
  XLSX.writeFile(wb, `Rekap_Presensi_Guru_${report.bulanNama}_${report.tahun}.xlsx`);
}

/**
 * Ekspor Buku Leger Presensi Siswa Semester (Rekap Rapor Induk) ke Microsoft Excel (.XLSX)
 * Dilengkapi rincian bulanan, akumulasi S/I/A 1 semester, persentase kehadiran, dan predikat
 */
export function exportSemesterClassReportToExcel(
  report: SemesterClassAttendanceReport,
  schoolSettings?: any
) {
  const wb = XLSX.utils.book_new();

  const schoolName = schoolSettings?.schoolName || "SMP NEGERI 1 NUSANTARA";
  const npsn = schoolSettings?.npsn || "20104567";
  const address = schoolSettings?.address || "Jl. Pendidikan No. 123, Kota Pelajar";
  const kepalaSekolah = schoolSettings?.kepalaSekolah || "Drs. H. Mulyadi, M.Pd";
  const nipKepalaSekolah = schoolSettings?.nipKepalaSekolah || "196805121994031002";

  const aoa: any[][] = [];

  // 1. KOP SURAT
  aoa.push(["DINAS PENDIDIKAN KABUPATEN / KOTA"]);
  aoa.push([schoolName.toUpperCase()]);
  aoa.push([`NPSN: ${npsn} | ${address}`]);
  aoa.push([]);

  // 2. JUDUL DOKUMEN
  aoa.push(["LEGER REKAPITULASI PRESENSI SISWA (SEMESTER / REKAP RAPOR INDUK)"]);
  aoa.push([]);

  // 3. METADATA KELAS
  aoa.push(["Kelas", `: ${report.className}`, "", "Semester", `: ${report.semester}`]);
  aoa.push(["Wali Kelas", `: ${report.waliKelas}`, "", "Tahun Pelajaran", `: ${report.tahunAjaran}`]);
  aoa.push(["NIP Wali Kelas", `: ${report.nipWaliKelas}`, "", "Total Hari Efektif", `: ${report.totalHariEfektif} Hari`]);
  aoa.push(["Total Siswa", `: ${report.summary.totalSiswa} Siswa (L: ${report.summary.totalLaki}, P: ${report.summary.totalPerempuan})`, "", "Rata-rata Kehadiran", `: ${report.summary.rataRataKehadiran}%`]);
  aoa.push([]);

  // 4. HEADER TABEL
  const headerRow: string[] = [
    "No", "NIS", "NISN", "Nama Siswa", "L/P"
  ];
  // Tambahkan bulan
  report.monthsList.forEach(m => {
    headerRow.push(`${m} (H)`, `${m} (S)`, `${m} (I)`, `${m} (A)`);
  });
  headerRow.push("Total Hadir (H)", "Total Sakit (S)", "Total Izin (I)", "Total Alpa (A)", "Total Efektif", "% Hadir", "Predikat Kehadiran");
  aoa.push(headerRow);

  // 5. DATA SISWA
  report.students.forEach((student: StudentSemesterAttendanceRow, idx: number) => {
    const row: any[] = [
      idx + 1,
      student.nis,
      student.nisn,
      student.name,
      student.jk
    ];

    student.monthlyBreakdown.forEach(m => {
      row.push(m.hadir, m.sakit, m.izin, m.alpa);
    });

    row.push(
      student.totalHadir,
      student.totalSakit,
      student.totalIzin,
      student.totalAlpa,
      student.totalHariEfektif,
      `${student.persentase}%`,
      student.predikat
    );

    aoa.push(row);
  });

  aoa.push([]);

  // 6. RINGKASAN REKAPITULASI
  aoa.push(["REKAPITULASI TOTAL KELAS:"]);
  aoa.push(["Total Sakit Kumulatif", `: ${report.summary.totalSakit} Hari`]);
  aoa.push(["Total Izin Kumulatif", `: ${report.summary.totalIzin} Hari`]);
  aoa.push(["Total Alpa Kumulatif", `: ${report.summary.totalAlpa} Hari`]);
  aoa.push(["Rata-rata Persentase Kehadiran", `: ${report.summary.rataRataKehadiran}%`]);
  aoa.push([]);

  // 7. TANDA TANGAN FORMAL
  const signDate = `Kota Pelajar, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  aoa.push(["Mengetahui,", "", "", "", "", "", "", "", signDate]);
  aoa.push(["Kepala Sekolah,", "", "", "", "", "", "", "", "Wali Kelas,"]);
  aoa.push([]);
  aoa.push([]);
  aoa.push([]);
  aoa.push([kepalaSekolah, "", "", "", "", "", "", "", report.waliKelas]);
  aoa.push([`NIP. ${nipKepalaSekolah}`, "", "", "", "", "", "", "", `NIP. ${report.nipWaliKelas}`]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, `Leger ${report.className}`);

  const safeClassName = report.className.replace(/\s+/g, '_');
  const safeSemester = report.semester.replace(/\s+/g, '_');
  XLSX.writeFile(wb, `Leger_Presensi_${safeClassName}_${safeSemester}_${report.tahun}.xlsx`);
}

/**
 * POINT 2: Ekspor Buku Leger Nilai Siswa (Buku Induk Nilai & Rapor) ke format Microsoft Excel (.XLSX)
 * Standar Kurikulum Merdeka & K13 Lengkap dengan Nilai Akhir per Mapel, Peringkat Kelas, dan Rekap Absensi
 */
export function exportClassGradeLegerToExcel(
  report: ClassGradeLegerReport,
  schoolSettings?: any
) {
  const wb = XLSX.utils.book_new();

  const schoolName = schoolSettings?.schoolName || "SMP NEGERI 1 NUSANTARA";
  const npsn = schoolSettings?.npsn || "20104567";
  const address = schoolSettings?.address || "Jl. Pendidikan No. 123, Kota Pelajar";
  const kepalaSekolah = schoolSettings?.kepalaSekolah || "Drs. H. Mulyadi, M.Pd";
  const nipKepalaSekolah = schoolSettings?.nipKepalaSekolah || "196805121994031002";

  const aoa: any[][] = [];

  // 1. KOP SURAT
  aoa.push(["PEMERINTAH KABUPATEN / KOTA"]);
  aoa.push(["DINAS PENDIDIKAN DAN KEBUDAYAAN"]);
  aoa.push([schoolName.toUpperCase()]);
  aoa.push([`NPSN: ${npsn} | ${address}`]);
  aoa.push([]);

  // 2. JUDUL DOKUMEN
  aoa.push(["BUKU LEGER NILAI HASIL BELAJAR SISWA (BUKU INDUK RAPOR)"]);
  aoa.push([]);

  // 3. METADATA KELAS
  aoa.push(["Kelas", `: ${report.className}`, "", "Semester", `: ${report.semester}`]);
  aoa.push(["Wali Kelas", `: ${report.waliKelas}`, "", "Tahun Pelajaran", `: ${report.tahunAjaran}`]);
  aoa.push(["NIP Wali Kelas", `: ${report.nipWaliKelas}`, "", "Kurikulum", `: ${report.kurikulum}`]);
  aoa.push(["Kriteria Ketuntasan (KKTP)", `: ${report.kktpStandar}`, "", "Jumlah Siswa", `: ${report.summary.totalSiswa} Siswa (L: ${report.summary.totalLaki}, P: ${report.summary.totalPerempuan})`]);
  aoa.push([]);

  // 4. HEADER TABEL MASTER NILAI
  const headerRow: string[] = ["No", "NIS", "NISN", "Nama Siswa", "L/P"];
  report.subjects.forEach(sub => {
    headerRow.push(sub.code);
  });
  headerRow.push(
    "Jumlah Nilai", 
    "Rata-rata", 
    "Ranking", 
    "Sakit (S)", 
    "Izin (I)", 
    "Alpa (A)", 
    "Status"
  );
  aoa.push(headerRow);

  // Sub-header nama mata pelajaran
  const subHeaderRow: string[] = ["", "", "", "NAMA MATA PELAJARAN / GURU PENGAMPU", ""];
  report.subjects.forEach(sub => {
    subHeaderRow.push(sub.name);
  });
  subHeaderRow.push("", "", "", "", "", "", "");
  aoa.push(subHeaderRow);

  // KKTP Row
  const kktpRow: string[] = ["", "", "", "KRITERIA KETUNTASAN MINIMAL (KKTP)", ""];
  report.subjects.forEach(sub => {
    kktpRow.push(String(sub.kktp));
  });
  kktpRow.push("", "", "", "", "", "", "");
  aoa.push(kktpRow);

  // 5. DATA SISWA & NILAI PER MAPEL
  report.students.forEach((student: StudentGradeRow, idx: number) => {
    const row: any[] = [
      idx + 1,
      student.nis,
      student.nisn,
      student.name,
      student.jk
    ];

    report.subjects.forEach(sub => {
      const g = student.subjectGrades[sub.code];
      row.push(g ? g.nilaiAkhir : 0);
    });

    row.push(
      student.totalNilai,
      student.rataRataNilai,
      student.ranking,
      student.presensi.sakit,
      student.presensi.izin,
      student.presensi.alpa,
      student.statusKelulusan
    );

    aoa.push(row);
  });

  aoa.push([]);

  // 6. BARIS REKAPITULASI KELAS
  const avgRow: any[] = ["", "", "", "RATA-RATA KELAS PER MAPEL", ""];
  report.subjects.forEach(sub => {
    avgRow.push(report.summary.subjectAverages[sub.code] || 0);
  });
  avgRow.push(
    report.summary.rataRataKelas * report.subjects.length,
    report.summary.rataRataKelas,
    "-", "-", "-", "-", `${report.summary.persentaseKetuntasan}% Tuntas`
  );
  aoa.push(avgRow);

  aoa.push([]);
  aoa.push(["STATISTIK KELAS:"]);
  aoa.push(["Rata-rata Keseluruhan Kelas", `: ${report.summary.rataRataKelas}`]);
  aoa.push(["Nilai Total Tertinggi (Juara 1)", `: ${report.summary.nilaiTertinggi}`]);
  aoa.push(["Nilai Total Terendah", `: ${report.summary.nilaiTerendah}`]);
  aoa.push(["Persentase Ketuntasan Siswa", `: ${report.summary.persentaseKetuntasan}%`]);
  aoa.push([]);

  // 7. TANDA TANGAN FORMAL
  const signDate = `Kota Pelajar, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  aoa.push(["Mengetahui,", "", "", "", "", "", "", "", signDate]);
  aoa.push(["Kepala Sekolah,", "", "", "", "", "", "", "", "Wali Kelas,"]);
  aoa.push([]);
  aoa.push([]);
  aoa.push([]);
  aoa.push([kepalaSekolah, "", "", "", "", "", "", "", report.waliKelas]);
  aoa.push([`NIP. ${nipKepalaSekolah}`, "", "", "", "", "", "", "", `NIP. ${report.nipWaliKelas}`]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, `Leger Nilai ${report.className}`);

  const safeClassName = report.className.replace(/\s+/g, '_');
  const safeSemester = report.semester.replace(/\s+/g, '_');
  XLSX.writeFile(wb, `Leger_Nilai_${safeClassName}_${safeSemester}_${report.tahun}.xlsx`);
}


