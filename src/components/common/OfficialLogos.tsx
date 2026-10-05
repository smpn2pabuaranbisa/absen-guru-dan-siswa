import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Lambang Resmi Tut Wuri Handayani - Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi RI
 * Dibuat secara presisi berbasis vektor SVG agar tajam pada saat dicetak atau diunduh sebagai PDF.
 */
export const LogoTutWuriHandayani: React.FC<LogoProps> = ({ className = "w-16 h-16", size }) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo Tut Wuri Handayani Kemendikbudristek"
    >
      <defs>
        {/* Gradients for gold/fire effects */}
        <linearGradient id="twhGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
        <linearGradient id="twhFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="40%" stopColor="#EA580C" />
          <stop offset="80%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#FEF08A" />
        </linearGradient>
        <radialGradient id="twhBlueGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="70%" stopColor="#0369A1" />
          <stop offset="100%" stopColor="#0C4A6E" />
        </radialGradient>
        <filter id="twhShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* 1. SEGI LIMA (PENTAGON) DASAR BIRU LAUT */}
      <polygon
        points="100,10 188,74 154,178 46,178 12,74"
        fill="url(#twhBlueGrad)"
        stroke="#EAB308"
        strokeWidth="6"
        strokeLinejoin="round"
        filter="url(#twhShadow)"
      />

      {/* Garis batas dalam emas */}
      <polygon
        points="100,18 180,76 150,170 50,170 20,76"
        fill="none"
        stroke="#FEF08A"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.8"
      />

      {/* 2. BURUNG GARUDA / SAYAP KEMBAR (PUTIH & EMAS) */}
      <g id="sayap" fill="#FFFFFF" stroke="#0C4A6E" strokeWidth="0.8">
        {/* Sayap Kiri */}
        <path d="M 98,110 C 85,95 55,95 36,112 C 48,118 64,116 75,124 C 60,126 44,132 38,142 C 54,138 72,138 82,146 C 72,152 56,158 52,166 C 68,162 86,158 98,154 Z" />
        {/* Sayap Kanan */}
        <path d="M 102,110 C 115,95 145,95 164,112 C 152,118 136,116 125,124 C 140,126 156,132 162,142 C 146,138 128,138 118,146 C 128,152 144,158 148,166 C 132,162 114,158 102,154 Z" />
        
        {/* Ekor 5 helai di bawah */}
        <path d="M 92,154 L 90,172 L 97,172 L 98,154 Z" fill="#F8FAFC" />
        <path d="M 97,154 L 98,174 L 102,174 L 103,154 Z" fill="#F1F5F9" />
        <path d="M 102,154 L 103,172 L 110,172 L 108,154 Z" fill="#F8FAFC" />
      </g>

      {/* 3. BUKU TERBUKA (KITAB PENGETAHUAN) */}
      <g id="buku" filter="url(#twhShadow)">
        {/* Lembar Halaman Putih */}
        <path
          d="M 100,126 C 90,121 72,122 56,128 C 58,139 74,135 100,140 C 126,135 142,139 144,128 C 128,122 110,121 100,126 Z"
          fill="#FFFFFF"
          stroke="#0F172A"
          strokeWidth="1.2"
        />
        {/* Garis lipatan buku */}
        <line x1="100" y1="126" x2="100" y2="140" stroke="#0284C7" strokeWidth="1.5" />
        {/* Detail tulisan kecil lembaran buku */}
        <line x1="68" y1="129" x2="90" y2="128" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
        <line x1="66" y1="133" x2="90" y2="132" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
        <line x1="110" y1="128" x2="132" y2="129" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
        <line x1="110" y1="132" x2="134" y2="133" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
      </g>

      {/* 4. BELENCONG (LAMPU / OBOR PENERANG DENGAN API MENYALA) */}
      <g id="belencong">
        {/* Kaki / Wadah Belencong (Emas) */}
        <path
          d="M 94,126 C 94,116 97,112 100,112 C 103,112 106,116 106,126 Z"
          fill="url(#twhGoldGrad)"
          stroke="#78350F"
          strokeWidth="1"
        />
        {/* Piringan Minyak */}
        <ellipse cx="100" cy="112" rx="10" ry="3.5" fill="#FBBF24" stroke="#78350F" strokeWidth="1" />

        {/* Api Belencong (Lidah Api Menyala Merah - Jingga - Kuning Emas) */}
        {/* Api Luar Merah-Orange */}
        <path
          d="M 100,42 C 108,60 120,72 120,88 C 120,102 110,111 100,111 C 90,111 80,102 80,88 C 80,72 92,60 100,42 Z"
          fill="url(#twhFlameGrad)"
          stroke="#B45309"
          strokeWidth="1"
        />
        {/* Lidah Api Tengah Kuning Terang */}
        <path
          d="M 100,56 C 105,70 113,78 113,90 C 113,99 107,106 100,106 C 93,106 87,99 87,90 C 87,78 95,70 100,56 Z"
          fill="#FEF08A"
        />
        {/* Inti Api Putih */}
        <path
          d="M 100,74 C 103,82 106,88 106,94 C 106,98 103,101 100,101 C 97,101 94,98 94,94 C 94,88 97,82 100,74 Z"
          fill="#FFFFFF"
        />
      </g>

      {/* 5. PITA DAN TULISAN "TUT WURI HANDAYANI" */}
      <g id="pita">
        {/* Pita Bawah Putih Melengkung */}
        <path
          d="M 44,166 Q 100,188 156,166 Q 100,178 44,166 Z"
          fill="#FEF08A"
          stroke="#78350F"
          strokeWidth="0.8"
        />
      </g>

      {/* Teks Melingkar Atas: TUT WURI HANDAYANI */}
      <path id="twhTextPath" d="M 30,76 Q 100,22 170,76" fill="none" />
      <text fill="#FEF08A" fontSize="10.5" fontWeight="900" letterSpacing="2.2" textAnchor="middle">
        <textPath href="#twhTextPath" startOffset="50%">
          TUT WURI HANDAYANI
        </textPath>
      </text>
    </svg>
  );
};

