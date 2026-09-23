import React, { useState } from 'react';
import { Sparkles, HelpCircle, Shield, Volume2, Mic, MicOff, Waves } from 'lucide-react';
import { useVoiceCalculator } from './hooks/useVoiceCalculator';
import { useMobileGestures } from './hooks/useMobileGestures';
import { AudioOrb } from './components/AudioOrb';
import { OneHandControls } from './components/OneHandControls';
import { GestureHintsDrawer } from './components/GestureHintsDrawer';
import { PWAInstallButton } from './components/PWAInstallButton';

export default function App() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const {
    isListening,
    isSpeaking,
    isProcessing,
    audioLevel,
    lastCalculation,
    speechRate,
    mode,
    volume,
    statusMessage,
    lastDetectedTranscript,
    toggleListening,
    startListening,
    stopListening,
    repeatLastAnswer,
    processNumber,
    increaseSpeed,
    decreaseSpeed,
    toggleMode,
    setVolumeLevel,
  } = useVoiceCalculator();

  // Mobile gesture bindings
  const { gestureProps, gestureNotice } = useMobileGestures({
    onSwipeUp: increaseSpeed,
    onSwipeDown: decreaseSpeed,
    onSwipeLeft: toggleMode,
    onSwipeRight: toggleMode,
    onTap: toggleListening,
    onDoubleTap: repeatLastAnswer,
    onLongPress: () => {
      if (!isListening) startListening();
    },
  });

  return (
    <main
      {...gestureProps}
      className="relative w-full h-[100dvh] max-h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col justify-between overflow-hidden select-none touch-none"
    >
      {/* Dynamic Background Ambience Gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-cyan-950/20 rounded-full blur-[110px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[280px] h-[280px] bg-slate-900/30 rounded-full blur-[90px]" />
      </div>

      {/* Floating Gesture Notice HUD */}
      {gestureNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-zinc-900/95 backdrop-blur-md border border-cyan-500/40 text-xs font-semibold text-cyan-200 shadow-xl shadow-cyan-950/40 animate-in fade-in zoom-in-95 duration-150">
          {gestureNotice}
        </div>
      )}

      {/* Top Mobile App Bar (Compact, ≤56px, within 15% sticky cap) */}
      <header className="relative z-20 w-full max-w-md mx-auto px-4 pt-3 pb-2 flex items-center justify-between">
        {/* Brand Lockup */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-900 p-0.5 shadow-sm">
            <img
              src="/dashera-logo.png"
              alt="Dashera"
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-zinc-100 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
              DASHERA <span className="text-[11px] text-cyan-400 font-mono font-semibold">×2</span>
            </h1>
            <p className="text-[10px] text-zinc-400">Audio Murni Instan</p>
          </div>
        </div>

        {/* Right Action Icons: Install Button & Gesture Guide */}
        <div className="flex items-center gap-2">
          <PWAInstallButton />

          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            aria-label="Panduan Gestur"
            className="w-9 h-9 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Background Active Status Subtle Badge */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-1 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/60 border border-zinc-800/60 text-[11px] text-zinc-400 backdrop-blur-sm">
          <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600'}`} />
          <span>Latar Belakang & Layar Kunci Siap</span>
        </div>
      </div>

      {/* Center Zone: Pure Audio Reactive Orb */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        <AudioOrb
          isListening={isListening}
          isSpeaking={isSpeaking}
          isProcessing={isProcessing}
          audioLevel={audioLevel}
          onClick={toggleListening}
          statusText={statusMessage}
          liveTranscript={lastDetectedTranscript}
        />

        {/* Primary Audio Interaction Pill */}
        <div className="mt-4">
          {!isListening ? (
            <button
              type="button"
              onClick={startListening}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs tracking-wide shadow-xl shadow-cyan-500/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Mic className="w-4 h-4 text-white" />
              <span>MULAI BICARA (KETUK DISINI)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListening}
              className="px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-700/70 hover:border-zinc-600 text-zinc-300 text-xs font-medium flex items-center gap-2 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Mikrofon Aktif (Ketuk untuk Jeda)</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Zone: Ergonomic Natural Thumb Controls */}
      <div className="relative z-20 w-full">
        <OneHandControls
          mode={mode}
          onToggleMode={toggleMode}
          speechRate={speechRate}
          onIncreaseSpeed={increaseSpeed}
          onDecreaseSpeed={decreaseSpeed}
          onRepeat={repeatLastAnswer}
          hasLastCalculation={!!lastCalculation}
          onDirectNumberTest={(num) => processNumber(num, String(num))}
          volume={volume}
          onVolumeChange={setVolumeLevel}
        />
      </div>

      {/* Gesture Help Drawer */}
      <GestureHintsDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </main>
  );
}
