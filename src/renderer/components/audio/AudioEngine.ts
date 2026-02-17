// AudioEngine.ts - Wilton - Week 1-2
// Core audio processing using Web Audio API + Tone.js
// Architecture: File → AudioBuffer (waveform) + Tone.Player (playback) → PitchShift → Volume → Speakers

import * as Tone from 'tone';
import { useAppStore } from '../../store/store';

/**
 * Supported audio file formats
 */
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg',      // MP3
  'audio/mp3',       // MP3 (alternative)
  'audio/wav',       // WAV
  'audio/wave',      // WAV (alternative)
  'audio/ogg',       // OGG
  'audio/flac',      // FLAC
  'audio/x-flac',    // FLAC (alternative)
  'audio/mp4',       // M4A, AAC
  'audio/aac',       // AAC
  'audio/x-m4a',     // M4A
  'audio/aacp',      // AAC (alternative)
] as const;

export type SupportedAudioFormat = typeof SUPPORTED_AUDIO_FORMATS[number];

/**
 * AudioEngine - Handles audio file loading and processing with Tone.js
 * 
 * Responsibilities:
 * - Load audio files (MP3, WAV, OGG, FLAC, M4A, AAC)
 * - Decode audio using Web Audio API (for waveform visualization)
 * - Use Tone.js Player for playback with independent pitch/speed control
 * - Integrate with Zustand store
 * 
 * Architecture:
 * - AudioBuffer: Kept for waveform component (needs raw samples)
 * - Tone.Player: Used for playback (supports advanced features)
 * - PitchShift: Independent pitch control without affecting speed
 * - Volume: Volume control in dB
 */
export class AudioEngine {
  // Web Audio API (kept for waveform compatibility)
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isInitialized: boolean = false;

  // Tone.js nodes for playback
  private player: Tone.Player | null = null;
  private pitchShift: Tone.PitchShift | null = null;
  private volumeNode: Tone.Volume | null = null;

  // Playback state tracking
  private currentPlaybackRate: number = 1.0;
  private currentPitch: number = 0; // In semitones
  private playbackStartTime: number = 0; // When playback started (Tone.now())
  private playbackStartPosition: number = 0; // Position in audio when started (seconds)
  private isPlaying: boolean = false;
  private playerLoaded: boolean = false;

  // Time tracking
  private positionTrackingId: number | null = null;

  // Loop state tracking
  private loopStart: number | null = null;
  private loopEnd: number | null = null;
  private isLooping: boolean = false;

  // Blob URL for cleanup
  private blobUrl: string | null = null;

  constructor() {
    this.initializeAudioContext();
    this.initializeToneNodes();
  }

