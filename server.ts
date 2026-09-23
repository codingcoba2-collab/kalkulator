import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();

function getPort(): number {
  const portIdx = process.argv.indexOf('--port');
  if (portIdx !== -1 && process.argv[portIdx + 1]) {
    return parseInt(process.argv[portIdx + 1], 10);
  }
  return parseInt(process.env.PORT || '3000', 10);
}

const port = getPort();

app.use(express.json({ limit: '15mb' }));

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
FOKUS MUTLAK: Hanya bahasa Indonesia dan kebiasaan percakapan orang Indonesia.
PERINGATAN KERAS: JANGAN PERNAH MENGALIKAN ATAU MENGUBAH ANGKA! HANYA KEMBALIKAN ANGKA ASLI YANG DIUCAPKAN.
Contoh kebiasaan orang Indonesia:
- "lima delapan", "lima lapan", "lima puluh delapan" -> {"number": 58, "raw": "lima delapan"}
- "lima sembilan", "lima smbilan", "lima puluh sembilan" -> {"number": 59, "raw": "lima sembilan"}
- "lima tujuh", "lima puluh tujuh" -> {"number": 57, "raw": "lima tujuh"}
- "tujuh delapan", "tujuh lapan" -> {"number": 78, "raw": "tujuh delapan"}
- "dua lima", "dua puluh lima" -> {"number": 25, "raw": "dua lima"}
- "dua tujuh" -> {"number": 27, "raw": "dua tujuh"}
- "tujuh" -> {"number": 7, "raw": "tujuh"} (JANGAN TERTUKAR DENGAN 2!)
- "dua" -> {"number": 2, "raw": "dua"} (JANGAN TERTUKAR DENGAN 7!)
- "delapan" atau "lapan" -> {"number": 8, "raw": "delapan"}
- "sembilan" -> {"number": 9, "raw": "sembilan"}
- "lima" -> {"number": 5, "raw": "lima"}
- "gocap" -> {"number": 50, "raw": "gocap"}
- "cepek" -> {"number": 100, "raw": "cepek"}
- "setengah" -> {"number": 0.5, "raw": "setengah"}
Format JSON murni tanpa markdown:
{"number": 58, "raw": "lima delapan"}
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

app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body || {};
    if (!audioData) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    const cleanMime = mimeType.split(';')[0];
    const data = await transcribeWithGemini(audioData, cleanMime);
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Server Transcribe API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Mount Vite middleware in development, or serve static dist in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
  });

  server.on('error', (err: any) => {
    console.error('Server error:', err);
  });
}

startServer();
