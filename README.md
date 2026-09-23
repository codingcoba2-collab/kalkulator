# Dashera Voice Multiplier ×2

Aplikasi kalkulator audio murni instan khusus perkalian dua (×2) yang dioptimalkan untuk mobile satu genggaman tangan, didukung pengenalan suara bahasa Indonesia, kontrol gestur taktil, serta pemutaran latar belakang.

## Fitur Utama

- **Audio Murni Instan**: Pengguna cukup mengucapkan angka (contoh: *"dua"*, *"lima"*, *"dua puluh lima"*), aplikasi langsung membunyikan konfirmasi akustik mikro dan merespons dengan suara jernih (*"Empat"*, *"Sepuluh"*, *"Lima puluh"*).
- **Tanpa Antarmuka Ketik**: Interaksi sepenuhnya berbasis suara dan orb visualizer audio reaktif.
- **Dukungan Latar Belakang (Background Playback)**: Terintegrasi dengan MediaSession API dan Screen WakeLock agar tetap aktif saat layar ponsel terkunci.
- **Navigasi Gestur 1 Tangan**:
  - *Geser Atas / Bawah*: Ubah kecepatan tempo suara.
  - *Geser Kiri / Kanan*: Beralih format audio (*Singkat* vs *Formula*).
  - *Ketuk 2x*: Ulangi hasil audio terakhir.
  - *Tekan & Tahan*: Push-to-talk.
- **PWA & Mobile Ready**: Siap dipasang di Android (Chrome) dan iOS (Safari).

---

## Panduan Deploy ke Vercel

Aplikasi ini telah dikonfigurasi penuh dengan `vercel.json` dan Vite build standar.

### Opsi 1: Melalui Dashboard Vercel (GitHub/GitLab)

1. Hubungkan repositori proyek ke Vercel melalui [vercel.com/new](https://vercel.com/new).
2. Konfigurasi proyek akan terdeteksi secara otomatis:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build` (atau `vite build`)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. Klik tombol **Deploy**.

### Opsi 2: Menggunakan Vercel CLI

```bash
# 1. Pastikan Vercel CLI terpasang
npm install -g vercel

# 2. Login ke akun Vercel
vercel login

# 3. Jalankan perintah deploy
vercel --prod
```

Semua konfigurasi routing SPA, caching aset statis, dan header keamanan telah didefinisikan dalam `vercel.json`.
