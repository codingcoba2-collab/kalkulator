/**
 * Indonesian Spoken Number Parser & Formatter for x2 Audio Engine
 * Murni Berfokus pada Bahasa Indonesia & Kebiasaan Sehari-hari Orang Indonesia
 */

// Kamus Fonetik Murni Bahasa Indonesia & Slang Kebiasaan Lokal
export const PHONETIC_MAP: Record<string, number> = {
  // 0
  nol: 0,
  kosong: 0,
  '0': 0,

  // 1
  satu: 1,
  satuh: 1,
  siji: 1,
  se: 1,
  '1': 1,

  // 2 - Tidak ada 'tu'/'to' agar tidak pernah bentrok dengan 'tujuh'
  dua: 2,
  duah: 2,
  duaa: 2,
  duo: 2,
  loro: 2,
  '2': 2,

  // 3
  tiga: 3,
  tigah: 3,
  tigo: 3,
  telu: 3,
  '3': 3,

  // 4
  empat: 4,
  ampat: 4,
  mpat: 4,
  pat: 4,
  papat: 4,
  '4': 4,

  // 5
  lima: 5,
  limah: 5,
  limo: 5,
  '5': 5,

  // 6
  enam: 6,
  anam: 6,
  nam: 6,
  nem: 6,
  '6': 6,

  // 7 - Pelafalan khas Indonesia
  tujuh: 7,
  tuju: 7,
  tujuuh: 7,
  tujuk: 7,
  tuduh: 7,
  pitu: 7,
  '7': 7,

  // 8 - Kebiasaan orang Indonesia sering menyingkat delapan jadi 'lapan' / 'dlapan'
  delapan: 8,
  dlapan: 8,
  lapan: 8,
  wolu: 8,
  '8': 8,

  // 9 - Kebiasaan orang Indonesia: 'sembilan', 'smbilan', 'bilan', 'songo'
  sembilan: 9,
  smbilan: 9,
  semilan: 9,
  bilan: 9,
  songo: 9,
  '9': 9,

  // 10
  sepuluh: 10,
  spuluh: 10,
  sepulu: 10,
  pulu: 10,
  sedasa: 10,
  '10': 10,

  // 11
  sebelas: 11,
  sbelas: 11,
  seblas: 11,
  '11': 11,

  // 12 - 20
  '12': 12,
  '13': 13,
  '14': 14,
  '15': 15,
  '16': 16,
  '17': 17,
  '18': 18,
  '19': 19,
  '20': 20,

  // Kebiasaan istilah pasar / percakapan populer Indonesia
  gocap: 50,
  cepek: 100,
  pego: 150,
  nopek: 200,
  seceng: 1000,
  noceng: 2000,

  // Satuan & Pecahan
  seratus: 100,
  sratus: 100,
  '100': 100,
  seribu: 1000,
  sribu: 1000,
  rebu: 1000,
  '1000': 1000,
  sejuta: 1000000,
  setengah: 0.5,
  stengah: 0.5,
  separuh: 0.5,
  seperdua: 0.5,
  seperempat: 0.25,
  prapat: 0.25,
};

// Pemetaan digit tunggal murni bahasa Indonesia
export const SINGLE_DIGIT_MAP: Record<string, number> = {
  nol: 0, kosong: 0, '0': 0,
  satu: 1, satuh: 1, siji: 1, '1': 1,
  dua: 2, duah: 2, duaa: 2, duo: 2, loro: 2, '2': 2,
  tiga: 3, tigah: 3, tigo: 3, telu: 3, '3': 3,
  empat: 4, ampat: 4, mpat: 4, pat: 4, papat: 4, '4': 4,
  lima: 5, limah: 5, limo: 5, '5': 5,
  enam: 6, anam: 6, nam: 6, nem: 6, '6': 6,
  tujuh: 7, tuju: 7, tujuuh: 7, tujuk: 7, tuduh: 7, pitu: 7, '7': 7,
  delapan: 8, dlapan: 8, lapan: 8, wolu: 8, '8': 8,
  sembilan: 9, smbilan: 9, semilan: 9, bilan: 9, songo: 9, '9': 9,
};

/**
 * Ekstraksi angka dari ucapan bahasa Indonesia sehari-hari
 */
