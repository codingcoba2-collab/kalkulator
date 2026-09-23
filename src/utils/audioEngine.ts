/**
 * Ultra-Low Latency Web Audio & Speech Engine
 * Designed for immediate audio-first feedback and background persistence
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private keepAliveGain: GainNode | null = null;
  private keepAliveOsc: OscillatorNode | null = null;
  private wakeLock: any = null;
  private indonesianVoice: SpeechSynthesisVoice | null = null;
  private isPrewarmed = false;
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const findVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find((v) => v.lang.startsWith('id') || v.lang.includes('ID'));
      if (idVoice) {
        this.indonesianVoice = idVoice;
      } else {
        this.indonesianVoice = voices.find((v) => v.default) || voices[0] || null;
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
        window.speechSynthesis.resume();
        if (!this.isPrewarmed) {
          const silentUtterance = new SpeechSynthesisUtterance(' ');
          silentUtterance.volume = 0.01;
          silentUtterance.rate = 2.0;
          window.speechSynthesis.speak(silentUtterance);
          this.isPrewarmed = true;
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
      // Extremely low gain - strictly inaudible
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
      // Wake lock might be rejected on battery saver, ignore
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
   * Connect microphone to AnalyserNode for audio visualization
   */
  public async setupMicrophoneAnalyser(): Promise<AnalyserNode | null> {
    if (this.analyser) return this.analyser;

    try {
      await this.prewarm();
      if (!this.ctx) return null;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.micStream = stream;
      const source = this.ctx.createMediaStreamSource(stream);
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      this.analyser = analyser;
      return analyser;
    } catch (err) {
      console.warn('Microphone stream error:', err);
      return null;
    }
  }

  public getAudioFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(32);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
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
      maxDurationMs = 1800,
      silenceThresholdMs = 280,
      soundThreshold = 0.055,
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
            // Speech ended and silence confirmed
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
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.07); // G5
      } else if (type === 'down') {
        osc.frequency.setValueAtTime(783.99, now); // G5
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.07); // C5
      } else if (type === 'switch') {
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(880, now + 0.04); // A5
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
   * Speaks the result with the crispest possible Indonesian voice and minimal delay
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

        utterance.rate = options.rate ?? 1.08;
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

        // Safety watchdog timer to prevent speech engine hanging
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
