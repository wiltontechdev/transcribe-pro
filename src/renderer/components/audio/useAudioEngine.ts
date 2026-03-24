// useAudioEngine.ts - React hook for AudioEngine
// Makes AudioEngine easy to use in React components
// Uses Tone.js for browsers, Howler.js for Electron (more reliable)

import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioEngine, getAudioEngine, resetAudioEngine } from './AudioEngine';
import { HowlerAudioEngine, getHowlerAudioEngine, resetHowlerAudioEngine } from './HowlerAudioEngine';
import { useAppStore } from '../../store/store';

// Detect Electron environment
const isElectron = !!(window as any).electronAPI || 
                   (typeof process !== 'undefined' && (process as any).versions && (process as any).versions.electron);

// Common interface for both engines
interface IAudioEngine {
  loadAudioFile(file: File): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  stop(): Promise<void>;
  seek(time: number): Promise<void>;
  getCurrentTime(): number;
  getAudioBuffer(): AudioBuffer | null;
  getAnalyserNode(): AnalyserNode | null;
  isAudioLoaded(): boolean;
  getIsPlaying(): boolean;
  isFormatSupported(file: File): boolean;
  resumeAudioContext(): Promise<void>;
  setPlaybackRate?(rate: number): void;
  setSpeed?(speed: number): void;
  setSpeedPreset?(preset: 'slowest' | 'slow' | 'normal' | 'fast' | 'fastest'): void;
  setPitch?(semitones: number): void;
  resetPitch?(): void;
  setVolume?(db: number): void;
  getPlaybackRate?(): number;
  getSpeed?(): number;
  getPitch?(): number;
}

/**
 * React hook for using AudioEngine
 * 
 * Features:
 * - Uses Tone.js in browsers (independent pitch/speed control)
 * - Uses Howler.js in Electron (more stable, avoids crashes)
 * - Waveform visualization support via AudioBuffer
 * - Zustand store integration for reactive UI updates
 * 
 * @returns AudioEngine instance and helper functions
 */
