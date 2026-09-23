import React, { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-200 transition-all active:scale-95 shadow-sm"
      >
        <Download className="w-3.5 h-3.5 text-cyan-400" />
        <span>Pasang Aplikasi</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-300 transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Pasang di HP</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-left">
              <h3 className="text-base font-semibold text-zinc-100">Pasang di iPhone / iPad</h3>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                1. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah navigasi Safari bawah.<br />
                2. Gulir ke bawah lalu pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-all active:scale-95"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
