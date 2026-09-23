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

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const findVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Look for id-ID voice first
      const idVoice = voices.find((v) => v.lang.startsWith('id') || v.lang.includes('ID'));
      if (idVoice) {
        this.indonesianVoice = idVoice;
      } else {
        // Fallback to Google / Default clear voice
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

      // Prewarm speech synthesis with a silent/empty utterance
      if ('speechSynthesis' in window && !this.isPrewarmed) {
        const silentUtterance = new SpeechSynthesisUtterance(' ');
        silentUtterance.volume = 0.01;
        silentUtterance.rate = 2.0;
        window.speechSynthesis.speak(silentUtterance);
        this.isPrewarmed = true;
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
      this.keepAliveOsc.frequency.setValueAtTime(20, this.ctx.currentTime); // sub-audible 20Hz
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
        resolve();
        return;
      }

      try {
        // Cancel any pending speech to maintain immediate responsiveness
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';

        if (this.indonesianVoice) {
          utterance.voice = this.indonesianVoice;
        }

        // Tuned for natural, quick and crisp response
        utterance.rate = options.rate ?? 1.08;
        utterance.pitch = options.pitch ?? 1.0;
        utterance.volume = options.volume ?? 1.0;

        utterance.onstart = () => {
          options.onStart?.();
        };

        utterance.onend = () => {
          options.onEnd?.();
          resolve();
        };

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e);
          options.onEnd?.();
          resolve();
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