  /**
   * Initialize Web Audio API context (for waveform compatibility)
   */
  private initializeAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser');
      }

      this.audioContext = new AudioContextClass();
      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = false;
    }
  }

  /**
   * Pitch change (semitones) caused by playbackRate - when speed changes, pitch changes.
   * Formula: 12 * log2(speed). At 1.5x speed, pitch goes up ~7 semitones.
   */
  private getPitchFromSpeed(): number {
    if (Math.abs(this.currentPlaybackRate - 1.0) < 0.01) return 0;
    return 12 * Math.log2(this.currentPlaybackRate);
  }

  /**
   * Apply combined pitch: user pitch minus speed-induced pitch change.
   * This keeps perceived pitch constant when changing speed (audio normalization).
   */
  private applyPitchCompensation(): void {
    if (!this.pitchShift) return;
    const pitchFromSpeed = this.getPitchFromSpeed();
    this.pitchShift.pitch = this.currentPitch - pitchFromSpeed;
  }

  /**
   * Initialize Tone.js effect nodes
   * Create these early - they can exist before audio loads
   */
  private initializeToneNodes(): void {
    try {
      // Create PitchShift node - larger windowSize reduces distortion on pitch change
      this.pitchShift = new Tone.PitchShift({
        pitch: 0,
        windowSize: 0.2,
        delayTime: 0,
        feedback: 0
      });

      // Create Volume node with initial value of 0 dB
      this.volumeNode = new Tone.Volume(0);

      // Connect in series: PitchShift → Volume → Destination
      this.pitchShift.connect(this.volumeNode);
      this.volumeNode.toDestination();

    } catch (error) {
    }
  }

  /**
   * Check if a file format is supported
   */
  public isFormatSupported(file: File): boolean {
    const mimeType = file.type.toLowerCase();
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (SUPPORTED_AUDIO_FORMATS.some(format => mimeType.includes(format.split('/')[1]))) {
      return true;
    }

    const supportedExtensions = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'];
    return supportedExtensions.includes(extension || '');
  }

  /**
   * Load and decode an audio file
   * Creates both AudioBuffer (for waveform) and Tone.Player (for playback)
   */
  public async loadAudioFile(file: File): Promise<void> {
    if (!this.isInitialized || !this.audioContext) {
      throw new Error('AudioEngine: AudioContext not initialized');
    }

    if (!this.isFormatSupported(file)) {
      throw new Error(
        `AudioEngine: Unsupported audio format. File: ${file.name}, Type: ${file.type}. ` +
        `Supported formats: MP3, WAV, OGG, FLAC, M4A, AAC`
      );
    }

    try {
      // Step 1: Update store with file
      useAppStore.getState().setAudioFile(file);

      // Step 2: Read file as ArrayBuffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file);

      if (arrayBuffer.byteLength === 0) {
        throw new Error('AudioEngine: File is empty or corrupted');
      }

      // Step 3: Create Blob URL (needed for Tone.Player)
      
      // Clean up previous Blob URL if exists
      if (this.blobUrl) {
        URL.revokeObjectURL(this.blobUrl);
      }
      
      const blob = new Blob([arrayBuffer], { type: file.type || 'audio/mpeg' });
      this.blobUrl = URL.createObjectURL(blob);

      // Step 4: Initialize Tone.js and create Player FIRST (before decoding for waveform)
      // This is because Tone.Player loading is more reliable in Electron
      
      // Start Tone.js (required by browsers before audio playback)
      await Tone.start();

      // Dispose existing player if any
      if (this.player) {
        this.player.dispose();
        this.player = null;
        this.playerLoaded = false;
      }

      // Create new Tone.Player with the Blob URL
      let playerDuration = 0;
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Tone.Player load timed out after 30 seconds'));
        }, 30000);

        this.player = new Tone.Player({
          url: this.blobUrl!,
          loop: false,
          playbackRate: this.currentPlaybackRate,
          onload: () => {
            clearTimeout(timeout);
            this.playerLoaded = true;
            playerDuration = this.player!.buffer.duration;
            
            // Connect Player to PitchShift and apply pitch/speed compensation
            if (this.pitchShift) {
              this.player!.connect(this.pitchShift);
              this.applyPitchCompensation();
            }
            resolve();
          },
          onerror: (error) => {
            clearTimeout(timeout);
            reject(error);
          }
        });
      });

      // Step 5: Create AudioBuffer for waveform visualization
      
      // Detect Electron environment
      const isElectron = !!(window as any).electronAPI || 
                         (typeof process !== 'undefined' && process.versions && process.versions.electron);
      
      let decodedBuffer: AudioBuffer;
      
      if (isElectron) {
        // ELECTRON: Skip decodeAudioData (causes crashes) - create synthetic waveform
        decodedBuffer = this.createSyntheticWaveform(playerDuration);
      } else {
        // Browser: Use standard decodeAudioData
        
        // Ensure AudioContext is running
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        try {
          decodedBuffer = await this.decodeAudioBuffer(arrayBuffer.slice(0));
        } catch (decodeError) {
          decodedBuffer = this.createSyntheticWaveform(playerDuration);
        }
      }
      
      // Validate buffer
      if (!decodedBuffer || decodedBuffer.length === 0) {
        decodedBuffer = this.createSyntheticWaveform(playerDuration);
      }

      this.audioBuffer = decodedBuffer;

      // Step 6: Initialize analyser node
      this.initializeAnalyserNode();

      // Step 7: Update store with buffer and duration
      // Use player duration as it's more reliable than decoded buffer duration in Electron
      const finalDuration = playerDuration > 0 ? playerDuration : decodedBuffer.duration;
      useAppStore.getState().setAudioBuffer(decodedBuffer);
      useAppStore.getState().setDuration(finalDuration);
      
      // Reset viewport to show first 20% of audio (zoom level 5)
      const DEFAULT_ZOOM = 5;
      useAppStore.getState().setViewport(0, finalDuration / DEFAULT_ZOOM);
      useAppStore.getState().setZoomLevel(DEFAULT_ZOOM);

      // Step 8: Reset playback state
      this.playbackStartPosition = 0;
      this.isPlaying = false;
      useAppStore.getState().setIsPlaying(false);
      useAppStore.getState().setCurrentTime(0);
      
      // Reset loop state when loading new audio
      this.isLooping = false;
      this.loopStart = null;
      this.loopEnd = null;

      // Step 9: Set volume to +6 dB (maximum volume) when audio loads - CRITICAL
      const storeVolume = useAppStore.getState().globalControls.volume;
      const isMuted = useAppStore.getState().globalControls.isMuted;
      const targetVolume = isMuted ? -60 : (storeVolume !== undefined ? storeVolume : 6);
      this.setVolume(targetVolume);


    } catch (error) {
      
      // Reset state on error
      const store = useAppStore.getState();
      store.setAudioFile(null);
      store.setDuration(0);
      store.setCurrentTime(0);
      store.setIsPlaying(false);
      store.clearAudioBuffer();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`AudioEngine: Failed to load audio file: ${errorMessage}`);
    }
  }

  /**
   * Decode ArrayBuffer to AudioBuffer
   */
  private async decodeAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Audio decode timed out after 30 seconds'));
      }, 30000);

      this.audioContext!.decodeAudioData(arrayBuffer)
        .then((buffer) => {
          clearTimeout(timeout);
          resolve(buffer);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Create a synthetic waveform for Electron (where decodeAudioData crashes)
   * Generates a visually appealing waveform based on the audio duration
   */
  private createSyntheticWaveform(duration: number): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const sampleRate = 44100;
    const totalSamples = Math.floor(duration * sampleRate);
    const bufferLength = Math.min(totalSamples, sampleRate * 600); // Max 10 min worth of samples

    // Create stereo buffer
    const buffer = this.audioContext.createBuffer(2, bufferLength, sampleRate);
    
    // Generate visually interesting synthetic waveform
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      // Use multiple frequencies and patterns for a realistic look
      const baseFreq = 2 + channel * 0.5; // Different for each channel
      const envelope = 0.7;
      
      for (let i = 0; i < bufferLength; i++) {
        const t = i / sampleRate;
        const progress = i / bufferLength;
        
        // Create a dynamic pattern with multiple sine waves
        const wave1 = Math.sin(t * baseFreq * 2 * Math.PI) * 0.3;
        const wave2 = Math.sin(t * baseFreq * 4.7 * 2 * Math.PI) * 0.2;
        const wave3 = Math.sin(t * baseFreq * 7.3 * 2 * Math.PI) * 0.15;
        
        // Add some noise for texture
        const noise = (Math.random() - 0.5) * 0.2;
        
        // Dynamic envelope that varies throughout
        const dynamicEnvelope = 0.4 + 0.4 * Math.sin(progress * Math.PI * 8);
        
        // Beat-like pattern
        const beat = Math.pow(Math.abs(Math.sin(t * 2 * Math.PI)), 0.5) * 0.3;
        
        // Combine all elements
        let sample = (wave1 + wave2 + wave3 + noise + beat) * envelope * dynamicEnvelope;
        
        // Ensure values are within -1 to 1
        channelData[i] = Math.max(-1, Math.min(1, sample));
      }
    }

    return buffer;
  }

  /**
   * Read file as ArrayBuffer
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          resolve(event.target.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };

      reader.onerror = () => {
        reject(new Error('FileReader error while reading file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Initialize analyser node for waveform visualization
   */
  private initializeAnalyserNode(): void {
    if (!this.audioContext) return;

    try {
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;
    } catch (error) {
    }
  }

  /**
   * Play audio from current position
   */
  public async play(): Promise<void> {
    if (!this.player || !this.playerLoaded) {
      throw new Error('AudioEngine: No audio loaded');
    }

    // Resume audio context if suspended
    if (Tone.context.state !== 'running') {
      await Tone.context.resume();
    }

    // If already playing, do nothing
    if (this.isPlaying) {
      return;
    }

    try {
      // Stop if already started (Tone.Player can't restart while playing)
      if (this.player.state === 'started') {
        this.player.stop();
      }

      // Get current position from store (where we paused)
      const startPosition = useAppStore.getState().audio.currentTime || 0;
      
      // Apply playback rate and pitch from store (in case changed while paused)
      const store = useAppStore.getState();
      const storedPlaybackRate = store.globalControls.playbackRate;
      const storedPitch = store.globalControls.pitch;
      if (storedPlaybackRate && storedPlaybackRate !== this.currentPlaybackRate) {
        this.setPlaybackRate(storedPlaybackRate);
      }
      if (storedPitch !== undefined && Math.abs(storedPitch - this.currentPitch) > 0.01) {
        this.currentPitch = storedPitch;
        this.applyPitchCompensation();
      }
      
      // Get target volume for fade in (Spotify-like smooth start)
      const targetVolume = useAppStore.getState().globalControls.volume;
      const isMuted = useAppStore.getState().globalControls.isMuted;
      const targetDb = isMuted ? -60 : targetVolume;
      
      // Start from silence to prevent clicks
      if (this.volumeNode) {
        this.volumeNode.volume.value = -60;
      }
      
      // Record playback start info for time tracking
      this.playbackStartTime = Tone.now();
      this.playbackStartPosition = startPosition;

      // Start playback from the current position
      this.player.start(Tone.now(), startPosition);

      this.isPlaying = true;
      useAppStore.getState().setIsPlaying(true);

      // Start position tracking using Tone.Transport
      this.startPositionTracking();
      
      // Fade in to target volume (80ms - Spotify-like)
      if (this.volumeNode) {
        this.volumeNode.volume.rampTo(targetDb, 0.08);
      }

    } catch (error) {
      this.isPlaying = false;
      useAppStore.getState().setIsPlaying(false);
      throw error;
    }
  }

  /**
   * Pause audio playback with fade out (Spotify-like)
   * Note: Tone.Player doesn't have native pause, so we fade then stop
   */
  public pause(): void {
    if (!this.isPlaying || !this.player) {
      return;
    }

    try {
      const currentTime = this.getCurrentTime();
      const currentDb = useAppStore.getState().globalControls.isMuted ? -60 : useAppStore.getState().globalControls.volume;
      
      // Fade out over 80ms then stop (prevents clicks)
      if (this.volumeNode) {
        this.volumeNode.volume.rampTo(-60, 0.08);
      }
      setTimeout(() => {
        if (!this.player) return;
        this.player.stop();
        this.isPlaying = false;
        useAppStore.getState().setIsPlaying(false);
        useAppStore.getState().setCurrentTime(currentTime);
        this.stopPositionTracking();
        if (this.volumeNode) {
          this.volumeNode.volume.value = currentDb;
        }
      }, 85);
    } catch (error) {
    }
  }

  /**
   * Stop audio playback and reset to beginning
   */
  public async stop(): Promise<void> {
    try {
      // Get current volume for fade out
      const currentDb = useAppStore.getState().globalControls.volume;
      const isMuted = useAppStore.getState().globalControls.isMuted;
      const startDb = isMuted ? -60 : currentDb;
      
      // Fade out to silence (80ms - Spotify-like)
      if (this.volumeNode) {
        this.volumeNode.volume.rampTo(-60, 0.08);
        await new Promise(resolve => setTimeout(resolve, 90));
      }
      
      if (this.player && this.player.state === 'started') {
        this.player.stop();
      }

      // Reset playback state
      this.playbackStartPosition = 0;
      this.isPlaying = false;
      useAppStore.getState().setIsPlaying(false);
      useAppStore.getState().setCurrentTime(0);

      // Reset viewport to beginning (show first 20% of audio)
      const duration = this.getDuration();
      if (duration > 0) {
        const DEFAULT_ZOOM_STOP = 5;
        useAppStore.getState().setViewport(0, duration / DEFAULT_ZOOM_STOP);
        useAppStore.getState().setZoomLevel(DEFAULT_ZOOM_STOP);
      }

      // Stop position tracking
      this.stopPositionTracking();
      
      // Restore volume after fade out
      if (this.volumeNode && !isMuted) {
        this.volumeNode.volume.value = currentDb;
      }


    } catch (error) {
    }
  }

  /**
   * Seek to a specific time position - preserves playback state
   */
  public async seek(time: number): Promise<void> {
    if (!this.audioBuffer) {
      throw new Error('AudioEngine: No audio loaded');
    }

    const duration = this.getDuration();
    const seekTime = Math.max(0, Math.min(time, duration));
    const wasPlaying = this.isPlaying;

    // Update position first
    this.playbackStartPosition = seekTime;
    useAppStore.getState().setCurrentTime(seekTime);

    // If playing, seek without stopping (Tone.Player supports seeking during playback)
    if (wasPlaying && this.player && this.player.state === 'started') {
      // Tone.Player can seek while playing - just restart from new position
      try {
        this.player.stop();
        this.stopPositionTracking();
        
        // Immediately restart from new position
        this.playbackStartTime = Tone.now();
        this.player.start(Tone.now(), seekTime);
        
        // Restart position tracking
        this.startPositionTracking();
        
      } catch (error) {
        // Fallback: stop and restart
        if (this.player) {
          this.player.stop();
        }
        this.stopPositionTracking();
        await this.play();
      }
    } else {
      // Not playing, just update position
    }
  }

  /**
   * Get current playback time in seconds
   * Calculated from when playback started and current playback rate
   */
  public getCurrentTime(): number {
    if (!this.isPlaying) {
      // When paused, return the saved position from store
      return useAppStore.getState().audio.currentTime || this.playbackStartPosition;
    }

    // Calculate elapsed time since playback started
    const elapsed = (Tone.now() - this.playbackStartTime) * this.currentPlaybackRate;
    const currentTime = this.playbackStartPosition + elapsed;
    
    // Clamp to duration
    return Math.min(currentTime, this.getDuration());
  }

  /**
   * Start position tracking using Tone.Transport
   */
  private startPositionTracking(): void {
    this.stopPositionTracking();

    // Start Transport if not already started
    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
    }

    // Schedule repeat every 100ms to update position
    this.positionTrackingId = Tone.Transport.scheduleRepeat((time) => {
      if (this.isPlaying) {
        const currentTime = this.getCurrentTime();
        const duration = this.getDuration();
        
        // Update store with current time
        useAppStore.getState().setCurrentTime(currentTime);

        // Check for marker loop end - jump back to start if looping
        // Only check if we're actually looping and have valid loop bounds
        if (this.isLooping && this.loopEnd !== null && this.loopStart !== null) {
          // Check if we've reached or passed the loop end
          // Use a threshold (0.1s) to account for timing precision and ensure we catch it
          const loopEndThreshold = this.loopEnd - 0.1;
          if (currentTime >= loopEndThreshold) {
            this.handleLoopEnd().catch(() => {});
            return; // Don't check for audio end if we're looping
          }
        }

        // Check if reached end of audio (only if not looping)
        if (!this.isLooping && currentTime >= duration - 0.05) {
          this.handlePlaybackEnd();
        }
      }
    }, 0.1); // 100ms interval

  }

  /**
   * Stop position tracking
   */
  private stopPositionTracking(): void {
    if (this.positionTrackingId !== null) {
      Tone.Transport.clear(this.positionTrackingId);
      this.positionTrackingId = null;
    }
  }

  /**
   * Handle playback reaching the end
   */
  private handlePlaybackEnd(): void {
    const duration = this.getDuration();
    
    this.isPlaying = false;
    this.playbackStartPosition = duration;
    useAppStore.getState().setIsPlaying(false);
    useAppStore.getState().setCurrentTime(duration);
    
    this.stopPositionTracking();
    
    if (this.player && this.player.state === 'started') {
      this.player.stop();
    }

  }

  /**
   * Handle loop end - jump back to loop start
   */
  private async handleLoopEnd(): Promise<void> {
    if (!this.isLooping || this.loopStart === null) {
      return;
    }

    
    // Get current playback state BEFORE making any changes
    const wasPlaying = this.isPlaying;
    
    // Update position immediately to prevent multiple triggers
    this.playbackStartPosition = this.loopStart;
    useAppStore.getState().setCurrentTime(this.loopStart);
    
    // If playing, seek without stopping (Tone.Player can seek during playback)
    if (wasPlaying && this.player) {
      try {
        // Stop current playback
        if (this.player.state === 'started') {
          this.player.stop();
        }
        this.stopPositionTracking();
        
        // Immediately restart from loop start
        this.playbackStartTime = Tone.now();
        this.player.start(Tone.now(), this.loopStart);
        
        // Restart position tracking
        this.startPositionTracking();
        
      } catch (error) {
        // Fallback: use seek method
        await this.seek(this.loopStart);
        if (wasPlaying && !this.isPlaying) {
          await this.play();
        }
      }
    } else {
      // Not playing, just update position
      await this.seek(this.loopStart);
    }
  }

  /**
   * Set playback rate (speed) - pitch is maintained via PitchShift compensation.
   * playbackRate changes both speed and pitch; we compensate with PitchShift so perceived pitch stays constant.
   */
  public setPlaybackRate(rate: number): void {
    const clampedRate = Math.max(0.25, Math.min(4.0, rate));
    this.currentPlaybackRate = clampedRate;

    if (this.player) {
      this.player.playbackRate = clampedRate;
    }

    // Compensate for speed-induced pitch change so pitch stays constant (audio normalization)
    this.applyPitchCompensation();

    // Update store
    useAppStore.getState().setPlaybackRate(clampedRate);

    // Warn about extreme speeds
    if (clampedRate < 0.5) {
    } else if (clampedRate > 2.0) {
    }

  }

  /**
   * Set speed (alias for setPlaybackRate) - maintains pitch
   * @param speed - Speed multiplier (0.25 to 4.0)
   */
  public setSpeed(speed: number): void {
    this.setPlaybackRate(speed);
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

      start, 
      end, 
      duration
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
   * Set pitch shift in semitones - independent of speed
   * Limited to ±2 semitones for quality preservation
   * Supports fractional values (e.g., 0.6, 1.3) for fine control
   * Does NOT interrupt playback - pitch changes smoothly during playback
   */
  public setPitch(semitones: number): void {
    // Clamp to ±2 semitones, allow fractional values (round to 0.1 precision)
    const clampedPitch = Math.max(-2, Math.min(2, Math.round(semitones * 10) / 10));
    this.currentPitch = clampedPitch;

    if (!this.pitchShift) {
      // Update store anyway so UI reflects the change
      useAppStore.getState().setPitch(clampedPitch);
      return;
    }

    try {
      // Ensure Tone.js context is running (only if suspended)
      if (Tone.context.state === 'suspended') {
        Tone.start().catch(() => {
          // Ignore errors - might already be starting
        });
      }

      // Apply pitch with speed compensation (user pitch - pitch from speed = constant perceived pitch)
      this.applyPitchCompensation();
    } catch (error) {
    }

    // Update store with new pitch value
    useAppStore.getState().setPitch(clampedPitch);
  }

  /**
   * Reset pitch to original (0 semitones)
   */
  public resetPitch(): void {
    this.setPitch(0);
  }

  /**
   * Set volume in dB
   */
  public setVolume(db: number): void {
    const clampedDb = Math.max(-60, Math.min(6, db));
    
    if (this.volumeNode) {
      this.volumeNode.volume.value = clampedDb;
    }

  }

  /**
   * Get current playback rate
   */
  public getPlaybackRate(): number {
    return this.currentPlaybackRate;
  }

  /**
   * Get current speed (alias for getPlaybackRate)
   */
  public getSpeed(): number {
    return this.getPlaybackRate();
  }

  /**
   * Get the original file path (not available in web version)
   */
  public getOriginalFilePath(): string | null {
    return null; // Web version doesn't have file path access
  }

  /**
   * Get current pitch in semitones
   */
  public getPitch(): number {
    return this.currentPitch;
  }

  // ============ Compatibility Methods (for waveform component) ============

  /**
   * Get the current audio buffer (for waveform visualization)
   */
  public getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  /**
   * Get the audio context (for compatibility)
   */
  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Get the analyser node for waveform data
   */
  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * Check if audio is loaded
   */
  public isAudioLoaded(): boolean {
    return this.audioBuffer !== null && this.playerLoaded && this.isInitialized;
  }

  /**
   * Get audio duration in seconds
   */
  public getDuration(): number {
    return this.audioBuffer?.duration || 0;
  }

  /**
   * Get audio sample rate
   */
  public getSampleRate(): number {
    return this.audioBuffer?.sampleRate || 44100;
  }

  /**
   * Get number of audio channels
   */
  public getNumberOfChannels(): number {
    return this.audioBuffer?.numberOfChannels || 0;
  }

  /**
   * Check if audio is currently playing
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Resume audio context (required after user interaction)
   */
  public async resumeAudioContext(): Promise<void> {
    if (Tone.context.state !== 'running') {
      await Tone.context.resume();
    }
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {

    // Stop playback
    this.stop();

    // Stop position tracking
    this.stopPositionTracking();

    // Dispose Tone.js nodes
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }

    if (this.pitchShift) {
      this.pitchShift.dispose();
      this.pitchShift = null;
    }

    if (this.volumeNode) {
      this.volumeNode.dispose();
      this.volumeNode = null;
    }

    // Clean up Blob URL
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    // Clear references
    this.audioBuffer = null;
    this.analyserNode = null;
    this.audioContext = null;
    this.isInitialized = false;
    this.playerLoaded = false;
    this.isPlaying = false;

  }
}

// ============ Singleton Management ============

let audioEngineInstance: AudioEngine | null = null;

/**
 * Get or create the AudioEngine singleton instance
 */
export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine();
  }
  return audioEngineInstance;
}

/**
 * Reset the AudioEngine singleton
 */
export function resetAudioEngine(): void {
  if (audioEngineInstance) {
    audioEngineInstance.dispose();
    audioEngineInstance = null;
  }
}
