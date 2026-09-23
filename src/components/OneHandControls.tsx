import React, { useState } from 'react';
import { Volume2, Zap, RotateCcw, FastForward, Sliders, Smartphone } from 'lucide-react';
import { ModeType } from '../hooks/useVoiceCalculator';

interface OneHandControlsProps {
  mode: ModeType;
  onToggleMode: () => void;
  speechRate: number;
  onIncreaseSpeed: () => void;
  onDecreaseSpeed: () => void;
  onRepeat: () => void;
  hasLastCalculation: boolean;
  onDirectNumberTest: (num: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
}

export const OneHandControls: React.FC<OneHandControlsProps> = ({
  mode,
  onToggleMode,
  speechRate,
  onIncreaseSpeed,
  onDecreaseSpeed,
  onRepeat,
  hasLastCalculation,
  onDirectNumberTest,
  volume,
  onVolumeChange,
}) => {
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [handedness, setHandedness] = useState<'right' | 'left'>('right');

  // Common numbers to test instant audio output
  const quickTestNumbers = [2, 5, 7, 10, 15, 25, 50, 100, 0.5];

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-6 pt-2 select-none">
      {/* Quick Test Audio Pills (Allows immediate audio feedback anytime) */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 px-1">
          <span className="font-medium text-zinc-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Sentuh Cepat Angka (Audio x2)
          </span>
          <span className="text-[11px] text-zinc-500">Hasil Instan</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar py-1">
          {quickTestNumbers.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onDirectNumberTest(num)}
              className="shrink-0 min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-sm font-semibold text-zinc-200 active:bg-cyan-500/20 active:border-cyan-400/50 active:scale-95 transition-all shadow-sm"
              title={`Hitung ${num} x 2`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Main Ergonomic Bottom Thumb Bar */}
      <div
        className={`flex items-center gap-2.5 p-2 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl ${
          handedness === 'left' ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Primary Thumb Reach Action: Repeat Last Result */}
        <button
          type="button"
          onClick={onRepeat}
          disabled={!hasLastCalculation}
          aria-label="Ulangi Hasil Terakhir"
          className={`flex-1 min-h-[48px] px-3 py-2 rounded-xl flex items-center justify-center gap-2 font-medium text-xs tracking-tight transition-all duration-150 ${
            hasLastCalculation
              ? 'bg-gradient-to-r from-zinc-800 to-zinc-700 hover:from-zinc-700 hover:to-zinc-600 text-white shadow-md active:scale-98'
              : 'bg-zinc-900 text-zinc-600 border border-zinc-800/40 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-cyan-400" />
          <span className="truncate">Ulangi Audio</span>
        </button>

        {/* Mode Selector Button */}
        <button
          type="button"
          onClick={onToggleMode}
          aria-label={`Format Audio: ${mode === 'short' ? 'Hasil Saja' : 'Kalimat Lengkap'}`}
          className="min-h-[48px] px-3.5 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-xs font-medium text-zinc-300 flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
            {mode === 'short' ? 'Singkat' : 'Formula'}
          </span>
        </button>

        {/* Speed Quick Toggle Button */}
        <button
          type="button"
          onClick={onIncreaseSpeed}
          aria-label={`Kecepatan Suara: ${speechRate}x`}
          className="min-h-[48px] px-3 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-xs font-semibold text-zinc-300 flex items-center gap-1 active:scale-95 transition-all"
        >
          <FastForward className="w-3.5 h-3.5 text-zinc-400" />
          <span>{speechRate.toFixed(1)}x</span>
        </button>

        {/* Settings Drawer Button */}
        <button
          type="button"
          onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
          aria-label="Pengaturan Audio Lanjutan"
          className="min-h-[48px] min-w-[48px] rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 flex items-center justify-center text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Audio & Ergonomics Drawer */}
      {showSettingsDrawer && (
        <div className="mt-3 p-4 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <span className="text-xs font-semibold text-zinc-200">Preferensi Audio & Satu Tangan</span>
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
            >
              Tutup
            </button>
          </div>

          {/* Volume Control */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-zinc-400" /> Volume Respons
              </span>
              <span className="font-mono">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-2 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Speed Control */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <FastForward className="w-3.5 h-3.5 text-zinc-400" /> Kecepatan Suara
              </span>
              <span className="font-mono">{speechRate.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDecreaseSpeed}
                className="flex-1 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-750 active:scale-95"
              >
                Lebih Lambat (-0.1x)
              </button>
              <button
                type="button"
                onClick={onIncreaseSpeed}
                className="flex-1 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-750 active:scale-95"
              >
                Lebih Cepat (+0.1x)
              </button>
            </div>
          </div>

          {/* Handedness Preference */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-zinc-400" /> Ergonomi Genggaman Tangan
              </span>
              <span className="text-[11px] text-zinc-500">
                {handedness === 'right' ? 'Tangan Kanan' : 'Tangan Kiri'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setHandedness('right')}
                className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                  handedness === 'right'
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700/50'
                }`}
              >
                Genggaman Kanan
              </button>
              <button
                type="button"
                onClick={() => setHandedness('left')}
                className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                  handedness === 'left'
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700/50'
                }`}
              >
                Genggaman Kiri
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
