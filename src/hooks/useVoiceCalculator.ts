import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { parseSpokenNumber, formatSpeechOutput } from '../utils/numberConverter';

export interface CalculationHistoryItem {
  id: string;
  input: number;
  result: number;
  spokenOutput: string;
  timestamp: Date;
  rawTranscript?: string;
}

export type ModeType = 'short' | 'detailed'; // short: "Lima puluh", detailed: "Dua puluh lima dikali dua sama dengan lima puluh"

export function useVoiceCalculator() {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastCalculation, setLastCalculation] = useState<CalculationHistoryItem | null>(null);
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
  const [volume, setVolume] = useState<number>(1.0);
  const [speechRate, setSpeechRate] = useState<number>(1.12);
  const [mode, setMode] = useState<ModeType>('short');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [lastDetectedTranscript, setLastDetectedTranscript] = useState<string>('');
  const [lastDetectedNumber, setLastDetectedNumber] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Ketuk logo untuk mendengarkan');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [decibels, setDecibels] = useState<number>(-60);
  const [micSensorError, setMicSensorError] = useState<string | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);

  // Persistent refs
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
  const interimDebounceRef = useRef<any>(null);
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
    }, 80);
  }, []);

  // Safe executor: processes number input, shows pop-up, and speaks result
  const processNumber = useCallback(
    async (numberInput: number, sourceTranscript: string = '') => {
      if (interimDebounceRef.current) {
        clearTimeout(interimDebounceRef.current);
        interimDebounceRef.current = null;
      }

      const now = Date.now();

      // Guard 1: Echo cooldown
      if (now < cooldownUntilRef.current || isSpeakingRef.current) {
        return;
      }

      // Guard 2: Filter words spoken by app
      const lowerSource = sourceTranscript.toLowerCase().trim();
      if (lastSpokenResultWordsRef.current.some((w) => w.length > 2 && lowerSource.includes(w))) {
        return;
      }

      // Guard 3: Prevent duplicate triggers of identical number within 1400ms
      if (
        now - lastProcessedTimeRef.current < 1400 &&
        lastProcessedNumRef.current === numberInput
      ) {
        return;
      }

      lastProcessedTimeRef.current = now;
      lastProcessedNumRef.current = numberInput;

      setIsProcessing(true);
      setLastDetectedNumber(numberInput);
      setLastDetectedTranscript(sourceTranscript || String(numberInput));
      audioEngine.haptic([25, 40]);
      audioEngine.playDetectPing();

      // Hitung hasil perkalian 2
      const output = formatSpeechOutput(numberInput, modeRef.current);

      const spokenWords = output.words.toLowerCase().split(/\s+/).filter(Boolean);
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
        rawTranscript: sourceTranscript,
      };

      setLastCalculation(newItem);
      setHistory((prev) => [newItem, ...prev.slice(0, 19)]);
      setStatusMessage(`${numberInput} × 2 = ${output.resultNum}`);

      // BUKA POP-UP HASIL SECARA INSTAN!
      setIsResultModalOpen(true);

      setIsProcessing(false);
      setIsSpeaking(true);

      cooldownUntilRef.current = now + 4000;

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

  // Ultra-Fast VAD Fallback: records utterance and transcribes via server
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
        silenceThresholdMs: 380,
        maxDurationMs: 2500,
        soundThreshold: 0.05,
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

  // Real-time audio meter & sensor diagnostic loop
  useEffect(() => {
    let active = true;
    const updateMeter = () => {
      if (!active) return;
      if (isListeningRef.current) {
        const status = audioEngine.getMicrophoneStatus();
        setAudioLevel(status.sensorLevel);
        setDecibels(status.decibels);

        if (status.errorMessage) {
          setMicSensorError(status.errorMessage);
        } else {
          setMicSensorError(null);
        }

        // Jika suara terdengar cukup kuat dan tidak sibuk
        if (
          status.sensorLevel > 0.08 &&
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
    setIsResultModalOpen(true);
    audioEngine.speak(item.spokenOutput, {
      rate: speechRateRef.current,
      volume: volumeRef.current,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  }, []);

  const repeatLastAnswerRef = useRef(repeatLastAnswer);
  repeatLastAnswerRef.current = repeatLastAnswer;

  // Initialize Web Speech Recognition with error resilience
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(true);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'id-ID';
      rec.maxAlternatives = 3;

      rec.onstart = () => {
        setIsListening(true);
        setMicSensorError(null);
        setStatusMessage('Mendengarkan suara...');
      };

      rec.onresult = (event: any) => {
        if (isSpeakingRef.current || Date.now() < cooldownUntilRef.current) return;

        const results = event.results;
        const lastResult = results[results.length - 1];
        const isFinal = Boolean(lastResult?.isFinal);

        const candidates: string[] = [];
        for (let i = 0; i < results.length; i++) {
          const res = results[i];
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

        // Periksa apakah perintah pengulangan suara
        if (/\b(ulang|ulangi|lagi|apa tadi)\b/i.test(primaryText)) {
          if (interimDebounceRef.current) clearTimeout(interimDebounceRef.current);
          repeatLastAnswerRef.current();
          return;
        }

        // Ekstraksi angka dan tulis menjadi angka
        let foundNumber: number | null = null;
        for (const phrase of candidates) {
          const parsed = parseSpokenNumber(phrase);
          if (parsed !== null) {
            foundNumber = parsed;
            break;
          }
        }

        if (foundNumber !== null) {
          setLastDetectedNumber(foundNumber);

          if (isFinal) {
            if (interimDebounceRef.current) {
              clearTimeout(interimDebounceRef.current);
              interimDebounceRef.current = null;
            }
            processNumberRef.current(foundNumber, primaryText);
          } else {
            if (interimDebounceRef.current) {
              clearTimeout(interimDebounceRef.current);
            }
            const capturedNum = foundNumber;
            const capturedText = primaryText;
            interimDebounceRef.current = setTimeout(() => {
              if (
                !isSpeakingRef.current &&
                isListeningRef.current &&
                Date.now() > cooldownUntilRef.current
              ) {
                processNumberRef.current(capturedNum, capturedText);
              }
            }, 320);
          }
        } else if (primaryText.length > 2) {
          setStatusMessage(`Mendengar: "${primaryText}"`);
        }
      };

      rec.onerror = (e: any) => {
        const errType = e?.error;
        console.warn('SpeechRecognition notice:', errType);

        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          setMicSensorError('Izin mikrofon ditolak oleh peramban. Silakan aktifkan mikrofon.');
          setIsListening(false);
          isListeningRef.current = false;
          setStatusMessage('Izin mikrofon diperlukan');
          return;
        }

        if (errType === 'audio-capture') {
          setMicSensorError('Sensor mikrofon tidak terbaca atau sedang digunakan.');
          setStatusMessage('Sensor mic tidak terbaca');
        }

        // no-speech or network: keep listening smoothly
        if (isListeningRef.current && !isSpeakingRef.current) {
          restartRecognition();
        }
      };

      rec.onend = () => {
        if (isListeningRef.current && !isSpeakingRef.current) {
          restartRecognition();
        }
      };

      recognitionRef.current = rec;
    } catch (e) {
      console.warn('Speech recognition setup warning:', e);
    }

    return () => {
      if (interimDebounceRef.current) clearTimeout(interimDebounceRef.current);
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

  // Start continuous listening with microphone sensor check
  const startListening = async () => {
    setMicSensorError(null);
    await audioEngine.prewarm();

    const { analyser, error } = await audioEngine.setupMicrophoneAnalyser();
    if (error) {
      setMicSensorError(error);
      setStatusMessage('Sensor mikrofon bermasalah');
    }

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
    if (interimDebounceRef.current) {
      clearTimeout(interimDebounceRef.current);
      interimDebounceRef.current = null;
    }
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

  const closeResultModal = () => {
    setIsResultModalOpen(false);
  };

  const openResultModal = () => {
    if (lastCalculation) {
      setIsResultModalOpen(true);
    }
  };

  return {
    isListening,
    isSpeaking,
    isProcessing,
    audioLevel,
    decibels,
    micSensorError,
    lastCalculation,
    history,
    volume,
    speechRate,
    mode,
    isSupported,
    lastDetectedTranscript,
    lastDetectedNumber,
    statusMessage,
    isResultModalOpen,
    startListening,
    stopListening,
    toggleListening,
    repeatLastAnswer,
    processNumber,
    increaseSpeed,
    decreaseSpeed,
    toggleMode,
    setVolumeLevel,
    closeResultModal,
    openResultModal,
  };
}
