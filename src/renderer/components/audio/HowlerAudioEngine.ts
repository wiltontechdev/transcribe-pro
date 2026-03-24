// HowlerAudioEngine.ts - Stable audio engine for Electron
// Real-time pitch/speed control with smooth playback transitions

import { Howl } from 'howler';
import * as Tone from 'tone';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { useAppStore } from '../../store/store';
import { getDefaultZoomLevel } from '../../utils/defaultZoom';

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

const PITCH_ENABLED_IN_HOWLER = false;
const ENABLE_FFMPEG_PITCH_FALLBACK = false;
const PLAYBACK_DEBUG = true;

// Electron: html5: true avoids blank screen. Pitch via Tone.PitchShift routed from HTML5 audio element.

// FFmpeg WASM for waveform only
let globalFFmpeg: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<void> | null = null;
let ffmpegLoaded = false;

async function ensureFFmpegLoaded(): Promise<FFmpeg | null> {
  if (globalFFmpeg && ffmpegLoaded) return globalFFmpeg;
  if (ffmpegLoadPromise) {
    await ffmpegLoadPromise;
    return globalFFmpeg;
  }
  ffmpegLoadPromise = (async () => {
    try {
      globalFFmpeg = new FFmpeg();
      await globalFFmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
      });
      ffmpegLoaded = true;
    } catch (e) {
      globalFFmpeg = null;
      ffmpegLoaded = false;
      ffmpegLoadPromise = null;
    }
  })();
  await ffmpegLoadPromise;
  return globalFFmpeg;
}

if (typeof window !== 'undefined' && isElectron) {
  void ensureFFmpegLoaded();
}

// Event emitter for pitch processing status
type PitchStatusCallback = (status: { isProcessing: boolean; targetPitch: number; progress: number }) => void;
const pitchStatusListeners: Set<PitchStatusCallback> = new Set();

export function onPitchStatus(callback: PitchStatusCallback): () => void {
  pitchStatusListeners.add(callback);
  return () => pitchStatusListeners.delete(callback);
}

function emitPitchStatus(status: { isProcessing: boolean; targetPitch: number; progress: number }): void {
  pitchStatusListeners.forEach(cb => cb(status));
}

/**
 * HowlerAudioEngine - Real-time pitch/speed control with smooth transitions
 */
export class HowlerAudioEngine {
  private howl: Howl | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private timeUpdateInterval: number | null = null;
  private currentSoundId: number | null = null;
  
  // Pitch processing state
  private originalTempPath: string | null = null;
  /** Electron: promise that resolves when temp file is written (deferred so load is as fast as web). */
  private originalTempPathPromise: Promise<string | null> | null = null;
  private originalDataArray: number[] = [];
  private originalBlobUrl: string | null = null;
  private currentPitchedBlobUrl: string | null = null;
  private currentPitchedFilePath: string | null = null; // Track file path for cleanup
  
  private currentPitch: number = 0;
  private targetPitch: number = 0;
  private isProcessingPitch: boolean = false;
  private pitchProcessingAborted: boolean = false;
  
  private currentSpeed: number = 1.0; // Playback speed (rate)
  private targetSpeed: number = 1.0;
  private isProcessingSpeed: boolean = false;
  private speedProcessingAborted: boolean = false;
  private currentSpeededBlobUrl: string | null = null;
  private currentSpeededFilePath: string | null = null;
  
  private duration: number = 0; // Original file duration
  private originalDuration: number = 0; // Store original duration for speed calculations

  // Loop state tracking
  private loopStart: number | null = null;
  private loopEnd: number | null = null;
  private isLooping: boolean = false;
  private isHandlingLoopJump: boolean = false;

  // html5 mode: Route HTML5 audio through Tone.PitchShift (rate() doesn't work in html5)
  private tonePitchShift: Tone.PitchShift | null = null;
  private mediaElementSource: MediaElementAudioSourceNode | null = null;

  // Pitch cache for faster switching
  private pitchCache: Map<number, { blobUrl: string; filePath: string }> = new Map();
  private speedCache: Map<number, { blobUrl: string; filePath: string }> = new Map();

  // Throttle playback time store updates to reduce re-renders
  private lastReportedTime: number = -1;
  private static readonly TIME_UPDATE_INTERVAL_MS = 150;   // ~6.7/sec (snappier Electron)
  private static readonly TIME_UPDATE_MIN_DELTA = 0.1;     // skip if change < 100ms

  private static readonly PITCH_EPSILON = 0.005;
  // Short fades - prevent clicks while keeping response snappy.
  private static readonly FADE_DURATION_MS = 80;
  private static readonly SEEK_FADE_OUT_MS = 30;
  private static readonly SEEK_FADE_IN_MS = 60;
  private fadeRampId: number = 0;  // Cancel previous fade when new action starts
  private seekOperationToken: number = 0; // Cancel stale seek fade/seek sequences

  constructor() {
    // Engine initialized
  }

  private debugLog(event: string, payload?: Record<string, unknown>): void {
    if (!PLAYBACK_DEBUG) return;
    console.debug('[PlaybackDebug][Howler]', event, payload ?? {});
  }

