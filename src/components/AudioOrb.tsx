import React from 'react';

interface AudioOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  audioLevel: number; // 0 to 1
  onClick: () => void;
  statusText: string;
}

export const AudioOrb: React.FC<AudioOrbProps> = ({
  isListening,
  isSpeaking,
  isProcessing,
  audioLevel,
  onClick,
  statusText,
}) => {
  // Compute dynamic scale and glow based on audio level
  const reactiveScale = 1 + audioLevel * 0.22;
  const glowOpacity = Math.min(1, 0.35 + audioLevel * 0.65);

  let stateColor = 'from-zinc-700 to-zinc-900 border-zinc-700/60';
  let ringGlow = 'rgba(255, 255, 255, 0.15)';
  let auraColor = 'from-zinc-500/20 via-zinc-400/10 to-transparent';

  if (isSpeaking) {
    stateColor = 'from-cyan-600 via-sky-600 to-blue-900 border-cyan-400/80';
    ringGlow = 'rgba(56, 189, 248, 0.65)';
    auraColor = 'from-cyan-500/40 via-blue-500/20 to-transparent';
  } else if (isProcessing) {
    stateColor = 'from-amber-600 to-orange-900 border-amber-400/80';
    ringGlow = 'rgba(251, 191, 36, 0.65)';
    auraColor = 'from-amber-500/35 via-orange-500/15 to-transparent';
  } else if (isListening) {
    stateColor = 'from-slate-700 via-cyan-950 to-zinc-900 border-cyan-400/50';
    ringGlow = 'rgba(56, 189, 248, 0.45)';
    auraColor = 'from-cyan-400/30 via-slate-500/15 to-transparent';
  }

  return (
    <div className="relative flex flex-col items-center justify-center select-none my-auto">
      {/* Outer Soundwave Pulsing Rings (Active when listening or speaking) */}
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

      {/* Main Touch-Friendly Central Orb */}
      <button
        type="button"
        onClick={onClick}
        aria-label={isListening ? 'Hentikan Mendengarkan' : 'Mulai Mendengarkan'}
        className="relative group w-52 h-52 sm:w-60 sm:h-60 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-150 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/60"
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
                className="w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)] transition-all duration-300 group-hover:scale-105"
                onError={(e) => {
                  // Fallback to stylized SVG emblem if image asset is unavailable
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

        {/* Corner Pulse Accent */}
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
            ? 'Mendengarkan'
            : 'Standby'}
        </div>
      </button>

      {/* Immediate Audio Feedback Status Label */}
      <div className="mt-7 text-center max-w-xs px-4">
        <p className="text-base font-medium text-zinc-100 tracking-tight transition-colors duration-200">
          {statusText}
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          {isListening
            ? 'Sebut angka apa saja (misal: "dua")'
            : 'Ketuk logo di atas untuk mengaktifkan suara'}
        </p>
      </div>
    </div>
  );
};
