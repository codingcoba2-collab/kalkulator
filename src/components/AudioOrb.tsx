import React from 'react';
import { Mic, AlertTriangle, CheckCircle, Volume2, Sparkles } from 'lucide-react';

interface AudioOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  audioLevel: number; // 0 to 1
  decibels?: number;
  micSensorError?: string | null;
  onClick: () => void;
  statusText: string;
  liveTranscript?: string;
  detectedNumber?: number | null;
  onOpenResultPopUp?: () => void;
}

export const AudioOrb: React.FC<AudioOrbProps> = ({
  isListening,
  isSpeaking,
  isProcessing,
  audioLevel,
  decibels = -60,
  micSensorError,
  onClick,
  statusText,
  liveTranscript,
  detectedNumber,
  onOpenResultPopUp,
}) => {
  // Compute dynamic scale and glow based on real audio level
  const reactiveScale = 1 + audioLevel * 0.24;
  const glowOpacity = Math.min(1, 0.35 + audioLevel * 0.65);

  let ringGlow = 'rgba(255, 255, 255, 0.15)';
  let auraColor = 'from-zinc-500/20 via-zinc-400/10 to-transparent';

  if (isSpeaking) {
    ringGlow = 'rgba(56, 189, 248, 0.7)';
    auraColor = 'from-cyan-500/40 via-blue-500/20 to-transparent';
  } else if (isProcessing) {
    ringGlow = 'rgba(251, 191, 36, 0.7)';
    auraColor = 'from-amber-500/35 via-orange-500/15 to-transparent';
  } else if (isListening) {
    ringGlow = 'rgba(56, 189, 248, 0.5)';
    auraColor = 'from-cyan-400/30 via-slate-500/15 to-transparent';
  }

  return (
    <div className="relative flex flex-col items-center justify-center select-none my-auto w-full">
      {/* Mic Sensor Error Diagnostic Box (Fixes "sensor suara dari mikrofon tidak terbaca") */}
      {micSensorError && (
        <div
          onClick={onClick}
          className="mb-3 px-4 py-2.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs shadow-xl flex items-center gap-2 max-w-sm text-left cursor-pointer hover:bg-rose-900/80 transition-all active:scale-95 animate-in fade-in"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-white">Sensor Mikrofon Tidak Terbaca</p>
            <p className="text-[11px] text-rose-300/90">{micSensorError}</p>
            <p className="text-[10px] text-cyan-300 font-medium underline mt-0.5">
              Ketuk di sini untuk mencoba ulang izin mikrofon
            </p>
          </div>
        </div>
      )}

      {/* Outer Soundwave Pulsing Rings */}
      {(isListening || isSpeaking) && (
        <>
          <div
            className="absolute rounded-full pointer-events-none transition-transform duration-75 ease-out"
            style={{
              width: '320px',
              height: '320px',
              transform: `scale(${1 + audioLevel * 0.45})`,
              background: `radial-gradient(circle, ${ringGlow} 0%, rgba(0,0,0,0) 70%)`,
              opacity: glowOpacity * 0.6,
            }}
          />
          <div
            className="absolute rounded-full border border-cyan-500/30 pointer-events-none transition-transform duration-100 ease-out animate-pulse"
            style={{
              width: '280px',
              height: '280px',
              transform: `scale(${reactiveScale * 1.08})`,
              boxShadow: `0 0 45px ${ringGlow}`,
            }}
          />
        </>
      )}

      {/* Main Central Touch Orb */}
      <button
        type="button"
        onClick={onClick}
        aria-label={isListening ? 'Hentikan Mendengarkan' : 'Mulai Mendengarkan'}
        className="relative group w-48 h-48 sm:w-56 sm:h-56 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-150 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/60"
        style={{
          transform: `scale(${isListening || isSpeaking ? reactiveScale : 1})`,
        }}
      >
        {/* Ambient Back Glow */}
        <div
          className={`absolute -inset-4 rounded-full bg-gradient-to-tr ${auraColor} blur-2xl transition-opacity duration-300`}
          style={{ opacity: isListening ? glowOpacity : 0.25 }}
        />

        {/* Outer Metallic Beveled Ring */}
        <div className="absolute inset-0 rounded-full p-[2.5px] bg-gradient-to-b from-white/60 via-zinc-400/20 to-zinc-800 shadow-[0_12px_40px_rgba(0,0,0,0.85)]">
          {/* Inner Glossy Glass Orb Body */}
          <div className="relative w-full h-full rounded-full bg-zinc-950 overflow-hidden flex items-center justify-center">
            {/* Dark glass depth reflection */}
            <div className="absolute inset-0 bg-radial from-zinc-800/40 via-zinc-950 to-black" />
            <div className="absolute -top-1/2 left-1/4 w-3/4 h-3/4 bg-white/10 blur-xl rounded-full pointer-events-none" />

            {/* Specular curved glass arc */}
            <div className="absolute top-2 left-6 right-6 h-16 bg-gradient-to-b from-white/20 to-transparent rounded-t-full pointer-events-none" />

            {/* DASHERA Metallic Logo Emblem */}
            <div className="relative z-10 flex flex-col items-center justify-center p-3">
              <img
                src="/dashera-logo.png"
                alt="Dashera Emblem"
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)] transition-all duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="sr-only">Dashera Multiplier x2</span>
            </div>

            {/* Dynamic Sound Ripple Overlay */}
            {isSpeaking && (
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/80 animate-ping pointer-events-none opacity-40" />
            )}
          </div>
        </div>

        {/* Dynamic Status Pill */}
        <div
          className={`absolute -bottom-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase backdrop-blur-md border shadow-lg transition-all ${
            isSpeaking
              ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 shadow-cyan-500/20'
              : isProcessing
              ? 'bg-amber-500/20 text-amber-200 border-amber-400/40 shadow-amber-500/20'
              : isListening
              ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40 shadow-emerald-500/20'
              : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60'
          }`}
        >
          {isSpeaking
            ? 'Mengucapkan'
            : isProcessing
            ? 'Menghitung'
            : isListening
            ? 'Sensor Aktif'
            : 'Standby'}
        </div>
      </button>

      {/* Real-Time Microphone Sensor Level Meter & Decibels */}
      {isListening && !micSensorError && (
        <div className="mt-5 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-300">
          <span className="text-zinc-400">Sensor Suara:</span>
          {/* Animated 5-bar equalizer showing real input sensitivity */}
          <div className="flex items-end gap-1 h-3.5 px-1">
            <span
              className="w-1 bg-cyan-400 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(20, audioLevel * 100)}%` }}
            />
            <span
              className="w-1 bg-cyan-400 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(30, audioLevel * 130)}%` }}
            />
            <span
              className="w-1 bg-cyan-400 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(40, audioLevel * 160)}%` }}
            />
            <span
              className="w-1 bg-cyan-300 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(25, audioLevel * 120)}%` }}
            />
            <span
              className="w-1 bg-cyan-300 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(20, audioLevel * 90)}%` }}
            />
          </div>
          <span className="font-mono text-cyan-300 text-[10px]">
            {audioLevel > 0.05 ? `${Math.max(-50, decibels)} dB` : 'Menunggu Suara'}
          </span>
        </div>
      )}

      {/* Voice Reading to Number Display: "baca suara dan tulis menjadi angka" */}
      <div className="mt-3 text-center max-w-sm px-4">
        <p className="text-base font-bold text-zinc-100 tracking-tight transition-colors duration-200">
          {statusText}
        </p>

        {/* Live Detected Transcription & Converted Number Badge */}
        {liveTranscript && (
          <div className="mt-2 flex flex-col items-center gap-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-xs animate-in fade-in zoom-in-95 duration-150">
              <span className="text-zinc-400">Suara:</span>
              <span className="text-cyan-300 font-semibold truncate max-w-[170px]">
                &ldquo;{liveTranscript}&rdquo;
              </span>
              {detectedNumber !== null && detectedNumber !== undefined && (
                <span className="ml-1 px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-white font-mono font-bold">
                  ➔ {detectedNumber}
                </span>
              )}
            </div>

            {detectedNumber !== null && detectedNumber !== undefined && (
              <button
                type="button"
                onClick={onOpenResultPopUp}
                className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Lihat Pop-up Hasil × 2</span>
              </button>
            )}
          </div>
        )}

        <p className="text-xs text-zinc-400 mt-2">
          {isListening
            ? 'Sebut angka bebas (misal: "dua puluh lima" atau "50")'
            : 'Ketuk logo atau tombol di bawah untuk menyalakan suara'}
        </p>
      </div>
    </div>
  );
};
