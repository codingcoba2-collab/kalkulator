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
  const [speechRate, setSpeechRate] = useState<number>(1.08);
  const [mode, setMode] = useState<ModeType>('short');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [lastDetectedTranscript, setLastDetectedTranscript] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Ketuk untuk mengaktifkan');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const lastProcessedTimeRef = useRef<number>(0);
  const lastProcessedTextRef = useRef<string>('');
  const animFrameRef = useRef<number | null>(null);

  // Keep ref synchronized
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Audio visualizer frequency polling loop
  useEffect(() => {
    let active = true;
    const updateMeter = () => {
      if (!active) return;
      if (isListeningRef.current) {
        const data = audioEngine.getAudioFrequencyData();
        // Compute average frequency power
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i];
        }
        const avg = data.length > 0 ? sum / data.length : 0;
        // Normalize 0..1 with non-linear boost for responsiveness
        const norm = Math.min(1, Math.pow(avg / 120, 1.2));
        setAudioLevel(norm);
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

  // Process numeric input and immediately speak the x2 result
  const processNumber = useCallback(
    async (numberInput: number, sourceTranscript: string = '') => {
      const now = Date.now();
      // Guard against rapid duplicate trigger within 1.2 seconds for identical number
      if (
        now - lastProcessedTimeRef.current < 1200 &&
        lastProcessedTextRef.current === String(numberInput)
      ) {
        return;
      }

      lastProcessedTimeRef.current = now;
      lastProcessedTextRef.current = String(numberInput);

      setIsProcessing(true);
      audioEngine.haptic([20, 40, 20]);
      audioEngine.playDetectPing();

      const output = formatSpeechOutput(numberInput, mode);

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

      // Speak immediately with Indonesian voice
      setIsProcessing(false);
      setIsSpeaking(true);

      await audioEngine.speak(output.spokenText, {
        rate: speechRate,
        volume: volume,
        onStart: () => setIsSpeaking(true),
        onEnd: () => {
          setIsSpeaking(false);
          if (isListeningRef.current) {
            setStatusMessage('Mendengarkan...');
          }
        },
      });
    },
    [mode, speechRate, volume]
  );

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatusMessage('Web Speech API tidak didukung pada browser ini');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'id-ID';
      rec.maxAlternatives = 3;

      rec.onstart = () => {
        setIsListening(true);
        setStatusMessage('Mendengarkan suara...');
      };

      rec.onresult = (event: any) => {
        // If the app is currently speaking its own answer, suppress microphone feedback
        if (isSpeakingRef.current) return;

        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        const trimmed = transcript.trim();
        if (!trimmed) return;

        setLastDetectedTranscript(trimmed);

        // Check if user is asking to repeat: "ulang", "ulangi"
        if (/\b(ulang|ulangi|lagi|apa tadi)\b/i.test(trimmed)) {
          if (lastCalculation) {
            repeatLastAnswer();
            return;
          }
        }

        const parsed = parseSpokenNumber(trimmed);
        if (parsed !== null) {
          processNumber(parsed, trimmed);
        }
      };

      rec.onerror = (e: any) => {
        console.warn('SpeechRecognition error:', e.error);
        if (e.error === 'not-allowed') {
          setIsListening(false);
          setStatusMessage('Izin mikrofon diperlukan');
        } else if (e.error === 'no-speech') {
          // Normal timeout, continue
        }
      };

      rec.onend = () => {
        // If still supposed to be listening (continuous mode), restart gracefully
        if (isListeningRef.current) {
          try {
            rec.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
          setStatusMessage('Mikrofon nonaktif');
        }
      };

      recognitionRef.current = rec;
    } catch (e) {
      console.error('Failed to init speech recognition:', e);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [processNumber, lastCalculation]);

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

    if (recognitionRef.current) {
      try {
        isListeningRef.current = true;
        setIsListening(true);
        recognitionRef.current.start();
      } catch (err) {
        // Recognition might already be started
        console.warn('Recognition start warn:', err);
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
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setStatusMessage('Ketuk untuk mendengarkan');
  };

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Repeat last calculation result aloud
  const repeatLastAnswer = useCallback(() => {
    if (!lastCalculation) {
      audioEngine.speak('Belum ada perhitungan sebelumnya');
      return;
    }
    audioEngine.playGestureTone('repeat');
    audioEngine.haptic([15, 40]);
    audioEngine.speak(lastCalculation.spokenOutput, {
      rate: speechRate,
      volume: volume,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  }, [lastCalculation, speechRate, volume]);

  // Gestures helpers
  const increaseSpeed = () => {
    setSpeechRate((r) => {
      const next = Math.min(1.5, Math.round((r + 0.1) * 10) / 10);
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