  public isFormatSupported(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'webm'].includes(ext || '');
  }

  private async cleanup(): Promise<void> {
    // Cleanup temp files
    if (isElectron && window.electronAPI?.cleanupTempFile) {
      if (this.originalTempPath) {
        await window.electronAPI.cleanupTempFile(this.originalTempPath).catch(() => {});
      }
      if (this.currentPitchedFilePath) {
        await window.electronAPI.cleanupTempFile(this.currentPitchedFilePath).catch(() => {});
      }
      if (this.currentSpeededFilePath) {
        await window.electronAPI.cleanupTempFile(this.currentSpeededFilePath).catch(() => {});
      }
    }
    if (this.originalBlobUrl) URL.revokeObjectURL(this.originalBlobUrl);
    if (this.currentSpeededBlobUrl) URL.revokeObjectURL(this.currentSpeededBlobUrl);
    
    this.originalTempPath = null;
    this.originalTempPathPromise = null;
    this.originalBlobUrl = null;
    this.currentPitchedBlobUrl = null;
    this.currentPitchedFilePath = null;
    this.currentSpeededBlobUrl = null;
    this.currentSpeededFilePath = null;
  }

  private unloadCurrentAudio(): void {
    this.stopTimeUpdate();
    this.disposePitchShiftRouting();
    if (this.howl) {
      this.howl.stop();
      this.howl.unload();
      this.howl = null;
    }
    this.currentSoundId = null;
    this.audioBuffer = null;
    this.duration = 0;
    
    // Reset loop state when unloading audio
    this.isLooping = false;
    this.loopStart = null;
    this.loopEnd = null;
  }

  public async loadAudioFile(file: File): Promise<void> {

    this.unloadCurrentAudio();
    await this.cleanup();
    this.currentPitch = 0;
    this.targetPitch = 0;
    this.currentSpeed = 1.0;
    this.targetSpeed = 1.0;
    this.originalDataArray = [];
    this.isProcessingPitch = false;
    this.isProcessingSpeed = false;

    try {
      useAppStore.getState().setAudioFile(file);

      // Read file
      const arrayBuffer = await file.arrayBuffer();
      this.originalDataArray = Array.from(new Uint8Array(arrayBuffer));

      // Create blob URL for original
      const originalBlob = new Blob([new Uint8Array(this.originalDataArray)], { type: 'audio/mpeg' });
      this.originalBlobUrl = URL.createObjectURL(originalBlob);

      // Load Howler first
      await this.loadHowlerFromUrl(this.originalBlobUrl);

      // Wait for waveform decode before showing UI - match web (everything ready before main window)
      await this.decodeWaveformAndSetBuffer(file.name, this.duration);

      // Electron: save temp file in background for pitch/speed processing (don't block load)
      if (isElectron && window.electronAPI?.saveTempAudio) {
        const data = this.originalDataArray;
        const name = file.name;
        this.originalTempPathPromise = (async () => {
          try {
            this.originalTempPath = await window.electronAPI!.saveTempAudio(data, name);
            return this.originalTempPath;
          } catch {
            return null;
          }
        })();
      }

    } catch (error) {
      // On failure, clear loading state so UI can recover.
      useAppStore.getState().setIsLoading(false);
      this.unloadCurrentAudio();
      throw error;
    }
  }

  private async loadHowlerFromUrl(url: string, preserveState?: { time: number; playing: boolean }): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);

      const newHowl = new Howl({
        src: [url],
        format: ['mp3'],
        // html5: true avoids blank screen in Electron. Pitch via Tone.PitchShift (rate() doesn't work in html5)
        html5: true,
        preload: true,
          onload: () => {
            clearTimeout(timeout);
            this.debugLog('onload', { preserveState: !!preserveState });
          
          // Store old howl reference
          const oldHowl = this.howl;
          const oldSoundId = this.currentSoundId;
          
          // Set new howl
          this.howl = newHowl;
          const fileDuration = newHowl.duration();
          this.originalDuration = fileDuration; // Store original duration
          this.duration = fileDuration; // Duration always stays as original (never changes with speed)
          
          // Update store with original duration (duration never changes with speed)
          useAppStore.getState().setDuration(this.duration);
          
          // Route through Tone.PitchShift in Electron for real-time pitch/speed updates.
          if (PITCH_ENABLED_IN_HOWLER) {
            const storedPitch = useAppStore.getState().globalControls.pitch;
            if (storedPitch !== undefined) this.currentPitch = storedPitch;
            this.setupPitchShiftRouting(newHowl);
          }
          
          // If preserving state, seek and play
          if (preserveState) {
            // preserveState.time is the original timeline time (not affected by speed)
            const seekTime = Math.min(preserveState.time, this.duration);
            newHowl.seek(seekTime);
            
              if (preserveState.playing) {
                this.currentSoundId = newHowl.play() as number;
                this.applySpeedToHtml5Element();
                this.startTimeUpdate();
              }
          }
          
          // Now stop old howl (after new one is playing)
          if (oldHowl) {
            if (oldSoundId !== null) oldHowl.stop(oldSoundId);
            oldHowl.unload();
          }
          
          // Update store only on initial load (not on pitch switch)
          // Do NOT call setAudioReadyForPlayback - we wait for waveform before showing UI
          if (!preserveState) {
            const DEFAULT_ZOOM = getDefaultZoomLevel();
            useAppStore.getState().setDuration(this.duration);
            useAppStore.getState().setViewport(0, this.duration / DEFAULT_ZOOM);
            useAppStore.getState().setZoomLevel(DEFAULT_ZOOM);
            
            // Initialize speed from store
            const storedSpeed = useAppStore.getState().globalControls.playbackRate;
            if (storedSpeed && storedSpeed !== 1.0) {
              this.setSpeed(storedSpeed);
            }
            
            // Initialize pitch from store (routing already set up above if needed)
            if (PITCH_ENABLED_IN_HOWLER) {
              const storedPitchInit = useAppStore.getState().globalControls.pitch;
              if (storedPitchInit !== undefined) {
                this.currentPitch = storedPitchInit;
              }
              this.applyPitchToTone();
            }
          } else if (PITCH_ENABLED_IN_HOWLER) {
            this.applyPitchToTone();
          }
          
            resolve();
          },
        onloaderror: (_, err) => {
            clearTimeout(timeout);
          this.debugLog('onloaderror', { error: String(err) });
          newHowl.unload();
          reject(new Error(`Load error: ${err}`));
          },
          onplay: (id) => {
            this.currentSoundId = typeof id === 'number' ? id : this.currentSoundId;
            this.debugLog('onplay', {
              id: this.currentSoundId,
              currentTime: this.getCurrentTime(),
              muted: useAppStore.getState().globalControls.isMuted,
              volumeDb: useAppStore.getState().globalControls.volume,
            });
          },
          onplayerror: (id, error) => {
            this.debugLog('onplayerror', { id, error: String(error) });
            this.currentSoundId = null;
            this.stopTimeUpdate();
            useAppStore.getState().setIsPlaying(false);
          },
          onpause: (id) => {
            this.debugLog('onpause', { id });
          },
          onstop: (id) => {
            this.debugLog('onstop', { id });
          },
          onend: () => {
            this.debugLog('onend');
            this.stopTimeUpdate();
            useAppStore.getState().setIsPlaying(false);
          useAppStore.getState().setCurrentTime(this.duration);
          }
        });
      });
  }

  /**
   * Route Howler's HTML5 audio element through Tone.PitchShift.
   * rate() doesn't work in html5 mode - this gives us pitch control.
   */
  private setupPitchShiftRouting(howl: Howl): void {
    this.disposePitchShiftRouting();
    let localSource: MediaElementAudioSourceNode | null = null;
    let ctx: AudioContext | null = null;
    try {
      const howlAny = howl as any;
      const sounds = howlAny._sounds;
      if (!sounds?.length) return;
      const sound = sounds[0];
      const audioEl = sound?._node;
      if (!audioEl || !(audioEl instanceof HTMLAudioElement)) return;

      const Howler = (window as any).Howler;
      if (!Howler?.ctx) return;

      ctx = Howler.ctx as AudioContext;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      Tone.setContext(ctx);

      localSource = ctx.createMediaElementSource(audioEl);
      const pitchShift = new Tone.PitchShift({
        pitch: this.currentPitch,
        windowSize: 0.045,
        delayTime: 0,
        feedback: 0,
      });
      localSource.connect(pitchShift.input as unknown as AudioNode);
      (pitchShift as any).connect(ctx.destination);
      this.mediaElementSource = localSource;
      this.tonePitchShift = pitchShift;
      this.debugLog('pitch-routing-ready', { pitch: this.currentPitch });
    } catch (e) {
      this.debugLog('pitch-routing-failed', { error: e instanceof Error ? e.message : String(e) });
      // Fallback path: keep direct audible output even if Tone.PitchShift init fails.
      if (localSource && ctx) {
        try {
          localSource.connect(ctx.destination);
          this.mediaElementSource = localSource;
          this.tonePitchShift = null;
          this.debugLog('pitch-routing-fallback-direct-output');
          return;
        } catch (_) {}
      }
      this.disposePitchShiftRouting();
    }
  }

  private disposePitchShiftRouting(): void {
    try {
      if (this.tonePitchShift) {
        this.tonePitchShift.disconnect();
        this.tonePitchShift.dispose();
        this.tonePitchShift = null;
      }
      if (this.mediaElementSource) {
        this.mediaElementSource.disconnect();
      }
      this.mediaElementSource = null;
    } catch (_) {}
  }

  /** Pitch from Tone; compensation: playbackRate changes speed+pitch, so Tone = userPitch - pitchFromSpeed */
  private applyPitchToTone(): void {
    if (this.tonePitchShift) {
      const pitchFromSpeed = this.currentSpeed !== 1 ? 12 * Math.log2(this.currentSpeed) : 0;
      const effectivePitch = this.currentPitch - pitchFromSpeed;
      if (Math.abs(effectivePitch) < HowlerAudioEngine.PITCH_EPSILON) {
        this.tonePitchShift.wet.value = 0;
        this.tonePitchShift.pitch = 0;
      } else {
        this.tonePitchShift.wet.value = 1;
        this.tonePitchShift.pitch = effectivePitch;
      }
    }
  }

  /** Apply speed to HTML5 element (playbackRate changes speed; pitch compensated in Tone) */
  private applySpeedToHtml5Element(): void {
    if (!this.howl) return;
    const howlAny = this.howl as any;
    const sounds = howlAny._sounds;
    if (!sounds?.length) return;
    for (const s of sounds) {
      if (s?._node && s._node instanceof HTMLAudioElement) {
        s._node.playbackRate = this.currentSpeed;
      }
    }
  }

  /** Clamp rate to safe range - prevents distortion from extreme values */
  private clampRate(rate: number): number {
    return Math.max(0.25, Math.min(4.0, Math.round(rate * 100) / 100));
  }

  /** Get effective playback rate (pitch * speed) clamped to prevent distortion */
  private getEffectiveRate(speedOverride?: number): number {
    const speed = speedOverride ?? this.currentSpeed;
    const pitchRate = Math.abs(this.currentPitch) < HowlerAudioEngine.PITCH_EPSILON ? 1 : Math.pow(2, this.currentPitch / 12);
    return this.clampRate(pitchRate * speed);
  }

  /**
   * Set pitch in semitones (range: -2 to +2, precision: 0.01).
   * Electron path is currently disabled by request (kept for future re-enable).
   */
  public setPitch(semitones: number): void {
    // Pitch control is temporarily disabled in Electron by request.
    if (isElectron && !PITCH_ENABLED_IN_HOWLER) {
      this.targetPitch = 0;
      this.currentPitch = 0;
      useAppStore.getState().setPitch(0);
      emitPitchStatus({ isProcessing: false, targetPitch: 0, progress: 100 });
      this.debugLog('pitch-disabled-electron', { requestedSemitones: semitones });
      return;
    }

    const targetPitch = Math.max(-2, Math.min(2, Math.round(semitones * 100) / 100));
    useAppStore.getState().setPitch(targetPitch);
    this.targetPitch = targetPitch;

    // Keep FFmpeg conversion path as dormant fallback (disabled by default).
    if (!PITCH_ENABLED_IN_HOWLER && ENABLE_FFMPEG_PITCH_FALLBACK && isElectron && window.electronAPI?.pitchShiftFile) {
      void this.processPitchChange(targetPitch);
      return;
    }

    if (Math.abs(targetPitch - this.currentPitch) < HowlerAudioEngine.PITCH_EPSILON) {
      emitPitchStatus({ isProcessing: false, targetPitch, progress: 100 });
      return;
    }

    this.currentPitch = targetPitch;

    if (this.howl) {
      if (PITCH_ENABLED_IN_HOWLER && !this.tonePitchShift) {
        this.setupPitchShiftRouting(this.howl);
      }
      if (this.tonePitchShift) {
        this.applyPitchToTone();
      }
      this.applySpeedToHtml5Element();
      if (!PITCH_ENABLED_IN_HOWLER && this.currentSoundId !== null && this.getEffectiveRate() !== 1.0) {
        this.howl.rate(this.getEffectiveRate(), this.currentSoundId);
      }
    }
    emitPitchStatus({ isProcessing: false, targetPitch, progress: 100 });
  }
  
  /**
   * FFmpeg fallback pitch conversion path (kept for optional future use).
   */
  private async processPitchChange(targetPitch: number): Promise<void> {
    // If already processing, abort current and start new
    if (this.isProcessingPitch) {
      this.pitchProcessingAborted = true;
      // Wait a bit for current process to notice abort
      await new Promise(r => setTimeout(r, 100));
    }

    this.isProcessingPitch = true;
    this.pitchProcessingAborted = false;
    
    emitPitchStatus({ isProcessing: true, targetPitch, progress: 0 });

    try {
      // Check if going back to original pitch
      if (Math.abs(targetPitch) < HowlerAudioEngine.PITCH_EPSILON) {
        // Switch back - check if speed is also 1.0
        const wasPlaying = this.howl?.playing() || false;
        const currentTime = this.getCurrentTime();
        
        if (Math.abs(this.currentSpeed - 1.0) < 0.01) {
          // Both pitch and speed are original - use original file
          if (this.originalBlobUrl) {
            await this.loadHowlerFromUrl(this.originalBlobUrl, { time: currentTime, playing: wasPlaying });
          }
        } else {
          // Speed is still applied - use speeded file
          if (this.currentSpeededBlobUrl) {
            await this.loadHowlerFromUrl(this.currentSpeededBlobUrl, { time: currentTime, playing: wasPlaying });
          }
        }
        
        // Cleanup pitched file
        if (this.currentPitchedFilePath && window.electronAPI?.cleanupTempFile) {
          await window.electronAPI.cleanupTempFile(this.currentPitchedFilePath).catch(() => {});
          this.currentPitchedFilePath = null;
        }
        this.currentPitchedBlobUrl = null;
        
        this.currentPitch = 0;
        emitPitchStatus({ isProcessing: false, targetPitch: 0, progress: 100 });
        this.isProcessingPitch = false;
        return;
      }

      // Process with native FFmpeg
      if (!window.electronAPI?.pitchShiftFile) {
        throw new Error('pitchShiftFile not available');
      }

      emitPitchStatus({ isProcessing: true, targetPitch, progress: 30 });

      // Check for abort
      if (this.pitchProcessingAborted) {
        this.isProcessingPitch = false;
        return;
      }

      // Cleanup OLD pitched file before creating new one
      if (this.currentPitchedFilePath && window.electronAPI?.cleanupTempFile) {
        await window.electronAPI.cleanupTempFile(this.currentPitchedFilePath).catch(() => {});
        this.currentPitchedFilePath = null;
      }

      // Ensure original temp path is ready (may still be writing in background after load)
      if (!this.originalTempPath && this.originalTempPathPromise) {
        this.originalTempPath = await this.originalTempPathPromise;
      }
      // Determine input file: use speeded file if speed is not 1.0, otherwise use original
      const inputFile = (this.currentSpeed !== 1.0 && this.currentSpeededFilePath)
        ? this.currentSpeededFilePath
        : this.originalTempPath;
      if (!inputFile) {
        this.isProcessingPitch = false;
        return;
      }

      // Call native FFmpeg
      const pitchedPath = await window.electronAPI.pitchShiftFile(inputFile, targetPitch);
      
      emitPitchStatus({ isProcessing: true, targetPitch, progress: 80 });

      // Check for abort again
      if (this.pitchProcessingAborted) {
        // Cleanup the generated file
        if (window.electronAPI?.cleanupTempFile) {
          await window.electronAPI.cleanupTempFile(pitchedPath).catch(() => {});
        }
        this.isProcessingPitch = false;
        return;
      }
      
      emitPitchStatus({ isProcessing: true, targetPitch, progress: 90 });

      // Cleanup old blob URL if exists
      if (this.currentPitchedBlobUrl) {
        URL.revokeObjectURL(this.currentPitchedBlobUrl);
      }

      // Read the file and create a blob URL (more reliable than custom protocol)
      const audioData = await window.electronAPI.readAudioFile(pitchedPath);
      const blob = new Blob([new Uint8Array(audioData)], { type: 'audio/mpeg' });
      const newBlobUrl = URL.createObjectURL(blob);

      emitPitchStatus({ isProcessing: true, targetPitch, progress: 95 });

      // Get current playback state BEFORE switching
      const wasPlaying = this.howl?.playing() || false;
      const currentTime = this.getCurrentTime();

      // SEAMLESS SWITCH - load new, then stop old
      await this.loadHowlerFromUrl(newBlobUrl, { time: currentTime, playing: wasPlaying });

      // Store the file path and blob URL for later cleanup
      this.currentPitchedFilePath = pitchedPath;
      this.currentPitchedBlobUrl = newBlobUrl;

      this.currentPitch = targetPitch;
      emitPitchStatus({ isProcessing: false, targetPitch, progress: 100 });

    } catch (error) {
      emitPitchStatus({ isProcessing: false, targetPitch: this.currentPitch, progress: 0 });
    }

    this.isProcessingPitch = false;
  }

  /** Convert store volume (dB) to Howler linear 0-1 */
  private getTargetVolumeLinear(): number {
    const store = useAppStore.getState();
    const db = store.globalControls.isMuted ? -60 : (store.globalControls.volume ?? 6);
    if (db <= -60) return 0;
    const linear = Math.pow(10, db / 20);
    const maxLinear = Math.pow(10, 6 / 20);
    return Math.max(0, Math.min(1, linear / maxLinear));
  }

  /** Ramp Howler volume with easing - prevents clicks/pops on transport changes. */
  private rampVolume(
    from: number,
    to: number,
    onComplete?: () => void,
    durationMs: number = HowlerAudioEngine.FADE_DURATION_MS,
  ): void {
    if (!this.howl) return;
    const id = ++this.fadeRampId;
    const steps = Math.max(4, Math.round(durationMs / 12));
    const stepMs = durationMs / steps;
    let step = 0;
    const tick = () => {
      if (id !== this.fadeRampId || !this.howl) return;
      step++;
      const t = Math.min(1, step / steps);
      const eased = t * t * (3 - 2 * t); // smoothstep
      const vol = from + (to - from) * eased;
      this.howl.volume(vol);
      if (step < steps) {
        setTimeout(tick, stepMs);
      } else {
        onComplete?.();
      }
    };
    tick();
  }

  private rampVolumeAsync(from: number, to: number, durationMs: number, token: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.howl) {
        resolve(false);
        return;
      }

      const steps = Math.max(4, Math.round(durationMs / 12));
      const stepMs = durationMs / steps;
      let step = 0;

      const tick = () => {
        if (!this.howl) {
          resolve(false);
          return;
        }
        if (token !== this.seekOperationToken) {
          resolve(false);
          return;
        }

        step++;
        const t = Math.min(1, step / steps);
        const eased = t * t * (3 - 2 * t);
        const vol = from + (to - from) * eased;
        this.howl.volume(vol);

        if (step < steps) {
          setTimeout(tick, stepMs);
        } else {
          resolve(true);
        }
      };

      tick();
    });
  }

  private applyPlaybackStateAfterSeek(): void {
    if (!this.howl) return;

    if (PITCH_ENABLED_IN_HOWLER) {
      if (this.tonePitchShift) {
        this.applyPitchToTone();
      }
      this.applySpeedToHtml5Element();
      return;
    }

    const effectiveRate = this.getEffectiveRate();
    if (this.currentSoundId !== null && effectiveRate !== 1.0) {
      this.howl.rate(effectiveRate, this.currentSoundId);
    }
  }

  private performSeek(time: number): void {
    if (!this.howl) return;
    if (this.currentSoundId !== null) {
      this.howl.seek(time, this.currentSoundId);
    } else {
      this.howl.seek(time);
    }
    useAppStore.getState().setCurrentTime(time);
  }

  private ensurePlayingAfterSeek(targetTime: number): void {
    if (!this.howl) return;
    if (this.currentSoundId === null) {
      this.currentSoundId = this.howl.play() as number;
      if (this.currentSoundId !== null) {
        this.howl.seek(targetTime, this.currentSoundId);
      }
      return;
    }
    if (!this.howl.playing(this.currentSoundId)) {
      this.howl.play(this.currentSoundId);
    }
  }

  private async smoothSeekWhilePlaying(targetTime: number, token: number): Promise<void> {
    if (!this.howl) return;

    const currentVol = this.howl.volume();
    const targetVol = this.getTargetVolumeLinear();
    const fadedOut = await this.rampVolumeAsync(
      currentVol,
      0,
      HowlerAudioEngine.SEEK_FADE_OUT_MS,
      token,
    );
    if (!fadedOut || token !== this.seekOperationToken || !this.howl) {
      return;
    }

    this.performSeek(targetTime);
    this.ensurePlayingAfterSeek(targetTime);
    this.applyPlaybackStateAfterSeek();
    await this.rampVolumeAsync(0, targetVol, HowlerAudioEngine.SEEK_FADE_IN_MS, token);
  }

  // === Standard playback methods ===

  public async play(): Promise<void> {
    if (!this.howl) throw new Error('No audio');
    this.seekOperationToken++;
    this.debugLog('play-called', {
      currentSoundId: this.currentSoundId,
      storeIsPlaying: useAppStore.getState().audio.isPlaying,
      muted: useAppStore.getState().globalControls.isMuted,
      volumeDb: useAppStore.getState().globalControls.volume,
    });
    // User gesture must not be lost: play() before any await (PlaybackPanel depends on this)
    const targetVol = this.getTargetVolumeLinear();
    this.howl.volume(0);
    try {
      this.currentSoundId = this.howl.play() as number;
    } catch {
      this.currentSoundId = null;
    }
    // Match web: resume context (web does Tone.context.resume before play; Howler creates ctx on first play)
    await this.resumeAudioContext();
    this.debugLog('play-after-resume', {
      currentSoundId: this.currentSoundId,
      howlPlaying: this.currentSoundId !== null ? this.howl.playing(this.currentSoundId) : this.howl.playing(),
    });

    const isActuallyPlaying = (): boolean => {
      if (!this.howl) return false;
      if (this.currentSoundId !== null) return this.howl.playing(this.currentSoundId);
      return this.howl.playing();
    };

    // Retry once after context resume when Howler accepted play() but media did not actually start.
    if (!isActuallyPlaying() && this.howl) {
      try {
        if (this.currentSoundId !== null) {
          this.howl.play(this.currentSoundId);
        } else {
          this.currentSoundId = this.howl.play() as number;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 16));
    }

    if (!isActuallyPlaying()) {
      this.stopTimeUpdate();
      useAppStore.getState().setIsPlaying(false);
      this.howl.volume(targetVol);
      this.debugLog('play-failed-no-active-playback');
      throw new Error('Playback did not start');
    }
    
    if (PITCH_ENABLED_IN_HOWLER && this.tonePitchShift) {
      this.applyPitchToTone();
      this.applySpeedToHtml5Element();
    } else {
      this.applySpeedToHtml5Element();
      const effectiveRate = this.getEffectiveRate();
      if (this.currentSoundId !== null && effectiveRate !== 1.0) {
        this.howl.rate(effectiveRate, this.currentSoundId);
      }
    }
    
    useAppStore.getState().setIsPlaying(true);
    this.startTimeUpdate();
    this.rampVolume(0, targetVol);
    this.debugLog('play-started', {
      currentSoundId: this.currentSoundId,
      targetVolumeLinear: targetVol,
    });
  }

  public pause(): void {
    if (!this.howl) return;
    this.seekOperationToken++;
    const soundId = this.currentSoundId;
    const currentVol = this.howl.volume();
    this.rampVolume(currentVol, 0, () => {
      if (!this.howl) return;
      if (soundId !== null) {
        this.howl.pause(soundId);
      } else {
        this.howl.pause();
      }
      this.howl.volume(this.getTargetVolumeLinear());
      this.currentSoundId = null;
      useAppStore.getState().setIsPlaying(false);
      this.stopTimeUpdate();
    });
  }

  public async stop(): Promise<void> {
    if (!this.howl) return;
    this.seekOperationToken++;
    const currentVol = this.howl.volume();
    this.rampVolume(currentVol, 0, () => {
      if (!this.howl) return;
      this.howl.stop();
      this.currentSoundId = null;
      this.howl.volume(this.getTargetVolumeLinear());
      useAppStore.getState().setIsPlaying(false);
      useAppStore.getState().setCurrentTime(0);
      this.howl.seek(0);
      const duration = this.getDuration();
      if (duration > 0) {
        const DEFAULT_ZOOM_STOP = getDefaultZoomLevel();
        useAppStore.getState().setViewport(0, duration / DEFAULT_ZOOM_STOP);
        useAppStore.getState().setZoomLevel(DEFAULT_ZOOM_STOP);
      }
      this.stopTimeUpdate();
    });
  }

  public async seek(time: number): Promise<void> {
    if (!this.howl) return;
    const originalTime = Math.max(0, Math.min(time, this.duration));
    const wasPlaying =
      this.currentSoundId !== null
        ? this.howl.playing(this.currentSoundId)
        : this.howl.playing();
    const token = ++this.seekOperationToken;

    if (wasPlaying) {
      await this.smoothSeekWhilePlaying(originalTime, token);
      return;
    }

    if (token !== this.seekOperationToken) return;
    this.performSeek(originalTime);
    this.applyPlaybackStateAfterSeek();
  }

  public getCurrentTime(): number {
    if (!this.howl) return 0;
    const fileTime = this.currentSoundId !== null ? this.howl.seek(this.currentSoundId) : this.howl.seek();
    const rawTime = typeof fileTime === 'number' ? fileTime : 0;
    
    // Return original timeline time (fileTime) - duration never changes with speed
    // Only the playback rate changes, which makes the counter advance faster/slower
    // The visual timeline and markers remain based on original duration
    return rawTime;
  }

  public getDuration(): number { return this.duration; }
  public isAudioLoaded(): boolean { return this.howl !== null; }
  public getIsPlaying(): boolean { return this.howl?.playing() || false; }
  public getPitch(): number { return this.currentPitch; }
  public resetPitch(): void { this.setPitch(0); }

  public setVolume(db: number): void {
    if (!this.howl) return;
    
    const clampedDb = Math.max(-60, Math.min(6, db));
    
    if (clampedDb <= -60) {
      this.howl.volume(0);
      return;
    }
    
    const linear = Math.pow(10, clampedDb / 20);
    const maxLinear = Math.pow(10, 6 / 20);
    const normalizedVolume = linear / maxLinear;
    // HTML5 Audio (used in Electron for stability) only supports 0–1
    this.howl.volume(Math.max(0, Math.min(1, normalizedVolume)));
  }

  /**
   * Set playback rate (speed) - uses FFmpeg for true time-stretching
   */
  public setRate(rate: number): void {
    this.setSpeed(rate);
  }

  /**
   * Set speed - IMMEDIATE change using Howler's rate() (like YouTube)
   * Note: Howler's rate changes both speed AND pitch
   * For true time-stretching without pitch change, FFmpeg would be needed
   * But for immediate response, we use Howler's rate (trade-off: pitch changes slightly)
   * @param speed - Speed multiplier (0.25 to 4.0)
   */
  public setSpeed(speed: number): void {
    // Clamp to valid range
    const targetSpeed = Math.max(0.25, Math.min(4.0, Math.round(speed * 100) / 100));
    
    // Update store immediately for UI feedback
    useAppStore.getState().setPlaybackRate(targetSpeed);
    this.targetSpeed = targetSpeed;
    
    const effectiveRate = this.getEffectiveRate(targetSpeed);
    // If same speed, nothing to do (but still ensure it's applied if howl exists)
    if (Math.abs(targetSpeed - this.currentSpeed) < 0.01) {
      if (PITCH_ENABLED_IN_HOWLER && this.tonePitchShift) {
        this.applyPitchToTone();
        this.applySpeedToHtml5Element();
      } else if (this.howl && this.currentSoundId !== null && this.howl.playing(this.currentSoundId) && effectiveRate !== 1.0) {
        this.howl.rate(effectiveRate, this.currentSoundId);
      }
      return;
    }

    this.currentSpeed = targetSpeed;
    
    if (this.howl) {
      if (PITCH_ENABLED_IN_HOWLER && this.tonePitchShift) {
        this.applyPitchToTone();
        this.applySpeedToHtml5Element();
      } else {
        if (this.currentSoundId !== null && this.howl.playing(this.currentSoundId)) {
          this.howl.rate(effectiveRate, this.currentSoundId);
        } else {
          this.howl.rate(effectiveRate);
        }
      }
      
      // Duration NEVER changes with speed - it always stays as originalDuration
      // Only the playback rate changes, which makes the counter advance faster/slower
      // The visual timeline and markers remain based on original duration
      if (this.originalDuration > 0) {
        // Duration stays constant - don't update it!
        // this.duration = this.originalDuration; // Already set, don't change
        
        // Update current time display (in original timeline)
        const currentTime = this.getCurrentTime();
        useAppStore.getState().setCurrentTime(currentTime);
        
      }
    } else {
      // Howl not ready yet - store the speed so it can be applied when audio loads
    }
  }

  /**
   * Process speed change - runs in background, audio keeps playing
   */
  private async processSpeedChange(targetSpeed: number): Promise<void> {
    // If already processing, abort current and start new
    if (this.isProcessingSpeed) {
      this.speedProcessingAborted = true;
      await new Promise(r => setTimeout(r, 100));
    }

    this.isProcessingSpeed = true;
    this.speedProcessingAborted = false;
    

    try {
      // Check if going back to normal speed
      if (Math.abs(targetSpeed - 1.0) < 0.01) {
        // Switch back - check if pitch is also 0
        const wasPlaying = this.howl?.playing() || false;
        const currentTime = this.getCurrentTime();
        
        if (Math.abs(this.currentPitch) < HowlerAudioEngine.PITCH_EPSILON) {
          // Both pitch and speed are original - use original file
          if (this.originalBlobUrl) {
            await this.loadHowlerFromUrl(this.originalBlobUrl, { time: currentTime, playing: wasPlaying });
          }
        } else {
          // Pitch is still applied - use pitched file
          if (this.currentPitchedBlobUrl) {
            await this.loadHowlerFromUrl(this.currentPitchedBlobUrl, { time: currentTime, playing: wasPlaying });
          }
        }
        
        // Cleanup speeded file
        if (this.currentSpeededFilePath && window.electronAPI?.cleanupTempFile) {
          await window.electronAPI.cleanupTempFile(this.currentSpeededFilePath).catch(() => {});
          this.currentSpeededFilePath = null;
        }
        this.currentSpeededBlobUrl = null;
        
        this.currentSpeed = 1.0;
        this.isProcessingSpeed = false;
        return;
      }

      // Process with native FFmpeg
      if (!window.electronAPI?.timeStretchFile) {
        throw new Error('timeStretchFile not available');
      }

      // Cleanup OLD speeded file before creating new one
      if (this.currentSpeededFilePath && window.electronAPI?.cleanupTempFile) {
        await window.electronAPI.cleanupTempFile(this.currentSpeededFilePath).catch(() => {});
        this.currentSpeededFilePath = null;
      }

      // Check for abort
      if (this.speedProcessingAborted) {
        this.isProcessingSpeed = false;
        return;
      }

      // Ensure original temp path is ready (may still be writing in background after load)
      if (!this.originalTempPath && this.originalTempPathPromise) {
        this.originalTempPath = await this.originalTempPathPromise;
      }
      // Determine input file: use pitched file if pitch is not 0, otherwise use original
      const inputFile = (Math.abs(this.currentPitch) >= HowlerAudioEngine.PITCH_EPSILON && this.currentPitchedFilePath)
        ? this.currentPitchedFilePath
        : this.originalTempPath;
      if (!inputFile) {
        this.isProcessingSpeed = false;
        return;
      }

      // Call native FFmpeg for time-stretching
      const speededPath = await window.electronAPI.timeStretchFile(inputFile, targetSpeed);

      // Check for abort again
      if (this.speedProcessingAborted) {
        if (window.electronAPI?.cleanupTempFile) {
          await window.electronAPI.cleanupTempFile(speededPath).catch(() => {});
        }
        this.isProcessingSpeed = false;
        return;
      }

      // Read the speeded file
      const audioData = await window.electronAPI.readAudioFile(speededPath);

      // Create blob URL
      const blob = new Blob([new Uint8Array(audioData)], { type: 'audio/mpeg' });
      const newBlobUrl = URL.createObjectURL(blob);

      // Get current playback state BEFORE switching
      const wasPlaying = this.howl?.playing() || false;
      let currentTime = this.getCurrentTime();
      const originalDuration = this.duration;
      
      
      // Adjust time proportionally when switching speeds
      // Formula: originalAudioTime = currentTime * currentSpeed
      //          newTime = originalAudioTime / targetSpeed
      const originalAudioTime = this.currentSpeed === 1.0 
        ? currentTime 
        : currentTime * this.currentSpeed;
      
      // Calculate expected new duration (speeded files are shorter/longer)
      const expectedNewDuration = originalDuration / targetSpeed;
      const newTime = targetSpeed === 1.0
        ? originalAudioTime
        : originalAudioTime / targetSpeed;
      
      // Clamp to valid range
      currentTime = Math.max(0, Math.min(newTime, expectedNewDuration));
      

      // SEAMLESS SWITCH - load new, then stop old
      await this.loadHowlerFromUrl(newBlobUrl, { time: currentTime, playing: wasPlaying });

      // Store the file path and blob URL for later cleanup
      this.currentSpeededFilePath = speededPath;
      this.currentSpeededBlobUrl = newBlobUrl;

      this.currentSpeed = targetSpeed;

    } catch (error) {
    }

    this.isProcessingSpeed = false;
  }

  /**
   * Set speed using preset
   * @param preset - Speed preset name: 'slowest', 'slow', 'normal', 'fast', 'fastest'
   */
  public setSpeedPreset(preset: 'slowest' | 'slow' | 'normal' | 'fast' | 'fastest'): void {
    const speedMap: Record<string, number> = {
      slowest: 0.25,  // Quarter speed - very slow for learning
      slow: 0.5,      // Half speed - transcription friendly
      normal: 1.0,    // Original speed
      fast: 1.5,      // Faster playback
      fastest: 2.0,   // Double speed
    };

    const speed = speedMap[preset] || 1.0;
    this.setSpeed(speed);
  }

  /**
   * Get current speed
   */
  public getSpeed(): number {
    return this.currentSpeed;
  }

  /**
   * Get the original temp file path (for effects processing)
   */
  public getOriginalFilePath(): string | null {
    return this.originalTempPath;
  }

  /**
   * Get current playback rate (alias for getSpeed)
   */
  public getPlaybackRate(): number {
    return this.getSpeed();
  }

  /**
   * Resume Howler's AudioContext - matches web (Tone.context.resume before play).
   * Required for first play in Electron; context starts suspended until user gesture.
   */
  public async resumeAudioContext(): Promise<void> {
    try {
      const Howler = (window as any).Howler;
      const ctx = Howler?.ctx as AudioContext | undefined;
      if (ctx?.state === 'suspended') await ctx.resume();
      if (Tone.context.state === 'suspended') await Tone.context.resume();
      this.debugLog('resume-audio-context', {
        howlerState: ctx?.state ?? 'unknown',
        toneState: Tone.context.state,
      });
    } catch (_) {}
  }

  /**
   * Enable looping between start and end times
   * When playback reaches end, automatically jumps back to start
   * @param start - Loop start time in seconds
   * @param end - Loop end time in seconds
   */
  public setLoop(start: number, end: number): void {
    const duration = this.getDuration();
    
    // Validate loop bounds
    if (start < 0 || end > duration || start >= end) {
      return;
    }

    this.loopStart = start;
    this.loopEnd = end;
    this.isLooping = true;
  }

  /**
   * Disable looping
   * Playback will continue normally without jumping back
   */
  public disableLoop(): void {
    this.isLooping = false;
    this.loopStart = null;
    this.loopEnd = null;

  }

  /**
   * Handle loop end - jump back to loop start
   * Uses the same smooth seek envelope as manual marker navigation to reduce clicks.
   */
  private async handleLoopEnd(): Promise<void> {
    if (!this.isLooping || this.loopStart === null || this.loopEnd === null || !this.howl) {
      return;
    }

    // Prevent re-entrancy (timer can trigger multiple times near boundary)
    if (this.isHandlingLoopJump) return;
    this.isHandlingLoopJump = true;

    
    try {
      const wasPlaying =
        this.currentSoundId !== null
          ? this.howl.playing(this.currentSoundId)
          : this.howl.playing();
      if (!wasPlaying) {
        this.performSeek(this.loopStart);
        return;
      }

      const loopJumpToken = ++this.seekOperationToken;
      await this.smoothSeekWhilePlaying(this.loopStart, loopJumpToken);
      if (loopJumpToken === this.seekOperationToken) {
        useAppStore.getState().setIsPlaying(true);
      }
    } catch (_error) {
    } finally {
      // Allow next loop check after a short delay to prevent rapid re-trigger
      setTimeout(() => { this.isHandlingLoopJump = false; }, 120);
    }
  }

  private startTimeUpdate(): void {
    this.stopTimeUpdate();
    this.lastReportedTime = -1;
    this.timeUpdateInterval = window.setInterval(() => {
      if (this.howl?.playing()) {
        const currentTime = this.getCurrentTime();
        const duration = this.getDuration();
        const store = useAppStore.getState();
        // Throttle store updates: only update when changed enough to reduce re-renders
        const delta = Math.abs(currentTime - this.lastReportedTime);
        if (delta >= HowlerAudioEngine.TIME_UPDATE_MIN_DELTA || this.lastReportedTime < 0 || currentTime >= duration - 0.1) {
          this.lastReportedTime = currentTime;
          store.setCurrentTime(currentTime);
        }
        // Check for marker loop end - jump back to start if looping
        if (!this.isHandlingLoopJump && this.isLooping && this.loopEnd !== null && this.loopStart !== null) {
          const loopEndThreshold = this.loopEnd - 0.1;
          if (currentTime >= loopEndThreshold) {
            this.handleLoopEnd().catch(() => {});
            return;
          }
        }
        // Check if reached end of audio (only if not looping)
        if (!this.isLooping && currentTime >= duration - 0.05) {
          this.howl.stop();
          this.currentSoundId = null;
          store.setIsPlaying(false);
          store.setCurrentTime(duration);
          this.stopTimeUpdate();
        }
      }
    }, HowlerAudioEngine.TIME_UPDATE_INTERVAL_MS);
  }

  private stopTimeUpdate(): void {
    if (this.timeUpdateInterval !== null) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  // === Waveform ===

  /** Decode waveform and set store - blocks until done. Match web: everything ready before showing UI. */
  private async decodeWaveformAndSetBuffer(filename: string, durationSeconds: number): Promise<void> {
    if (!this.howl) return;
    const DEFAULT_ZOOM = getDefaultZoomLevel();
    const store = useAppStore.getState();
    try {
      if (this.originalDataArray?.length) {
        await ensureFFmpegLoaded();
        const waveformBuffer = new Uint8Array(this.originalDataArray).buffer;
        const buffer = await this.decodeWaveform(waveformBuffer, filename, durationSeconds);
        if (buffer) this.audioBuffer = buffer;
      }
      // Match web: set buffer + duration + viewport + zoom in one block
      store.setDuration(this.duration);
      store.setViewport(0, this.duration / DEFAULT_ZOOM);
      store.setZoomLevel(DEFAULT_ZOOM);
      if (this.audioBuffer) store.setAudioBuffer(this.audioBuffer);
      else store.setAudioReadyForPlayback();
      // Prime AudioContext for first play (user gesture from file picker still valid)
      await this.resumeAudioContext();
    } catch {
      // Fallback: show UI with no waveform; user can still play
      store.setDuration(this.duration);
      store.setViewport(0, this.duration / DEFAULT_ZOOM);
      store.setZoomLevel(DEFAULT_ZOOM);
      store.setAudioReadyForPlayback();
    }
  }

  private async decodeWaveform(arrayBuffer: ArrayBuffer, filename: string, durationSeconds: number = 0): Promise<AudioBuffer | null> {
    try {
      const ffmpeg = await ensureFFmpegLoaded();
      if (!ffmpeg) return null;

      const ext = filename.split('.').pop()?.toLowerCase() || 'mp3';
      await ffmpeg.writeFile(`wave_input.${ext}`, new Uint8Array(arrayBuffer));
      // Use lower sample rates for long files so decode finishes faster and fits in memory
      let sampleRate = 22050;
      if (durationSeconds > 3600) sampleRate = 1000;      // >1 hr
      else if (durationSeconds > 1800) sampleRate = 1500; // >30 min
      else if (durationSeconds > 1200) sampleRate = 2000; // >20 min
      else if (durationSeconds > 600) sampleRate = 4000;  // >10 min (was 8000; 4000 = faster)
      else if (durationSeconds > 300) sampleRate = 8000;  // >5 min
      // Cap decode length so waveform appears sooner for very long files (full audio still plays)
      const maxDecodeSeconds = 2 * 3600; // 2 hours max for waveform (was 4 hr)
      const decodeDuration = durationSeconds > maxDecodeSeconds ? maxDecodeSeconds : undefined;
      const args = ['-i', `wave_input.${ext}`, '-ac', '2', '-ar', String(sampleRate), '-sample_fmt', 's16', '-f', 'wav', 'wave_output.wav'];
      if (decodeDuration != null) args.splice(2, 0, '-t', String(decodeDuration));
      await ffmpeg.exec(args);
      
      const data = await ffmpeg.readFile('wave_output.wav');
      const uint8 = data as Uint8Array;
      const wavBuffer = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength) as ArrayBuffer;

      try {
        await ffmpeg.deleteFile(`wave_input.${ext}`);
        await ffmpeg.deleteFile('wave_output.wav');
      } catch (e) {}

      return this.parseWav(wavBuffer);
    } catch (e) {
      return null;
    }
  }

  private parseWav(buffer: ArrayBuffer): AudioBuffer | null {
    try {
      const view = new DataView(buffer);
      let offset = 12;
      let channels = 2, sampleRate = 44100, bitsPerSample = 16;
      let dataOffset = 0, dataSize = 0;
      
      while (offset < buffer.byteLength - 8) {
        const id = String.fromCharCode(view.getUint8(offset), view.getUint8(offset+1), view.getUint8(offset+2), view.getUint8(offset+3));
        const size = view.getUint32(offset + 4, true);
        
        if (id === 'fmt ') {
          channels = view.getUint16(offset + 10, true);
          sampleRate = view.getUint32(offset + 12, true);
          bitsPerSample = view.getUint16(offset + 22, true);
        } else if (id === 'data') {
          dataOffset = offset + 8;
          dataSize = size;
          break;
        }
        offset += 8 + size + (size % 2);
      }
      
      if (!dataOffset || !dataSize) return null;
      
      const bytesPerSample = bitsPerSample / 8;
      const numSamples = Math.floor(dataSize / (bytesPerSample * channels));
      
      const ctx = new OfflineAudioContext(channels, numSamples, sampleRate);
      const audioBuffer = ctx.createBuffer(channels, numSamples, sampleRate);

      for (let ch = 0; ch < channels; ch++) {
        const data = audioBuffer.getChannelData(ch);
        for (let i = 0; i < numSamples; i++) {
          const pos = dataOffset + (i * channels + ch) * bytesPerSample;
          if (pos + bytesPerSample <= buffer.byteLength) {
            data[i] = bytesPerSample === 2 ? view.getInt16(pos, true) / 32768 : (view.getUint8(pos) - 128) / 128;
          }
        }
      }
      
      return audioBuffer;
    } catch (e) {
      return null;
    }
  }

  public getAudioBuffer(): AudioBuffer | null { return this.audioBuffer; }
  public getAnalyserNode(): AnalyserNode | null { return null; }

  public async dispose(): Promise<void> {
    this.unloadCurrentAudio();
    await this.cleanup();
    this.originalDataArray = [];
  }
}

// Singleton
let instance: HowlerAudioEngine | null = null;

export function getHowlerAudioEngine(): HowlerAudioEngine {
  if (!instance) instance = new HowlerAudioEngine();
  return instance;
}

export async function resetHowlerAudioEngine(): Promise<void> {
  if (instance) {
    await instance.dispose();
    instance = null;
  }
}
