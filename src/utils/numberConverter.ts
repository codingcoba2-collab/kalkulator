/**
 * Indonesian Spoken Number Parser & Formatter for x2 Audio Engine
 */

const BASIC_UNITS: Record<string, number> = {
  nol: 0,
  kosong: 0,
  zero: 0,
  satu: 1,
  se: 1,
  one: 1,
  dua: 2,
  two: 2,
  tiga: 3,
  three: 3,
  empat: 4,
  four: 4,
  lima: 5,
  five: 5,
  enam: 6,
  six: 6,
  tujuh: 7,
  seven: 7,
  delapan: 8,
  eight: 8,
  sembilan: 9,
  nine: 9,
  sepuluh: 10,
  ten: 10,
  sebelas: 11,
  eleven: 11,
  seratus: 100,
  seribu: 1000,
  sejuta: 1000000,
  setengah: 0.5,
  seperempat: 0.25,
  separuh: 0.5,
  half: 0.5,
};

/**
 * Extracts and parses a numeric value from spoken natural text
 */
export function parseSpokenNumber(text: string): number | null {
  if (!text || typeof text !== 'string') return null;

  // Clean text: lowercase, remove question marks, dots, commas
  let clean = text
    .toLowerCase()
    .replace(/[?!,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove common filler prefix/phrases
  const fillers = [
    'berapa',
    'hasil',
    'dari',
    'dikali',
    'kali',
    'dua', // be careful if "kali dua" is specified
    'tolong',
    'hitung',
    'hitunglah',
    'angka',
    'nomor',
    'jawaban',
    'adalah',
    'sama dengan',
    'x 2',
    'x2',
  ];

  // Check if text ends with "kali dua" or "dikali dua" - e.g. "lima dikali dua"
  const kaliDuaMatch = clean.match(/(?:(?:di)?kali\s*(?:dua|2))\s*$/);
  if (kaliDuaMatch) {
    clean = clean.replace(/(?:(?:di)?kali\s*(?:dua|2))\s*$/, '').trim();
  }

  // Check if text starts with "dua kali" or "2 kali" - e.g. "dua kali lima"
  const duaKaliMatch = clean.match(/^(?:dua|2)\s*(?:kali|dikali)\s*/);
  if (duaKaliMatch) {
    clean = clean.replace(/^(?:dua|2)\s*(?:kali|dikali)\s*/, '').trim();
  }

  // Remove remaining generic query fillers (leaving numbers)
  clean = clean
    .replace(/\b(berapa|hasil dari|hitunglah|hitung|tolong|angka|nilai)\b/g, '')
    .trim();

  // If after stripping, clean is empty and original was "dua"
  if (!clean && (text.includes('dua') || text.includes('2'))) {
    return 2;
  }

  // Check for direct numeric match with commas/dots, e.g. "12.5" or "12,5" or "-8"
  const directDigitMatch = clean.match(/[-+]?\d+(?:[.,]\d+)?/);
  if (directDigitMatch && clean.split(' ').length <= 2) {
    const parsed = parseFloat(directDigitMatch[0].replace(',', '.'));
    if (!isNaN(parsed)) return parsed;
  }

  // Handle words with "koma" e.g. "dua koma lima"
  if (clean.includes('koma')) {
    const parts = clean.split('koma');
    const integerPart = parseIndonesianInteger(parts[0].trim());
    const decimalWords = parts[1].trim().split(' ');
    let decimalStr = '';
    for (const w of decimalWords) {
      if (BASIC_UNITS[w] !== undefined && BASIC_UNITS[w] < 10) {
        decimalStr += BASIC_UNITS[w];
      } else if (/^\d+$/.test(w)) {
        decimalStr += w;
      }
    }
    if (integerPart !== null && decimalStr.length > 0) {
      return parseFloat(`${integerPart}.${decimalStr}`);
    }
  }

  return parseIndonesianInteger(clean);
}

/**
 * Parses Indonesian integer phrase, e.g. "dua puluh lima" -> 25
 */
export function parseIndonesianInteger(text: string): number | null {
  if (!text) return null;
  const words = text.trim().split(/\s+/);

  // Quick single word / direct number check
  if (words.length === 1) {
    const single = words[0];
    if (BASIC_UNITS[single] !== undefined) return BASIC_UNITS[single];
    const num = Number(single);
    if (!isNaN(num)) return num;
  }

  let isNegative = false;
  if (words[0] === 'minus' || words[0] === 'negatif') {
    isNegative = true;
    words.shift();
  }

  let total = 0;
  let current = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Check if it's already a raw number
    if (/^\d+$/.test(word)) {
      current += parseInt(word, 10);
      continue;
    }

    if (word === 'setengah' || word === 'separuh') {
      current += 0.5;
    } else if (word === 'seperempat') {
      current += 0.25;
    } else if (word === 'belas') {
      // e.g. "tiga belas" -> 3 + 10 = 13 (current is 3, becomes 13)
      if (current === 0) current = 1;
      current += 10;
    } else if (word === 'sebelas') {
      current += 11;
    } else if (word === 'puluh') {
      if (current === 0) current = 1;
      current *= 10;
    } else if (word === 'sepuluh') {
      current += 10;
    } else if (word === 'ratus') {
      if (current === 0) current = 1;
      current *= 100;
    } else if (word === 'seratus') {
      current += 100;
    } else if (word === 'ribu') {
      if (current === 0) current = 1;
      total += current * 1000;
      current = 0;
    } else if (word === 'seribu') {
      total += 1000;
      current = 0;
    } else if (word === 'juta') {
      if (current === 0) current = 1;
      total += current * 1000000;
      current = 0;
    } else if (word === 'miliar' || word === 'milyar') {
      if (current === 0) current = 1;
      total += current * 1000000000;
      current = 0;
    } else if (BASIC_UNITS[word] !== undefined) {
      current += BASIC_UNITS[word];
    }
  }

  total += current;

  if (total === 0 && !text.includes('nol') && !text.includes('kosong') && !text.includes('zero') && !text.includes('0')) {
    // Might not have matched any number
    return null;
  }

  return isNegative ? -total : total;
}

/**
 * Converts a number to Indonesian spoken words, e.g. 4 -> "Empat", 20 -> "Dua puluh"
 */
export function numberToIndonesianWords(n: number): string {
  if (n === 0) return 'Nol';
  if (isNaN(n) || !isFinite(n)) return 'Tidak terdefinisi';

  let result = '';
  if (n < 0) {
    result = 'Minus ';
    n = Math.abs(n);
  }

  // Handle decimal
  if (!Number.isInteger(n)) {
    const intPart = Math.floor(n);
    const decPart = (n - intPart).toFixed(4).replace(/^0\./, '').replace(/0+$/, '');
    const decWords = decPart
      .split('')
      .map((d) => BASIC_UNITS_REVERSE[parseInt(d, 10)] || d)
      .join(' ');
    return `${result}${convertIntegerToWords(intPart)} koma ${decWords}`.trim();
  }

  return `${result}${convertIntegerToWords(n)}`.trim();
}

const BASIC_UNITS_REVERSE: Record<number, string> = {
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
 * Format calculation into clean spoken audio text based on mode
 */
export function formatSpeechOutput(
  inputNum: number,
  mode: 'short' | 'detailed' = 'short'
): { spokenText: string; resultNum: number; words: string } {
  const resultNum = inputNum * 2;
  const words = numberToIndonesianWords(resultNum);

  if (mode === 'short') {
    // Exact user requirement: "misal hanya bilang 'dua' maka hasilnya empat"
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
