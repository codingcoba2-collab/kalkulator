import React, { useState } from 'react';
import { RefreshCw, Sparkles, CheckCircle2, X, ArrowUpCircle } from 'lucide-react';
import { usePWAUpdate } from '../hooks/usePWAUpdate';

interface PWAUpdateManagerProps {
  showButtonOnly?: boolean;
}

export const PWAUpdateManager: React.FC<PWAUpdateManagerProps> = () => {
  const {
    updateAvailable,
    isChecking,
    lastCheckMessage,
    version,
    checkForUpdate,
    applyUpdateWithoutUninstall,
  } = usePWAUpdate();

  const [isOpenModal, setIsOpenModal] = useState(false);

  return (
    <>
      {/* Top Header Update Trigger Pill */}
      <button
        type="button"
        onClick={() => setIsOpenModal(true)}
        title="Pembaruan Aplikasi Tanpa Uninstall"
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[11px] font-medium text-zinc-300 active:scale-95 transition-all shadow-sm"
      >
        <RefreshCw className={`w-3 h-3 text-cyan-400 ${isChecking ? 'animate-spin' : ''}`} />
        <span className="font-mono text-zinc-400">{version}</span>
        {updateAvailable && (
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        )}
      </button>

      {/* Floating Alert Banner if New Update is Ready to Install */}
      {updateAvailable && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm p-3.5 rounded-2xl bg-zinc-900/95 border border-cyan-500/50 shadow-2xl shadow-cyan-950/60 backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white">Versi Baru Tersedia!</p>
              <p className="text-[10px] text-zinc-400 leading-tight">
                Update instan tanpa perlu uninstall.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={applyUpdateWithoutUninstall}
            disabled={isChecking}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shrink-0 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            {isChecking ? 'Memproses...' : 'Perbarui'}
          </button>
        </div>
      )}

      {/* In-App Update Modal / Dialog */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl text-left">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Pembaruan Tanpa Uninstall</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-zinc-400">Versi Terpasang</p>
                  <p className="text-sm font-mono font-bold text-cyan-300">{version}</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Siap Otomatis</span>
                </div>
              </div>

              <p className="text-zinc-300 leading-relaxed">
                Anda <strong className="text-cyan-300">tidak perlu menghapus / uninstall</strong> aplikasi dari layar utama HP saat ada fitur baru atau perbaikan. Cukup tekan tombol di bawah untuk menyegarkan cache aplikasi secara bersih.
              </p>

              {lastCheckMessage && (
                <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-[11px]">
                  {lastCheckMessage}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={applyUpdateWithoutUninstall}
                  disabled={isChecking}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'Memperbarui...' : 'Perbarui Aplikasi Sekarang (Bersihkan Cache)'}</span>
                </button>

                <button
                  type="button"
                  onClick={checkForUpdate}
                  disabled={isChecking}
                  className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium active:scale-95 transition-all"
                >
                  Cek Versi Terbaru
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
