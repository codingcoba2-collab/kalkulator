import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI();

async function transcribeWithGemini(audioData: string, cleanMime: string) {
  const models = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: audioData,
            },
          },
          {
            text: `Anda adalah pendengar audio presisi tinggi untuk angka bahasa Indonesia.
TUGAS: Dengarkan audio dan ekstrak HANYA kata/angka ASLI yang diucapkan oleh pengguna.
PERINGATAN KERAS: JANGAN PERNAH MENGALIKAN ATAU MENGUBAH ANGKA! HANYA KEMBALIKAN ANGKA ASLI YANG DIUCAPKAN.
Contoh:
- jika suara mengatakan "tujuh", kembalikan number: 7 (JANGAN TERTUKAR DENGAN 2!)
- jika suara mengatakan "dua", kembalikan number: 2 (JANGAN TERTUKAR DENGAN 7!)
- jika suara mengatakan "lima tujuh", kembalikan number: 57 (BUKAN 7!)
- jika suara mengatakan "lima sembilan", kembalikan number: 59 (BUKAN 9!)
- jika suara mengatakan "dua tujuh", kembalikan number: 27
- jika suara mengatakan "dua lima", kembalikan number: 25
- jika suara mengatakan "lima", kembalikan number: 5
- jika suara mengatakan "tiga", kembalikan number: 3
- jika suara mengatakan "empat", kembalikan number: 4
- jika suara mengatakan "sepuluh", kembalikan number: 10
- jika suara mengatakan "setengah", kembalikan number: 0.5
Format JSON murni tanpa markdown:
{"number": 2, "raw": "dua"}
Jika tidak ada ucapan angka yang jelas, kembalikan:
{"number": null, "raw": ""}`,
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      try {
        return JSON.parse(text);
      } catch {
        return { number: null, raw: text };
      }
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('All models failed');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { audioData, mimeType = 'audio/webm' } = req.body || {};
    if (!audioData) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    const cleanMime = mimeType.split(';')[0];
    const data = await transcribeWithGemini(audioData, cleanMime);
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Vercel Transcribe API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