/**
 * Lambang Resmi Kementerian Agama RI (Ikhlas Beramal)
 * Digunakan jika instansi merupakan Madrasah (MI, MTs, MA, MAK)
 */
export const LogoKemenag: React.FC<LogoProps> = ({ className = "w-16 h-16", size }) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo Kementerian Agama Republik Indonesia"
    >
      <defs>
        <radialGradient id="kemenagGreen" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#16A34A" />
          <stop offset="80%" stopColor="#15803D" />
          <stop offset="100%" stopColor="#14532D" />
        </radialGradient>
      </defs>

      {/* Segi Lima Hijau */}
      <polygon
        points="100,12 186,74 154,178 46,178 14,74"
        fill="url(#kemenagGreen)"
        stroke="#EAB308"
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* Lingkaran Kuning Dalam */}
      <circle cx="100" cy="100" r="60" fill="#14532D" stroke="#FEF08A" strokeWidth="2.5" />

      {/* Bintang Emas */}
      <polygon
        points="100,52 104,64 116,64 106,72 110,84 100,76 90,84 94,72 84,64 96,64"
        fill="#FDE047"
        stroke="#CA8A04"
        strokeWidth="0.8"
      />

      {/* Timbangan Keadilan */}
      <line x1="100" y1="84" x2="100" y2="124" stroke="#FDE047" strokeWidth="3" />
      <line x1="78" y1="94" x2="122" y2="94" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="72,110 84,110 78,96" fill="#FDE047" />
      <polygon points="116,110 128,110 122,96" fill="#FDE047" />

      {/* Kitab Suci Al-Qur'an / Buku */}
      <path
        d="M 82,126 Q 100,122 118,126 L 118,138 Q 100,134 82,138 Z"
        fill="#FFFFFF"
        stroke="#1E293B"
        strokeWidth="1.2"
      />

      {/* Pita Bawah: IKHLAS BERAMAL */}
      <path d="M 52,156 Q 100,172 148,156 L 144,166 Q 100,182 56,166 Z" fill="#FDE047" stroke="#854D0E" strokeWidth="0.8" />
      <text x="100" y="165" fill="#14532D" fontSize="8" fontWeight="bold" textAnchor="middle">
        IKHLAS BERAMAL
      </text>
    </svg>
  );
};

/**
 * Lambang Sekolah Elegan (Fallback Default jika belum ada logo kustom yang diunggah)
 * Menampilkan lambang lencana sekolah berwibawa dengan inisial nama sekolah.
 */
interface SchoolEmblemProps {
  className?: string;
  size?: number;
  schoolName?: string;
}

