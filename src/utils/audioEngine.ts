/**
 * Ultra-Low Latency Web Audio & Speech Engine
 * Designed for immediate audio-first feedback, background persistence,
 * and resilient microphone sensor reading.
 */

export interface MicrophoneStatus {
  hasPermission: boolean;
  isStreaming: boolean;
  errorMessage: string | null;
  sensorLevel: number; // 0 to 1
  decibels: number; // approximate dB
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private micGain: GainNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private keepAliveGain: GainNode | null = null;
  private keepAliveOsc: OscillatorNode | null = null;
  private wakeLock: any = null;
  private indonesianVoice: SpeechSynthesisVoice | null = null;
  private isPrewarmed = false;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private lastMicError: string | null = null;

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const findVoice = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        const idVoice = voices.find((v) => v.lang.startsWith('id') || v.lang.includes('ID'));
        if (idVoice) {
          this.indonesianVoice = idVoice;
        } else {
          this.indonesianVoice = voices.find((v) => v.default) || voices[0] || null;
        }
      } catch (e) {
        console.warn('Voice init warning:', e);
      }
    };

    findVoice();
    window.speechSynthesis.onvoiceschanged = findVoice;
  }

  /**
   * Initializes and un-mutes the AudioContext on first user touch
   */
  public async prewarm(): Promise<boolean> {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // Prewarm speech synthesis
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.resume();
          if (!this.isPrewarmed) {
            const silentUtterance = new SpeechSynthesisUtterance(' ');
            silentUtterance.volume = 0.01;
            silentUtterance.rate = 2.0;
            window.speechSynthesis.speak(silentUtterance);
            this.isPrewarmed = true;
          }
        } catch {
          // ignore
        }
      }

      this.startKeepAlive();
      this.requestWakeLock();
      this.setupMediaSession();
      return true;
    } catch (e) {
      console.warn('Audio prewarm warning:', e);
      return false;
    }
  }

  /**
   * Creates an inaudible audio stream node to keep mobile audio subsystem active in background
   */
  public startKeepAlive() {
    if (!this.ctx || this.keepAliveGain) return;
    try {
      this.keepAliveOsc = this.ctx.createOscillator();
      this.keepAliveGain = this.ctx.createGain();
      this.keepAliveGain.gain.setValueAtTime(0.00001, this.ctx.currentTime);
      this.keepAliveOsc.frequency.setValueAtTime(20, this.ctx.currentTime);
      this.keepAliveOsc.connect(this.keepAliveGain);
      this.keepAliveGain.connect(this.ctx.destination);
      this.keepAliveOsc.start();
    } catch (e) {
      console.warn('Keepalive audio warning:', e);
    }
  }

  /**
   * Screen WakeLock keeps phone display awake while in hand
   */
  public async requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !this.wakeLock) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      }
    } catch {
      // Wake lock might be rejected on battery saver
    }
  }

  public releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
        this.wakeLock = null;
      } catch {
        // ignore
      }
    }
  }

  /**
   * Set up Mobile Lock Screen / Media Controls integration
   */
  public setupMediaSession(onToggleListen?: () => void, onRepeat?: () => void) {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Dashera Voice x2 Multiplier',
        artist: 'Audio Murni Instan',
        album: 'Dashera Audio Engine',
        artwork: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/dashera-logo.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.playbackState = 'playing';

      if (onToggleListen) {
        navigator.mediaSession.setActionHandler('play', onToggleListen);
        navigator.mediaSession.setActionHandler('pause', onToggleListen);
      }
      if (onRepeat) {
        navigator.mediaSession.setActionHandler('nexttrack', onRepeat);
      }
    } catch (e) {
      console.warn('MediaSession warning:', e);
    }
  }

  /**
   * Connects microphone to AnalyserNode with hardware gain booster
   * Solves: sensor suara mikrofon tidak terbaca / volume mic HP terlalu kecil
   */
  public async setupMicrophoneAnalyser(): Promise<{ analyser: AnalyserNode | null; error: string | null }> {
    if (this.analyser && this.micStream && this.micStream.active) {
      const activeTracks = this.micStream.getAudioTracks().filter((t) => t.readyState === 'live');
      if (activeTracks.length > 0) {
        return { analyser: this.analyser, error: null };
      }
    }

    try {
      await this.prewarm();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.lastMicError = 'Peramban tidak mendukung akses mikrofon (MediaDevices API tidak tersedia).';
        return { analyser: null, error: this.lastMicError };
      }

      // Explicit audio capture constraints for crystal clear voice detection
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.micStream = stream;
      this.lastMicError = null;

      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // Cleanup old source if any
      if (this.micSource) {
        try {
          this.micSource.disconnect();
        } catch {
          // ignore
        }
      }

      const source = this.ctx.createMediaStreamSource(stream);
      this.micSource = source;

      // Add high sensitivity gain booster so quiet phone mics are clearly detected
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(2.2, this.ctx.currentTime);
      this.micGain = gain;

      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 128; // Responsive 64 frequency bins
      analyser.smoothingTimeConstant = 0.75;

      source.connect(gain);
      gain.connect(analyser);

      this.analyser = analyser;
      return { analyser, error: null };
    } catch (err: any) {
      let friendlyMessage = 'Gagal mengakses mikrofon.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        friendlyMessage = 'Izin mikrofon belum diberikan. Harap aktifkan izin mikrofon di setelan browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyMessage = 'Sensor mikrofon fisik tidak ditemukan pada perangkat ini.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        friendlyMessage = 'Sensor mikrofon sedang dipakai oleh aplikasi lain atau terkunci.';
      } else if (err.name === 'SecurityError') {
        friendlyMessage = 'Akses mikrofon dibatasi oleh peramban.';
      }
      this.lastMicError = friendlyMessage;
      console.warn('setupMicrophoneAnalyser error:', err);
      return { analyser: null, error: friendlyMessage };
    }
  }

  /**
   * Explicitly prompts user for microphone permission
   */
  public async requestMicrophonePermission(): Promise<{ granted: boolean; error: string | null }> {
    const res = await this.setupMicrophoneAnalyser();
    return {
      granted: Boolean(res.analyser),
      error: res.error,
    };
  }

  /**
   * Reads raw frequency data from the microphone sensor
   */
  public getAudioFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(64);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  /**
   * Computes normalized sound level (0 to 1) and approximate decibels (-60 to 0 dB)
   */
  public getMicrophoneStatus(): MicrophoneStatus {
    const isStreaming = Boolean(
      this.micStream &&
      this.micStream.active &&
      this.micStream.getAudioTracks().some((t) => t.readyState === 'live' && t.enabled)
    );

    if (!isStreaming || !this.analyser) {
      return {
        hasPermission: !this.lastMicError,
        isStreaming: false,
        errorMessage: this.lastMicError,
        sensorLevel: 0,
        decibels: -60,
      };
    }

    const freqData = this.getAudioFrequencyData();
    let sum = 0;
    for (let i = 0; i < freqData.length; i++) {
      sum += freqData[i];
    }
    const avg = freqData.length > 0 ? sum / freqData.length : 0;
    // Map avg (0-255) to 0-1 with sensitive gamma
    const sensorLevel = Math.min(1, Math.pow(avg / 100, 1.15));
    const decibels = avg > 0 ? Math.round(20 * Math.log10(avg / 255)) : -60;

    return {
      hasPermission: true,
      isStreaming: true,
      errorMessage: null,
      sensorLevel,
      decibels,
    };
  }

  public getMicrophoneStream(): MediaStream | null {
    return this.micStream;
  }

  /**
   * Records a short voice utterance with automatic silence detection
   */
  public recordVoiceUtterance(options: {
    maxDurationMs?: number;
    silenceThresholdMs?: number;
    soundThreshold?: number;
  } = {}): Promise<{ base64: string; mimeType: string } | null> {
    const {
      maxDurationMs = 2500,
      silenceThresholdMs = 380,
      soundThreshold = 0.05,
    } = options;

    return new Promise((resolve) => {
      if (!this.micStream || typeof MediaRecorder === 'undefined') {
        resolve(null);
        return;
      }

      try {
        let mimeType = '';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }

        const recorderOptions = mimeType ? { mimeType } : undefined;
        const recorder = new MediaRecorder(this.micStream, recorderOptions);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        let resolved = false;
        let pollTimer: any = null;
        let maxTimeout: any = null;

        const finish = () => {
          if (resolved) return;
          resolved = true;
          if (pollTimer) clearInterval(pollTimer);
          if (maxTimeout) clearTimeout(maxTimeout);

          try {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          } catch {
            // ignore
          }
        };

        recorder.onstop = () => {
          if (chunks.length === 0) {
            resolve(null);
            return;
          }
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const resultStr = reader.result as string;
            const base64 = resultStr.split(',')[1];
            resolve({
              base64,
              mimeType: blob.type || 'audio/webm',
            });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        };

        recorder.start(100);

        let hasSpoken = false;
        let lastSoundTime = Date.now();

        // Monitor audio levels via analyser for speech & silence
        pollTimer = setInterval(() => {
          const freqData = this.getAudioFrequencyData();
          let sum = 0;
          for (let i = 0; i < freqData.length; i++) {
            sum += freqData[i];
          }
          const avg = freqData.length > 0 ? sum / freqData.length : 0;
          const level = avg / 255;

          const now = Date.now();
          if (level > soundThreshold) {
            hasSpoken = true;
            lastSoundTime = now;
          } else if (hasSpoken && now - lastSoundTime > silenceThresholdMs) {
            finish();
          }
        }, 35);

        maxTimeout = setTimeout(finish, maxDurationMs);
      } catch (err) {
        console.warn('recordVoiceUtterance error:', err);
        resolve(null);
      }
    });
  }

  /**
   * Instant low-latency recognition chime (<5ms latency)
   */
  public playDetectPing() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08); // A5 -> D6

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // ignore
    }
  }

  /**
   * Sound effect for gesture feedback (swipe up, down, switch)
   */
  public playGestureTone(type: 'up' | 'down' | 'switch' | 'tap' | 'repeat') {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      if (type === 'up') {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.07);
      } else if (type === 'down') {
        osc.frequency.setValueAtTime(783.99, now);
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.07);
      } else if (type === 'switch') {
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(880, now + 0.04);
      } else if (type === 'repeat') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.05);
      } else {
        osc.frequency.setValueAtTime(330, now);
      }

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // ignore
    }
  }

  /**
   * Speaks the result with Indonesian voice and minimal delay
   */
  public speak(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      volume?: number;
      onStart?: () => void;
      onEnd?: () => void;
    } = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        options.onEnd?.();
        resolve();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(text);
        this.activeUtterance = utterance; // Prevent GC collection
        utterance.lang = 'id-ID';

        if (this.indonesianVoice) {
          utterance.voice = this.indonesianVoice;
        }

        utterance.rate = options.rate ?? 1.12;
        utterance.pitch = options.pitch ?? 1.0;
        utterance.volume = options.volume ?? 1.0;

        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          this.activeUtterance = null;
          options.onEnd?.();
          resolve();
        };

        const maxDuration = Math.max(1600, text.length * 180);
        const watchdog = setTimeout(() => {
          finish();
        }, maxDuration);

        utterance.onstart = () => {
          options.onStart?.();
        };

        utterance.onend = () => {
          clearTimeout(watchdog);
          finish();
        };

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e);
          clearTimeout(watchdog);
          finish();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis exception:', err);
        options.onEnd?.();
        resolve();
      }
    });
  }

  /**
   * Stop any current speech
   */
  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  /**
   * Trigger subtle physical haptic feedback on supported mobile devices
   */
  public haptic(pattern: number | number[] = 15) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  }
}

export const audioEngine = new AudioEngine();
