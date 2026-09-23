import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeftRight, MousePointerClick, Radio, ShieldCheck, Zap } from 'lucide-react';

interface GestureHintsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GestureHintsDrawer: React.FC<GestureHintsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-900/95 border border-zinc-800 p-5 shadow-2xl text-left">
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Navigasi Gestur Satu Genggaman</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1"
          >
            Tutup
          </button>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-850/80 border border-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-cyan-400 shrink-0">
              <ArrowUp className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-zinc-200">Geser ke Atas</p>
              <p className="text-zinc-400 text-[11px]">Menaikkan kecepatan pengucapan suara</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-850/80 border border-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-cyan-400 shrink-0">
              <ArrowDown className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-zinc-200">Geser ke Bawah</p>
              <p className="text-zinc-400 text-[11px]">Menurunkan kecepatan pengucapan suara</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-850/80 border border-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-cyan-400 shrink-0">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-zinc-200">Geser Kiri / Kanan</p>
              <p className="text-zinc-400 text-[11px]">Beralih Format Singkat (&quot;Empat&quot;) / Formula (&quot;2×2=4&quot;)</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-850/80 border border-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-cyan-400 shrink-0">
              <MousePointerClick className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-zinc-200">Ketuk 2 Kali (Double Tap)</p>
              <p className="text-zinc-400 text-[11px]">Mengulangi hasil perhitungan audio terakhir</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-850/80 border border-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-cyan-400 shrink-0">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-zinc-200">Latar Belakang & Layar Kunci</p>
              <p className="text-zinc-400 text-[11px]">
                Audio tetap aktif melalui MediaSession dan WakeLock saat layar terkunci
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 border border-cyan-500/30 text-xs font-semibold active:scale-95 transition-all"
        >
          Siap Menggunakan Gestur
        </button>
      </div>
    </div>
  );
};