export function parseSpokenNumber(text: string): number | null {
  if (!text || typeof text !== 'string') return null;

  // Bersihkan teks: jadikan huruf kecil & bersihkan tanda baca
  let clean = text.toLowerCase().trim();
  clean = clean
    .replace(/[?!;:_\-~"'/()#*]/g, ' ')
    .replace(/(?<=\D)[.,]|[.,](?=\D)|[.,]$|^[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return null;

  // Cek apakah angka numerik murni (misal: "58", "59", "2", "7", "2.5")
  if (/^[-+]?\d+(?:[.,]\d+)?$/.test(clean)) {
    const num = parseFloat(clean.replace(',', '.'));
    if (!isNaN(num)) return num;
  }

  // Hapus kata-kata pengantar/basa-basi kebiasaan orang Indonesia
  clean = clean
    .replace(/(?:(?:di)?kali\s*(?:dua|2|duo))\s*$/i, '')
    .replace(/^(?:dua|2|duo)\s*(?:kali|dikali)\s*/i, '')
    .replace(/\b(berapa|hasil dari|hitunglah|hitung|tolong|angka|nomor|nilai|sebutkan|coba|dong|ya|nih|deh|itu|adalah|jawaban|mas|mbak|oi|woi|hei|halo)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean && (text.includes('dua') || text.includes('2') || text.includes('duo'))) {
    return 2;
  }

  // Cek kecocokan langsung frasa di kamus fonetik (misal: "gocap", "cepek", "setengah")
  if (PHONETIC_MAP[clean] !== undefined) {
    return PHONETIC_MAP[clean];
  }

  const rawWords = clean.split(/\s+/).filter(Boolean);

  // KEBIAASAAN UTAMA INDONESIA: Gabungan digit berurutan
  // Contoh:
  // "lima delapan" -> 58
  // "lima lapan" -> 58
  // "lima sembilan" -> 59
  // "lima tujuh" -> 57
  // "dua lima" -> 25
  // "tujuh delapan" -> 78
  if (rawWords.length >= 2 && rawWords.every((w) => SINGLE_DIGIT_MAP[w] !== undefined)) {
    const combinedDigits = rawWords.map((w) => SINGLE_DIGIT_MAP[w]).join('');
    const asInt = parseInt(combinedDigits, 10);
    if (!isNaN(asInt)) {
      return asInt;
    }
  }

  // Penanganan desimal lisan bahasa Indonesia e.g. "dua koma lima", "tujuh koma delapan"
  if (clean.includes('koma')) {
    const parts = clean.split('koma');
    const integerPart = parseIndonesianCompound(parts[0].trim());
    const decimalWords = parts[1].trim().split(' ').filter(Boolean);
    let decimalStr = '';
    for (const w of decimalWords) {
      if (SINGLE_DIGIT_MAP[w] !== undefined) {
        decimalStr += SINGLE_DIGIT_MAP[w];
      } else if (/^\d+$/.test(w)) {
        decimalStr += w;
      }
    }
    if (integerPart !== null && decimalStr.length > 0) {
      return parseFloat(`${integerPart}.${decimalStr}`);
    }
  }

  // Penguraian angka majemuk bahasa Indonesia e.g. "lima puluh delapan", "lima puluh sembilan"
  const compound = parseIndonesianCompound(clean);
  if (compound !== null) return compound;

  // Pencarian kata tunggal dari kanan ke kiri
  for (let i = rawWords.length - 1; i >= 0; i--) {
    const w = rawWords[i];
    if (PHONETIC_MAP[w] !== undefined) {
      return PHONETIC_MAP[w];
    }
    const asNum = parseFloat(w);
    if (!isNaN(asNum)) {
      return asNum;
    }
  }

  return null;
}

/**
 * Mengurai frasa bilangan formal & informal Indonesia (e.g. "lima puluh delapan", "seratus lima puluh")
 */
export function parseIndonesianCompound(text: string): number | null {
  if (!text) return null;
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    const single = words[0];
    if (PHONETIC_MAP[single] !== undefined) return PHONETIC_MAP[single];
    const num = Number(single);
    if (!isNaN(num)) return num;
  }

  let isNegative = false;
  if (words[0] === 'minus' || words[0] === 'negatif') {
    isNegative = true;
    words.shift();
  }

  // Pola cepat dua kata kebiasaan Indonesia:
  if (words.length === 2) {
    const [w1, w2] = words;
    const d1 = SINGLE_DIGIT_MAP[w1];
    const d2 = SINGLE_DIGIT_MAP[w2];
    if (d1 !== undefined && d2 !== undefined) {
      return (isNegative ? -1 : 1) * (d1 * 10 + d2);
    }

    const v1 = PHONETIC_MAP[w1];
    if (v1 !== undefined) {
      if (w2 === 'belas' || w2 === 'blas') {
        return (isNegative ? -1 : 1) * (v1 + 10);
      }
      if (w2 === 'puluh' || w2 === 'pulu') {
        return (isNegative ? -1 : 1) * (v1 * 10);
      }
      if (w2 === 'ratus' || w2 === 'ratusan') {
        return (isNegative ? -1 : 1) * (v1 * 100);
      }
      if (w2 === 'ribu' || w2 === 'rebu') {
        return (isNegative ? -1 : 1) * (v1 * 1000);
      }
    }
  }

  // Akumulator bilangan formal Indonesia
  let total = 0;
  let current = 0;
  let matchedAny = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (/^\d+$/.test(word)) {
      current += parseInt(word, 10);
      matchedAny = true;
      continue;
    }

    if (word === 'setengah' || word === 'separuh' || word === 'seperdua' || word === 'stengah') {
      current += 0.5;
      matchedAny = true;
    } else if (word === 'seperempat' || word === 'prapat') {
      current += 0.25;
      matchedAny = true;
    } else if (word === 'belas' || word === 'blas') {
      if (current === 0) current = 1;
      current += 10;
      matchedAny = true;
    } else if (word === 'sebelas' || word === 'sbelas' || word === 'seblas') {
      current += 11;
      matchedAny = true;
    } else if (word === 'puluh' || word === 'pulu') {
      if (current === 0) current = 1;
      current *= 10;
      matchedAny = true;
    } else if (word === 'sepuluh' || word === 'spuluh' || word === 'sepulu') {
      current += 10;
      matchedAny = true;
    } else if (word === 'ratus' || word === 'ratusan') {
      if (current === 0) current = 1;
      current *= 100;
      matchedAny = true;
    } else if (word === 'seratus' || word === 'sratus') {
      current += 100;
      matchedAny = true;
    } else if (word === 'ribu' || word === 'rebu') {
      if (current === 0) current = 1;
      total += current * 1000;
      current = 0;
      matchedAny = true;
    } else if (word === 'seribu' || word === 'sribu') {
      total += 1000;
      current = 0;
      matchedAny = true;
    } else if (word === 'juta') {
      if (current === 0) current = 1;
      total += current * 1000000;
      current = 0;
      matchedAny = true;
    } else if (PHONETIC_MAP[word] !== undefined) {
      current += PHONETIC_MAP[word];
      matchedAny = true;
    }
  }

  total += current;

  if (!matchedAny) return null;
  return isNegative ? -total : total;
}

/**
 * Mengubah angka menjadi kata lisan bahasa Indonesia yang jernih dan fasih
 * Contoh: 116 -> "Seratus enam belas", 118 -> "Seratus delapan belas"
 */
export function numberToIndonesianWords(n: number): string {
  if (n === 0) return 'Nol';
  if (isNaN(n) || !isFinite(n)) return 'Tidak terdefinisi';

  let result = '';
  if (n < 0) {
    result = 'Minus ';
    n = Math.abs(n);
  }

  // Bilangan desimal
  if (!Number.isInteger(n)) {
    const intPart = Math.floor(n);
    const decPart = (n - intPart).toFixed(4).replace(/^0\./, '').replace(/0+$/, '');
    const decWords = decPart
      .split('')
      .map((d) => BASIC_DIGITS_REVERSE[parseInt(d, 10)] || d)
      .join(' ');
    return `${result}${convertIntegerToWords(intPart)} koma ${decWords}`.trim();
  }

  return `${result}${convertIntegerToWords(n)}`.trim();
}

const BASIC_DIGITS_REVERSE: Record<number, string> = {
  0: 'nol',
  1: 'satu',
  2: 'dua',
  3: 'tiga',
  4: 'empat',
  5: 'lima',
  6: 'enam',
  7: 'tujuh',
  8: 'delapan',
  9: 'sembilan',
};

function convertIntegerToWords(n: number): string {
  if (n === 0) return 'nol';
  if (n < 12) {
    const map = [
      'nol',
      'satu',
      'dua',
      'tiga',
      'empat',
      'lima',
      'enam',
      'tujuh',
      'delapan',
      'sembilan',
      'sepuluh',
      'sebelas',
    ];
    return map[n];
  }
  if (n < 20) {
    return `${convertIntegerToWords(n - 10)} belas`;
  }
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const remainder = n % 10;
    return `${convertIntegerToWords(tens)} puluh${remainder > 0 ? ` ${convertIntegerToWords(remainder)}` : ''}`;
  }
  if (n < 200) {
    const remainder = n - 100;
    return `seratus${remainder > 0 ? ` ${convertIntegerToWords(remainder)}` : ''}`;
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    return `${convertIntegerToWords(hundreds)} ratus${remainder > 0 ? ` ${convertIntegerToWords(remainder)}` : ''}`;
  }
  if (n < 2000) {
    const remainder = n - 1000;
    return `seribu${remainder > 0 ? ` ${convertIntegerToWords(remainder)}` : ''}`;
  }
  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    return `${convertIntegerToWords(thousands)} ribu${remainder > 0 ? ` ${convertIntegerToWords(remainder)}` : ''}`;
  }
  if (n < 1000000000) {
    const millions = Math.floor(n / 1000000);
    const remainder = n % 1000000;
    return `${convertIntegerToWords(millions)} juta${remainder > 0 ? ` ${convertIntegerToWords(remainder)}` : ''}`;
  }
  const billions = Math.floor(n / 1000000000);
  const remainder = n % 1000000000;
  return `${convertIntegerToWords(billions)} miliar${remainder > 0 ? ` ${convertIntegerToWords(remainder)}` : ''}`;
}

/**
 * Format hasil perhitungan perkalian 2 ke teks audio
 */
export function formatSpeechOutput(
  inputNum: number,
  mode: 'short' | 'detailed' = 'short'
): { spokenText: string; resultNum: number; words: string } {
  const resultNum = inputNum * 2;
  const words = numberToIndonesianWords(resultNum);

  if (mode === 'short') {
    return {
      spokenText: words,
      resultNum,
      words,
    };
  }

  const inputWords = numberToIndonesianWords(inputNum);
  return {
    spokenText: `${inputWords} dikali dua sama dengan ${words}`,
    resultNum,
    words,
  };
}
