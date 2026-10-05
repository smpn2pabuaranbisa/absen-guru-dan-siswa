import React, { useEffect, useRef, useState } from "react";
import { School, ShieldCheck, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import JsBarcode from "jsbarcode";

// Component Barcode Asli Scannable (CODE-128 Sesuai NIS)
export const BarcodeNIS = ({ value }: { value: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, String(value).trim(), {
          format: "CODE128",
          width: 1.35,
          height: 26,
          displayValue: true,
          text: `* ${String(value).trim()} *`,
          fontSize: 8.5,
          font: "monospace",
          textMargin: 2,
          margin: 0,
          background: "transparent",
          lineColor: "#0f172a",
        });
      } catch (err) {
        console.error("Gagal generate barcode:", err);
      }
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center justify-center p-1 bg-white rounded-lg border border-slate-200 shadow-2xs w-full max-w-[215px] mx-auto overflow-hidden">
      <svg ref={svgRef} className="max-w-full" />
    </div>
  );
};

// Section Tanda Tangan & Stempel Cerdas dengan Auto-Deteksi Prop Terbalik
export const SignatureAndStampSection = ({ school }: { school: any }) => {
  const [ttdImage, setTtdImage] = useState<string | null>(school?.ttdKepalaSekolah || null);
  const [stampImage, setStampImage] = useState<string | null>(school?.stempelSekolah || null);

  useEffect(() => {
    const rawTtd = school?.ttdKepalaSekolah || null;
    const rawStamp = school?.stempelSekolah || null;

    if (rawTtd && rawStamp) {
      // Deteksi otomatis jika file stempel dan ttd tertukar pada saat upload:
      // TTD biasanya memanjang horizontal (ratio > 1.35).
      // Stempel dinas biasanya bulat/kotak simetris (ratio ~ 1.0).
      const imgTtd = new Image();
      const imgStamp = new Image();
      let ready = 0;

      const evalAspect = () => {
        ready++;
        if (ready === 2) {
          const ratioTtd = imgTtd.naturalWidth / (imgTtd.naturalHeight || 1);
          const ratioStamp = imgStamp.naturalWidth / (imgStamp.naturalHeight || 1);

          // Jika gambar di slot stempel ternyata bentuknya tanda tangan (panjang horizontal)
          // dan gambar di slot ttd ternyata bulat/persegi (stempel)
          if (ratioStamp > 1.35 && ratioTtd < 1.25) {
            setTtdImage(rawStamp);
            setStampImage(rawTtd);
          } else {
            setTtdImage(rawTtd);
            setStampImage(rawStamp);
          }
        }
      };

      imgTtd.onload = evalAspect;
      imgTtd.onerror = evalAspect;
      imgStamp.onload = evalAspect;
      imgStamp.onerror = evalAspect;

      imgTtd.src = rawTtd;
      imgStamp.src = rawStamp;
    } else {
      setTtdImage(rawTtd);
      setStampImage(rawStamp);
    }
  }, [school?.ttdKepalaSekolah, school?.stempelSekolah]);

  return (
    <div 
      style={{
        position: "relative",
        width: "100%",
        height: "46px",
        marginTop: "2px",
        marginBottom: "2px"
      }}
    >
      {/* 1. TANDA TANGAN: 100% PERSIS DI TENGAH (CENTER HORIZONTAL & VERTIKAL) */}
      <div 
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "115px",
          height: "44px",
          pointerEvents: "none"
        }}
      >
        {ttdImage ? (
          <img 
            src={ttdImage} 
            alt="Tanda Tangan" 
            style={{
              maxHeight: "38px",
              maxWidth: "110px",
              objectFit: "contain"
            }}
            crossOrigin="anonymous" 
          />
        ) : (
          <span className="font-[Caveat,cursive] italic font-bold text-base text-slate-800">
            Mulyadi
          </span>
        )}
      </div>

      {/* 2. STEMPEL RESMI: DI SEBELAH KIRI, MENEMPEL DAN MENIMPA SISI KIRI TANDA TANGAN */}
      <div 
        style={{
          position: "absolute",
          left: "calc(50% - 28px)",
          top: "50%",
          transform: "translate(-50%, -50%) rotate(-8deg)",
          zIndex: 20,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {stampImage ? (
          <img 
            src={stampImage} 
            alt="Stempel" 
            style={{
              width: "44px",
              height: "44px",
              objectFit: "contain",
              opacity: 0.88,
              mixBlendMode: "multiply"
            }}
            crossOrigin="anonymous" 
          />
        ) : (
          <div 
            className="rounded-full border-[1.5px] border-blue-600/70 bg-blue-50/40 flex items-center justify-center shadow-xs"
            style={{ width: "40px", height: "40px" }}
          >
            <span className="text-[5.5px] font-black text-blue-700 uppercase text-center leading-[6px]">
              STEMPEL<br/>RESMI
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const KartuPelajarFront = ({ student, school, qrPayload }: any) => {
  const nisValue = String(qrPayload || student?.nis || "2023001").trim();

  return (
    <div 
      className="select-none rounded-2xl bg-white text-slate-900 relative overflow-hidden flex flex-col justify-between border border-slate-200 shadow-md transition-all"
      style={{ 
        width: "256px", 
        height: "406px", 
        boxSizing: "border-box",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* BACKGROUND GRAPHIC ACCENTS */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-blue-600/15 via-indigo-600/10 to-transparent rounded-full blur-xs pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-gradient-to-tr from-amber-500/15 via-blue-500/5 to-transparent rounded-full blur-xs pointer-events-none" />

      {/* TOP DECORATIVE STRIP */}
      <div className="w-full h-1.5 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-500 shrink-0" />

      {/* 1. HEADER KOP SEKOLAH */}
      <div className="px-3 pt-1.5 pb-1 flex items-center space-x-2.5 border-b border-slate-100 relative z-10 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-white p-0.5 flex items-center justify-center shadow-xs border border-slate-200/80 shrink-0 overflow-hidden">
          {school?.logoSekolah ? (
            <img 
              src={school.logoSekolah} 
              alt="Logo" 
              className="w-full h-full object-contain" 
              crossOrigin="anonymous" 
            />
          ) : (
            <School className="w-5 h-5 text-blue-700" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[7px] font-bold text-blue-700 uppercase tracking-wider leading-none">
            KARTU TANDA PELAJAR
          </p>
          <h3 className="text-[9.5px] font-black tracking-tight text-slate-900 uppercase truncate leading-tight mt-0.5">
            {school?.name || "SMP NEGERI 1 NUSANTARA"}
          </h3>
          <p className="text-[6.5px] text-slate-500 font-medium truncate leading-none mt-0.5">
            NPSN: {school?.npsn || "20104567"} • Akreditasi {school?.akreditasi || "A"}
          </p>
        </div>
      </div>

      {/* 2. BODY KARTU: FOTO SISWA (+20%), NAMA & DETAIL */}
      <div className="px-3 pt-1 pb-0.5 flex-1 flex flex-col items-center justify-center relative z-10 space-y-1">
        {/* Pas Foto Siswa */}
        <div className="relative -mt-0.5">
          <div className="w-24 h-[116px] rounded-2xl overflow-hidden shadow-md bg-slate-100 ring-2 ring-blue-600/25 border-2 border-white">
            <img 
              src={student?.foto || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80"} 
              alt={student?.nama} 
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          </div>
          {/* Active Badge */}
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm ring-2 ring-white" title="Aktif">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Nama Siswa & Badge Kelas */}
        <div className="text-center w-full px-1">
          <h4 className="font-extrabold text-[12px] text-slate-900 tracking-tight leading-tight line-clamp-1">
            {student?.nama || "Ahmad Riyadi"}
          </h4>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <span className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-bold rounded-md uppercase tracking-wider shadow-2xs">
              {student?.kelas || "Kelas 7A"}
            </span>
            {student?.rfid_uid && (
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[7px] font-mono font-bold rounded-md border border-purple-200">
                RFID
              </span>
            )}
          </div>
        </div>

        {/* Grid Detail Identitas Ringkas */}
        <div className="w-full grid grid-cols-2 gap-1 py-1 px-2 rounded-lg bg-slate-50/90 border border-slate-200/70 text-[7.5px]">
          <div className="text-left leading-tight">
            <span className="text-slate-400 block text-[6px] uppercase font-bold">NIS / NISN</span>
            <span className="font-mono font-bold text-slate-800 text-[8px]">
              {student?.nis || "2023001"}
            </span>
            <span className="text-slate-500 block text-[6.5px] font-mono">
              {student?.nisn || "0087654321"}
            </span>
          </div>
          <div className="text-right leading-tight">
            <span className="text-slate-400 block text-[6.5px] uppercase font-bold">Lahir</span>
            <span className="font-medium text-slate-800 text-[7px] truncate block">
              {student?.tempat_lahir || "Jakarta"}
            </span>
            <span className="text-slate-500 block text-[6.5px]">
              {student?.tanggal_lahir || "14/05/2011"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. FOOTER DENGAN QR CODE (MURNI NIS) */}
      <div className="px-3 pb-2.5 pt-1.5 relative z-10 border-t border-slate-100 bg-gradient-to-b from-white to-slate-50 shrink-0">
        <div className="flex items-center justify-between gap-2.5">
          {/* QR Code Container (66px) */}
          <div className="p-1 rounded-xl bg-white shadow-xs border border-slate-200 shrink-0 flex items-center justify-center">
            <QRCodeSVG 
              value={nisValue} 
              size={66} 
              level="M" 
              includeMargin={false}
            />
          </div>

          {/* Info Scan & NIS */}
          <div className="flex-1 text-right flex flex-col justify-center">
            <div className="inline-flex items-center justify-end space-x-1 text-blue-700">
              <QrCode className="w-3.5 h-3.5" />
              <span className="text-[8px] font-bold uppercase tracking-wider">Scan Gerbang</span>
            </div>
            <div className="mt-0.5">
              <span className="text-[6.5px] text-slate-400 uppercase font-semibold block">KODE NIS:</span>
              <span className="text-[12px] font-mono font-black text-slate-900 tracking-wider">
                {nisValue}
              </span>
            </div>
            <p className="text-[6.5px] text-slate-400 mt-0.5 font-medium">
              Berlaku: {student?.berlaku_hingga || "30 Juni 2027"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const KartuPelajarBack = ({ student, school }: any) => {
  const nisVal = String(student?.nis || "2023001").trim();

  return (
    <div 
      className="select-none rounded-2xl bg-slate-50 text-slate-900 relative overflow-hidden flex flex-col justify-between border border-slate-200 shadow-md"
      style={{ 
        width: "256px", 
        height: "406px", 
        boxSizing: "border-box",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* TOP DECORATIVE STRIP */}
      <div className="w-full h-1.5 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-500 shrink-0" />

      {/* HEADER KETENTUAN */}
      <div className="px-4 pt-2 pb-1 border-b border-slate-200/80 text-center shrink-0">
        <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest">
          TATA TERTIB & KETENTUAN KARTU
        </h4>
        <p className="text-[6.5px] text-slate-500 font-mono mt-0.5">
          ID: {student?.id || "S001"} {student?.rfid_uid ? `• RFID: ${student.rfid_uid}` : ""}
        </p>
      </div>

      {/* TERMS LIST */}
      <div className="px-3.5 py-1 space-y-1 text-[7.5px] text-slate-600 leading-relaxed flex-1">
        <p className="flex items-start">
          <span className="font-bold text-blue-600 mr-1.5 shrink-0">1.</span>
          <span>Kartu ini adalah identitas resmi siswa <strong>{school?.name || "SMP Negeri 1 Nusantara"}</strong>.</span>
        </p>
        <p className="flex items-start">
          <span className="font-bold text-blue-600 mr-1.5 shrink-0">2.</span>
          <span>Wajib dibawa setiap hari untuk presensi gate gerbang sekolah & perpustakaan.</span>
        </p>
        <p className="flex items-start">
          <span className="font-bold text-blue-600 mr-1.5 shrink-0">3.</span>
          <span>Dilarang meminjamkan kartu ini atau menggunakan kartu milik siswa lain.</span>
        </p>
        <p className="flex items-start">
          <span className="font-bold text-blue-600 mr-1.5 shrink-0">4.</span>
          <span>Apabila kartu hilang atau rusak, segera melapor ke bagian Tata Usaha sekolah.</span>
        </p>

        {/* 2. BARCODE ASLI BISA DI-SCAN (CODE-128 SESUAI NIS SISWA) */}
        <div className="pt-0.5 flex flex-col items-center justify-center">
          <BarcodeNIS value={nisVal} />
        </div>
      </div>

      {/* 1. SIGNATURE (PERSIS DI TENGAH) & STEMPEL (MENEMPEL/MENIMPA SISI KIRI TTD) */}
      <div className="px-3 pb-2 pt-1 border-t border-slate-200 bg-white flex flex-col items-center text-center shrink-0">
        <p className="text-[6.5px] text-slate-500 w-full truncate mb-0.5">
          {school?.alamat || "Jl. Pendidikan No. 123, Kota Pelajar"}
        </p>

        <div className="w-full flex flex-col items-center relative">
          <p className="text-[6.5px] text-slate-600 font-medium leading-none mb-0.5">
            Kepala Sekolah,
          </p>
          
          {/* Section Tanda Tangan & Stempel Cerdas */}
          <SignatureAndStampSection school={school} />

          <p className="text-[7.5px] font-bold text-slate-900 underline leading-tight">
            {school?.kepalaSekolah || "Drs. H. Mulyadi, M.Pd"}
          </p>
          <p className="text-[6px] text-slate-500 font-mono mt-0.5">
            NIP. {school?.nipKepalaSekolah || "196805121994031002"}
          </p>
        </div>
      </div>
    </div>
  );
};
