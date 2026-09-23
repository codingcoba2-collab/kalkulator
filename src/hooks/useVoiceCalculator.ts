import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { parseSpokenNumber, formatSpeechOutput } from '../utils/numberConverter';

export interface CalculationHistoryItem {
  id: string;
  input: number;
  result: number;
  spokenOutput: string;
  timestamp: Date;
}

export type ModeType = 'short' | 'detailed'; // short: "Empat", detailed: "Dua dikali dua sama dengan empat"

export function useVoiceCalculator() {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastCalculation, setLastCalculation] = useState<CalculationHistoryItem | null>(null);
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
  const [volume, setVolume] = useState<number>(1.0);
  const [speechRate, setSpeechRate] = useState<number>(1.18); // snappy, clear speech
  const [mode, setMode] = useState<ModeType>('short');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [lastDetectedTranscript, setLastDetectedTranscript] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Ketuk logo untuk mendengarkan');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Persistent refs to avoid closure staleness and feedback loops
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const isVadBusyRef = useRef<boolean>(false);
  const lastProcessedTimeRef = useRef<number>(0);
  const lastProcessedNumRef = useRef<number | null>(null);
  const lastSpokenResultWordsRef = useRef<string[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const restartTimeoutRef = useRef<any>(null);
  const cooldownUntilRef = useRef<number>(0);

  const modeRef = useRef<ModeType>(mode);
  modeRef.current = mode;

  const speechRateRef = useRef<number>(speechRate);
  speechRateRef.current = speechRate;

  const volumeRef = useRef<number>(volume);
  volumeRef.current = volume;

  const lastCalculationRef = useRef<CalculationHistoryItem | null>(lastCalculation);
  lastCalculationRef.current = lastCalculation;

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  // Restart speech recognition safely
  const restartRecognition = useCallback(() => {
    if (!isListeningRef.current || isSpeakingRef.current) return;
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);

    restartTimeoutRef.current = setTimeout(() => {
      if (!isListeningRef.current || isSpeakingRef.current) return;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // already running or transient state
        }
      }
    }, 60);
  }, []);

  // Safe executor: processes number input and speaks result exactly ONCE
  const processNumber = useCallback(
    async (numberInput: number, sourceTranscript: string = '') => {
      const now = Date.now();

      // Guard 1: Feedback loop cooldown (ignore if app is speaking or just finished speaking)
      if (now < cooldownUntilRef.current || isSpeakingRef.current) {
        return;
      }

      // Guard 2: If the detected word matches what the app JUST spoke (e.g. "empat" after 2x2), DROP IT!
      const lowerSource = sourceTranscript.toLowerCase().trim();
      if (lastSpokenResultWordsRef.current.some((w) => lowerSource.includes(w))) {
        return;
      }

      // Guard 3: Prevent rapid repeat of identical number within 1400ms
      if (
        now - lastProcessedTimeRef.current < 1400 &&
        lastProcessedNumRef.current === numberInput
      ) {
        return;
      }

      lastProcessedTimeRef.current = now;
      lastProcessedNumRef.current = numberInput;

      setIsProcessing(true);
      audioEngine.haptic([25, 35]);
      audioEngine.playDetectPing();

      // Calculate strictly input * 2
      const output = formatSpeechOutput(numberInput, modeRef.current);

      // Track spoken words to avoid speaker self-feedback
      const spokenWords = output.words.toLowerCase().split(/\s+/);
      lastSpokenResultWordsRef.current = [
        ...spokenWords,
        String(output.resultNum),
      ];

      const newItem: CalculationHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        input: numberInput,
        result: output.resultNum,
        spokenOutput: output.spokenText,
        timestamp: new Date(),
      };

      setLastCalculation(newItem);
      setHistory((prev) => [newItem, ...prev.slice(0, 19)]);
      setStatusMessage(`${numberInput} × 2 = ${output.resultNum}`);

      setIsProcessing(false);
      setIsSpeaking(true);

      // Lock microphone recognition during speech + 450ms decay
      cooldownUntilRef.current = now + 4000; // temporary high lock, will be reset on speech end

      // Temporarily abort recognition so it doesn't hear device speaker
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      await audioEngine.speak(output.spokenText, {
        rate: speechRateRef.current,
        volume: volumeRef.current,
        onStart: () => {
          setIsSpeaking(true);
        },
        onEnd: () => {
          setIsSpeaking(false);
          // Set cooldown to prevent speaker echo decay
          cooldownUntilRef.current = Date.now() + 450;
          if (isListeningRef.current) {
            setStatusMessage('Mendengarkan suara...');
            restartRecognition();
          }
        },
      });
    },
    [restartRecognition]
  );

  const processNumberRef = useRef(processNumber);
  processNumberRef.current = processNumber;

  // Ultra-Fast VAD Fallback: records short utterance and transcribes via server
  const triggerVadCapture = useCallback(async () => {
    const now = Date.now();
    if (
      isVadBusyRef.current ||
      isSpeakingRef.current ||
      isProcessingRef.current ||
      !isListeningRef.current ||
      now < cooldownUntilRef.current
    ) {
      return;
    }

    isVadBusyRef.current = true;
    try {
      const result = await audioEngine.recordVoiceUtterance({
        silenceThresholdMs: 220,
        maxDurationMs: 1200,
        soundThreshold: 0.06,
      });

      if (isSpeakingRef.current || !isListeningRef.current) {
        return;
      }

      if (result && result.base64) {
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData: result.base64,
            mimeType: result.mimeType,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (isSpeakingRef.current) return;

          let num = data?.number;
          if ((num === null || num === undefined) && data?.raw) {
            num = parseSpokenNumber(data.raw);
          }

          if (typeof num === 'number' && !isNaN(num)) {
            setLastDetectedTranscript(data.raw || String(num));
            processNumberRef.current(num, data.raw || String(num));
          } else if (data?.raw) {
            setLastDetectedTranscript(data.raw);
          }
        }
      }
    } catch (e) {
      console.warn('VAD capture notice:', e);
    } finally {
      isVadBusyRef.current = false;
      if (isListeningRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
        setStatusMessage('Mendengarkan suara...');
      }
    }
  }, []);

  const triggerVadCaptureRef = useRef(triggerVadCapture);
  triggerVadCaptureRef.current = triggerVadCapture;

  // Real-time audio meter and VAD trigger loop
  useEffect(() => {
    let active = true;
    const updateMeter = () => {
      if (!active) return;
      if (isListeningRef.current) {
        const data = audioEngine.getAudioFrequencyData();
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i];
        }
        const avg = data.length > 0 ? sum / data.length : 0;
        const norm = Math.min(1, Math.pow(avg / 110, 1.2));
        setAudioLevel(norm);

        // If sound detected, not busy, and not in cooldown
        if (
          norm > 0.08 &&
          !isVadBusyRef.current &&
          !isSpeakingRef.current &&
          !isProcessingRef.current &&
          Date.now() > cooldownUntilRef.current
        ) {
          triggerVadCaptureRef.current();
        }
      } else {
        setAudioLevel((prev) => Math.max(0, prev * 0.85));
      }
      animFrameRef.current = requestAnimationFrame(updateMeter);
    };

    animFrameRef.current = requestAnimationFrame(updateMeter);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const repeatLastAnswer = useCallback(() => {
    const item = lastCalculationRef.current;
    if (!item) {
      audioEngine.speak('Belum ada perhitungan sebelumnya');
      return;
    }
    audioEngine.playGestureTone('repeat');
    audioEngine.haptic([15, 40]);
    audioEngine.speak(item.spokenOutput, {
      rate: speechRateRef.current,
      volume: volumeRef.current,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  }, []);

  const repeatLastAnswerRef = useRef(repeatLastAnswer);
  repeatLastAnswerRef.current = repeatLastAnswer;

  // Initialize Web Speech Recognition (Engine A) with rapid single-utterance mode
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(true); // VAD engine handles it
      return;
    }

    try {
      const rec = new SpeechRecognition();
      // Using continuous = false allows mobile browsers to return single-word commands in ~150ms!
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'id-ID';
      rec.maxAlternatives = 3;

      rec.onstart = () => {
        setIsListening(true);
        setStatusMessage('Mendengarkan suara...');
      };

      rec.onresult = (event: any) => {
        if (isSpeakingRef.current || Date.now() < cooldownUntilRef.current) return;

        const candidates: string[] = [];
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          for (let j = 0; j < res.length; j++) {
            const tr = res[j]?.transcript?.trim();
            if (tr && !candidates.includes(tr)) {
              candidates.push(tr);
            }
          }
        }

        if (candidates.length === 0) return;

        const primaryText = candidates[0];
        setLastDetectedTranscript(primaryText);

        // Check for repeat voice trigger
        if (/\b(ulang|ulangi|lagi|apa tadi)\b/i.test(primaryText)) {
          repeatLastAnswerRef.current();
          return;
        }

        // Try extracting number
        let foundNumber: number | null = null;
        for (const phrase of candidates) {
          const parsed = parseSpokenNumber(phrase);
          if (parsed !== null) {
            foundNumber = parsed;
            break;
          }
        }

        if (foundNumber !== null) {
          processNumberRef.current(foundNumber, primaryText);
        } else if (primaryText.length > 2) {
          setStatusMessage(`Mendengar: "${primaryText}"`);
        }
      };

      rec.onerror = (e: any) => {
        console.warn('SpeechRecognition notice:', e.error);
        if (isListeningRef.current && !isSpeakingRef.current) {
          restartRecognition();
        }
      };

      rec.onend = () => {
        // In continuous=false mode, it ends after each utterance; restart immediately
        if (isListeningRef.current && !isSpeakingRef.current) {
          restartRecognition();
        }
      };

      recognitionRef.current = rec;
    } catch (e) {
      console.warn('Speech recognition setup warning:', e);
    }

    return () => {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [restartRecognition]);

  // Start continuous listening
  const startListening = async () => {
    await audioEngine.prewarm();
    await audioEngine.setupMicrophoneAnalyser();
    audioEngine.playGestureTone('up');
    audioEngine.haptic(25);

    audioEngine.setupMediaSession(
      () => toggleListening(),
      () => repeatLastAnswer()
    );

    isListeningRef.current = true;
    setIsListening(true);
    setStatusMessage('Mendengarkan suara...');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {
        // already started or not available
      }
    }
  };

  // Stop listening
  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    audioEngine.playGestureTone('down');
    audioEngine.haptic(15);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }
    setStatusMessage('Ketuk logo untuk mendengarkan');
  };

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Speed controls
  const increaseSpeed = () => {
    setSpeechRate((r) => {
      const next = Math.min(1.6, Math.round((r + 0.1) * 10) / 10);
      audioEngine.playGestureTone('up');
      audioEngine.haptic(15);
      return next;
    });
  };

  const decreaseSpeed = () => {
    setSpeechRate((r) => {
      const next = Math.max(0.7, Math.round((r - 0.1) * 10) / 10);
      audioEngine.playGestureTone('down');
      audioEngine.haptic(15);
      return next;
    });
  };

  const toggleMode = () => {
    setMode((m) => {
      const next = m === 'short' ? 'detailed' : 'short';
      audioEngine.playGestureTone('switch');
      audioEngine.haptic(20);
      return next;
    });
  };

  const setVolumeLevel = (newVol: number) => {
    const clamped = Math.max(0.1, Math.min(1.0, newVol));
    setVolume(clamped);
  };

  return {
    isListening,
    isSpeaking,
    isProcessing,
    audioLevel,
    lastCalculation,
    history,
    volume,
    speechRate,
    mode,
    isSupported,
    lastDetectedTranscript,
    statusMessage,
    startListening,
    stopListening,
    toggleListening,
    repeatLastAnswer,
    processNumber,
    increaseSpeed,
    decreaseSpeed,
    toggleMode,
    setVolumeLevel,
  };
}
