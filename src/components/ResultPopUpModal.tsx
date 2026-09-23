import React, { useState } from 'react';
import { Sparkles, Volume2, Copy, Check, X, ArrowRight, Calculator } from 'lucide-react';
import { CalculationHistoryItem } from '../hooks/useVoiceCalculator';

interface ResultPopUpModalProps {
  calculation: CalculationHistoryItem | null;
  detectedTranscript?: string;
  isSpeaking: boolean;
  isOpen: boolean;
  onClose: () => void;
  onRepeat: () => void;
}

export const ResultPopUpModal: React.FC<ResultPopUpModalProps> = ({
  calculation,
  detectedTranscript,
  isSpeaking,
  isOpen,
  onClose,
  onRepeat,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !calculation) return null;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(`${calculation.input} × 2 = ${calculation.result}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-zinc-900/95 border border-cyan-500/40 p-6 shadow-[0_0_60px_rgba(6,182,212,0.25)] text-center animate-in zoom-in-95 duration-200">
        {/* Glow Accent */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-20 bg-cyan-500/30 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success / Reading Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[11px] font-semibold tracking-wide uppercase mb-3">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Suara Terbaca & Diubah ke Angka</span>
        </div>

        {/* Voice Transcript to Number Breakdown */}
        <div className="mb-4 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-left space-y-2">
          {detectedTranscript && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Suara Terdeteksi:</span>
              <span className="font-medium text-cyan-300 truncate max-w-[170px]">
                &ldquo;{detectedTranscript}&rdquo;
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs border-t border-zinc-850 pt-1.5">
            <span className="text-zinc-400">Ditulis Menjadi Angka:</span>
            <span className="font-mono font-bold text-white text-sm bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-700">
              {calculation.input}
            </span>
          </div>
        </div>

        {/* Main Big Result Display */}
        <div className="my-3 py-4 px-3 rounded-2xl bg-gradient-to-b from-cyan-950/40 via-zinc-900 to-zinc-950 border border-cyan-500/30">
          <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm font-semibold mb-1">
            <span className="font-mono text-zinc-200 text-lg">{calculation.input}</span>
            <span className="text-cyan-400 text-base font-bold">×</span>
            <span className="font-mono text-zinc-200 text-lg">2</span>
            <span className="text-zinc-500 text-base">=</span>
          </div>

          <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-white tracking-tight drop-shadow-[0_2px_20px_rgba(34,211,238,0.4)] my-1">
            {calculation.result}
          </div>

          <p className="text-xs text-cyan-300/90 font-medium italic mt-1">
            &ldquo;{calculation.spokenOutput}&rdquo;
          </p>
        </div>

        {/* Audio Status Indicator */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 mb-5">
          <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-cyan-400 animate-pulse' : 'text-zinc-500'}`} />
          <span>{isSpeaking ? 'Audio sedang berbicara...' : 'Audio siap diputar ulang'}</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onRepeat}
            className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-zinc-700"
          >
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span>Putar Ulang</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-zinc-700"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-zinc-400" />
                <span>Salin Hasil</span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer"
        >
          Hitung Angka Lain
        </button>
      </div>
    </div>
  );
};