export const LogoSekolahDefault: React.FC<SchoolEmblemProps> = ({ 
  className = "w-16 h-16", 
  size, 
  schoolName = "SMPN 1" 
}) => {
  const style = size ? { width: size, height: size } : undefined;

  // Generate short initials (e.g. "SMPN 1" or "SMP" or "SMA")
  const getInitials = (name: string) => {
    if (!name) return "SCH";
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 4).toUpperCase();
    if (words.length >= 3) {
      // e.g. "SMP Negeri 1" -> "SMPN 1"
      return `${words[0].substring(0, 3)} ${words[words.length - 1]}`.toUpperCase();
    }
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  };

  const initials = getInitials(schoolName);

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Logo Resmi ${schoolName}`}
    >
      <defs>
        <linearGradient id="schShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="60%" stopColor="#1E40AF" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="schGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="60%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#A16207" />
        </linearGradient>
      </defs>

      {/* 1. Lencana Perisai Luar */}
      <path
        d="M 100,12 C 150,12 180,30 180,90 C 180,140 140,174 100,188 C 60,174 20,140 20,90 C 20,30 50,12 100,12 Z"
        fill="url(#schShieldGrad)"
        stroke="url(#schGoldGrad)"
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* Garis Border Dalam Emas */}
      <path
        d="M 100,22 C 142,22 168,36 168,88 C 168,132 134,162 100,176 C 66,162 32,132 32,88 C 32,36 58,22 100,22 Z"
        fill="none"
        stroke="#FEF08A"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        opacity="0.8"
      />

      {/* 2. Daun Laurel Emas (Prestasi & Keunggulan) */}
      <g stroke="#FDE047" strokeWidth="2" fill="#FEF08A" opacity="0.9">
        <path d="M 45,95 Q 40,125 70,145 Q 55,130 50,105 Z" />
        <path d="M 155,95 Q 160,125 130,145 Q 145,130 150,105 Z" />
      </g>

      {/* 3. Topi Toga Akademik (Graduation Cap) */}
      <g id="toga">
        <polygon points="100,42 142,56 100,70 58,56" fill="url(#schGoldGrad)" stroke="#78350F" strokeWidth="1" />
        <path d="M 76,64 L 76,82 Q 100,94 124,82 L 124,64" fill="#EAB308" stroke="#78350F" strokeWidth="0.8" />
        {/* Tali Rumbai Toga */}
        <line x1="140" y1="57" x2="148" y2="78" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" />
        <circle cx="148" cy="80" r="2.5" fill="#FEF08A" />
      </g>

      {/* 4. Buku Terbuka */}
      <path
        d="M 100,92 C 92,88 78,90 66,96 L 66,112 C 78,106 92,104 100,108 C 108,104 122,106 134,112 L 134,96 C 122,90 108,88 100,92 Z"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="1.2"
      />
      <line x1="100" y1="92" x2="100" y2="108" stroke="#1E40AF" strokeWidth="1.5" />

      {/* 5. Inisial Sekolah */}
      <rect x="52" y="122" width="96" height="24" rx="12" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />
      <text
        x="100"
        y="138"
        fill="#0F172A"
        fontSize="11"
        fontWeight="900"
        textAnchor="middle"
        letterSpacing="1"
      >
        {initials}
      </text>

      {/* Bintang Emas Bawah */}
      <polygon points="100,154 102,160 108,160 103,164 105,170 100,166 95,170 97,164 92,160 98,160" fill="#FDE047" />
    </svg>
  );
};

/**
 * Komponen Render Logo Kiri KOP Surat
 * Sesuai permintaan pengguna: Lambang resmi kementerian otomatis dihapus dan hanya mengandalkan INPUT MANUAL.
 * Jika belum ada file yang diunggah secara manual oleh pengguna (logoDinas), sisi kiri KOP akan kosong (null).
 */
interface KopLogoKiriProps {
  settings?: {
    logoDinas?: string | null;
  };
  className?: string;
  size?: number;
}

export const KopLogoKiri: React.FC<KopLogoKiriProps> = ({ 
  settings, 
  className = "w-16 h-16",
  size
}) => {
  // Hanya tampil jika ada file logo yang diunggah / diinput manual
  if (settings?.logoDinas) {
    return (
      <div
        className={`${className} flex items-center justify-center shrink-0 p-0.5`}
        style={size ? { width: size, height: size } : undefined}
      >
        <img
          src={settings.logoDinas}
          alt="Logo Kiri KOP (Input Manual)"
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  // Jika belum diinput manual, tidak menampilkan logo apapun (kosong)
  return null;
};

/**
 * Komponen Render Logo Kanan KOP Surat
 * Prioritas:
 * 1. Logo Asli Sekolah (jika sudah diunggah oleh admin di menu Pengaturan)
 * 2. Lambang Sekolah Elegan (jika belum diunggah, tidak lagi kosong/putus-putus)
 */
interface KopLogoKananProps {
  settings?: {
    logoSekolah?: string | null;
    schoolName?: string | null;
  };
  className?: string;
  size?: number;
}

export const KopLogoKanan: React.FC<KopLogoKananProps> = ({
  settings,
  className = "w-16 h-16",
  size
}) => {
  if (settings?.logoSekolah) {
    return (
      <div 
        className={`${className} flex items-center justify-center shrink-0 p-0.5`}
        style={size ? { width: size, height: size } : undefined}
      >
        <img
          src={settings.logoSekolah}
          alt={settings?.schoolName ? `Logo ${settings.schoolName}` : "Logo Sekolah"}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  // Jika belum ada logo sekolah yang diunggah, sisi kanan KOP kosong/polos
  return null;
};