export function useAudioEngine() {
  const engineRef = useRef<IAudioEngine | null>(null);
  const initializedRef = useRef(false);
  
  // Use global store for loading state (shared across all components)
  const isLoading = useAppStore((state) => state.audio.isLoading);
  const setIsLoading = useAppStore((state) => state.setIsLoading);
  const [error, setError] = useState<string | null>(null);
  
  // Get store actions (these are stable references, won't cause re-renders)
  const setAudioFile = useAppStore((state) => state.setAudioFile);
  const setDuration = useAppStore((state) => state.setDuration);
  const setAudioBuffer = useAppStore((state) => state.setAudioBuffer);
  
  // Get reactive state from store - use selective subscriptions to avoid re-renders on currentTime updates
  const isAudioLoaded = useAppStore((state) => state.audio.isLoaded);
  const isPlaying = useAppStore((state) => state.audio.isPlaying);
  
  // Only log once on first render
  if (!initializedRef.current) {
    initializedRef.current = true;
  }

  // Initialize appropriate engine on mount - only once
  useEffect(() => {
    // Prevent multiple initializations
    if (engineRef.current) {
      return;
    }
    
    if (isElectron) {
      try {
        engineRef.current = getHowlerAudioEngine();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize audio engine');
      }
    } else {
      try {
        engineRef.current = getAudioEngine();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize audio engine');
      }
    }

    // Cleanup on unmount
    return () => {
      // Don't dispose the singleton, just clear reference
      // The singleton will be reused on next mount
      engineRef.current = null;
    };
  }, [isElectron]); // Only depend on isElectron which is constant

  /**
   * Load an audio file
   * Note: Loading state is managed by the Zustand store:
   * - setAudioFile() sets isLoading: true
   * - setAudioBuffer() sets isLoading: false
   */
  const loadFile = useCallback(async (file: File): Promise<void> => {
    
    // Reinitialize engine if it was cleared (e.g., after unloadAudio)
    if (!engineRef.current) {
      if (isElectron) {
        engineRef.current = getHowlerAudioEngine();
      } else {
        engineRef.current = getAudioEngine();
      }
      
      if (!engineRef.current) {
      throw new Error('AudioEngine not initialized');
      }
    }

    setError(null);

    try {
      await engineRef.current.loadAudioFile(file);
      
      // Check store state after load
      const store = useAppStore.getState();
      // Store state after load
      void store; // Suppress unused variable warning
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audio file';
      setError(errorMessage);
      // Reset loading state on error (since setAudioBuffer won't be called)
      setIsLoading(false);
      throw err;
    }
  }, [setIsLoading, isElectron]);

  /**
   * Check if a file format is supported
   */
  const isFormatSupported = useCallback((file: File): boolean => {
    return engineRef.current?.isFormatSupported(file) || false;
  }, []);

  /**
   * Get audio buffer (for waveform visualization)
   */
  const getAudioBuffer = useCallback(() => {
    return engineRef.current?.getAudioBuffer() || null;
  }, []);

  /**
   * Get analyser node for waveform
   */
  const getAnalyserNode = useCallback(() => {
    return engineRef.current?.getAnalyserNode() || null;
  }, []);

  /**
   * Resume audio context (required after user interaction)
   */
  const resumeAudioContext = useCallback(async () => {
    if (!engineRef.current) {
      engineRef.current = isElectron ? getHowlerAudioEngine() : getAudioEngine();
    }

    if (engineRef.current) {
      await engineRef.current.resumeAudioContext();
    }
  }, [isElectron]);

  /**
   * Play audio
   */
  const play = useCallback(async () => {
    // Safety check: ensure engine is initialized and audio is loaded
    if (!engineRef.current) {
      throw new Error('Audio engine not initialized');
    }
    
    // Double-check store state
    const store = useAppStore.getState();
    if (!store.audio.isLoaded) {
      throw new Error('Audio not loaded');
    }
    
    await engineRef.current.play();
  }, []);

  /**
   * Pause audio
   */
  const pause = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pause();
    }
  }, []);

  /**
   * Stop audio
   */
  const stop = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.stop();
    }
  }, []);

  /**
   * Seek to time position
   */
  const seek = useCallback(async (time: number) => {
    if (engineRef.current) {
      await engineRef.current.seek(time);
    }
  }, []);

  /**
   * Get current playback time
   */
  const getCurrentTime = useCallback(() => {
    return engineRef.current?.getCurrentTime() || 0;
  }, []);

  /**
   * Set playback rate (speed) - independent of pitch (Tone.js only)
   * In Electron (Howler), this changes both speed and pitch together
   * @param rate - Speed multiplier (0.25 to 4.0)
   */
  const setPlaybackRate = useCallback((rate: number) => {
    if (engineRef.current && engineRef.current.setPlaybackRate) {
      engineRef.current.setPlaybackRate(rate);
    } else if (engineRef.current && (engineRef.current as any).setRate) {
      // Howler uses setRate
      (engineRef.current as any).setRate(rate);
    }
  }, []);

  /**
   * Set speed (alias for setPlaybackRate) - maintains pitch
   * @param speed - Speed multiplier (0.25 to 4.0)
   */
  const setSpeed = useCallback((speed: number) => {
    if (engineRef.current && engineRef.current.setSpeed) {
      engineRef.current.setSpeed(speed);
    } else {
      // Fallback to setPlaybackRate
      setPlaybackRate(speed);
    }
  }, [setPlaybackRate]);

  /**
   * Set speed using preset
   * @param preset - Speed preset: 'slowest', 'slow', 'normal', 'fast', 'fastest'
   */
  const setSpeedPreset = useCallback((preset: 'slowest' | 'slow' | 'normal' | 'fast' | 'fastest') => {
    if (engineRef.current && engineRef.current.setSpeedPreset) {
      engineRef.current.setSpeedPreset(preset);
    } else {
      // Fallback: map preset to speed value
      const speedMap: Record<string, number> = {
        slowest: 0.25,
        slow: 0.5,
        normal: 1.0,
        fast: 1.5,
        fastest: 2.0,
      };
      const speed = speedMap[preset] || 1.0;
      setSpeed(speed);
    }
  }, [setSpeed]);

  /**
   * Get current speed
   */
  const getSpeed = useCallback((): number => {
    if (engineRef.current && engineRef.current.getSpeed) {
      return engineRef.current.getSpeed();
    } else if (engineRef.current && engineRef.current.getPlaybackRate) {
      return engineRef.current.getPlaybackRate();
    }
    return 1.0; // Default
  }, []);

  /**
   * Set pitch shift in semitones - independent of speed
   * Works in both browser (Tone.js) and Electron (Howler + Tone.js)
   * @param semitones - Pitch shift (-2 to +2 semitones)
   */
  const setPitch = useCallback((semitones: number) => {
    if (engineRef.current && engineRef.current.setPitch) {
      engineRef.current.setPitch(semitones);
    } else {
    }
  }, []);

  /**
   * Reset pitch to original (0 semitones)
   */
  const resetPitch = useCallback(() => {
    if (engineRef.current && (engineRef.current as any).resetPitch) {
      (engineRef.current as any).resetPitch();
    } else if (engineRef.current && engineRef.current.setPitch) {
      engineRef.current.setPitch(0);
    }
  }, []);

  /**
   * Set volume in dB
   * @param db - Volume level (-60 to +6 dB)
   */
  const setVolume = useCallback((db: number) => {
    if (engineRef.current && engineRef.current.setVolume) {
      engineRef.current.setVolume(db);
    } else if (engineRef.current && (engineRef.current as any).setHowlerVolume) {
      // Howler uses linear volume 0-1
      const linearVolume = Math.pow(10, db / 20);
      (engineRef.current as any).setHowlerVolume(Math.max(0, Math.min(1, linearVolume)));
    }
  }, []);

  /**
   * Get current playback rate
   */
  const getPlaybackRate = useCallback(() => {
    if (engineRef.current && engineRef.current.getPlaybackRate) {
      return engineRef.current.getPlaybackRate();
    }
    return 1.0;
  }, []);

  /**
   * Get current pitch in semitones
   */
  const getPitch = useCallback(() => {
    if (engineRef.current && engineRef.current.getPitch) {
      return engineRef.current.getPitch();
    }
    return 0;
  }, []);

  /**
   * Get the original file path (for audio effects processing in Electron)
   */
  const getOriginalFilePath = useCallback(() => {
    if (engineRef.current && (engineRef.current as any).getOriginalFilePath) {
      return (engineRef.current as any).getOriginalFilePath();
    }
    return null;
  }, []);

  /**
   * Set loop between start and end times
   * @param start - Loop start time in seconds
   * @param end - Loop end time in seconds
   */
  const setLoop = useCallback((start: number, end: number) => {
    if (engineRef.current && (engineRef.current as any).setLoop) {
      (engineRef.current as any).setLoop(start, end);
    } else {
    }
  }, []);

  /**
   * Disable looping
   */
  const disableLoop = useCallback(() => {
    if (engineRef.current && (engineRef.current as any).disableLoop) {
      (engineRef.current as any).disableLoop();
    } else {
    }
  }, []);

  /**
   * Unload current audio and reset state
   */
  const unloadAudio = useCallback(async () => {
    // Stop playback first (with fade out)
    if (engineRef.current) {
      try {
      await engineRef.current.stop();
      } catch (err) {
      }
    }
    // Clear our reference first to prevent any operations
    engineRef.current = null;
    
    // Reset the appropriate singleton (await async reset)
    if (isElectron) {
      await resetHowlerAudioEngine();
    } else {
      resetAudioEngine();
    }
    
    // Clear errors and loading state
    setError(null);
    setIsLoading(false);
    
    // Ensure store state reflects that audio is unloaded
    const store = useAppStore.getState();
    if (store.audio.isLoaded) {
      store.setIsLoading(false);
      // The store will be reset by resetProject, but ensure isLoaded is false
      // This is a safety measure in case resetProject isn't called immediately
    }
    
  }, []);

  return {
    audioEngine: engineRef.current,
    isLoading,
    error,
    loadFile,
    isFormatSupported,
    getAudioBuffer,
    getAnalyserNode,
    resumeAudioContext,
    isAudioLoaded, // Now reactive from store
    // Playback methods
    play,
    pause,
    stop,
    seek,
    getCurrentTime,
    unloadAudio,
    isPlaying, // Now reactive from store
    // Speed/Pitch control (new Tone.js features)
    setPlaybackRate,
    setSpeed,
    setSpeedPreset,
    setPitch,
    resetPitch,
    setVolume,
    getPlaybackRate,
    getSpeed,
    getPitch,
    getOriginalFilePath,
    // Loop control
    setLoop,
    disableLoop,
  };
}
