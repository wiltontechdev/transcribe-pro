// AudioEngineAPI.ts - Public API Interface for AudioEngine
// This file documents the public API that other components should use

import { AudioEngine, getAudioEngine } from './AudioEngine';
import { useAudioEngine } from './useAudioEngine';
import { pickAudioFile, validateAudioFile } from './audioFilePicker';

/**
 * Public API for AudioEngine
 * 
 * This interface defines the public methods and properties that other components
 * should use to interact with the AudioEngine.
 * 
 * @example
 * ```typescript
 * // Using the hook (recommended for React components)
 * const { loadFile, play, pause, stop, seek } = useAudioEngine();
 * 
 * // Using the class directly
 * const engine = getAudioEngine();
 * await engine.loadAudioFile(file);
 * await engine.play();
 * ```
 */
export interface IAudioEngineAPI {
  // ==================== File Loading ====================
  
  /**
   * Load and decode an audio file
   * Automatically updates Zustand store with:
   * - audio.file
   * - audio.buffer
   * - audio.duration
   * - audio.sampleRate
   * 
   * @param file - Audio file to load (MP3, WAV, OGG, FLAC, M4A, AAC)
   * @throws {Error} If file is unsupported, corrupted, or cannot be decoded
   * 
   * @example
   * ```typescript
   * const file = await pickAudioFile();
   * await engine.loadAudioFile(file);
   * ```
   */
  loadAudioFile(file: File): Promise<void>;

  /**
   * Check if a file format is supported
   * 
   * @param file - File to check
   * @returns true if format is supported
   */
  isFormatSupported(file: File): boolean;

  // ==================== Playback Controls ====================

  /**
   * Start or resume audio playback
   * Updates Zustand store: audio.isPlaying = true
   * 
   * @throws {Error} If no audio is loaded
   * 
   * @example
   * ```typescript
   * await engine.play();
   * ```
   */
  play(): Promise<void>;

  /**
   * Pause audio playback
   * Updates Zustand store: 
   * - audio.isPlaying = false
   * - audio.currentTime = paused position
   * 
   * @example
   * ```typescript
   * engine.pause();
   * ```
   */
  pause(): void;

  /**
   * Stop audio playback and reset to beginning
   * Updates Zustand store:
   * - audio.isPlaying = false
   * - audio.currentTime = 0
   * 
   * @example
   * ```typescript
   * engine.stop();
   * ```
   */
  stop(): void;

  /**
   * Seek to a specific time position
   * Updates Zustand store: audio.currentTime = seekTime
   * 
   * @param time - Time in seconds (0 to duration)
   * @throws {Error} If no audio is loaded
   * 
   * @example
   * ```typescript
   * await engine.seek(30); // Jump to 30 seconds
   * ```
   */
  seek(time: number): Promise<void>;

  // ==================== State Queries ====================

  /**
   * Get current playback time in seconds
   * Real-time updates: Store is updated every 100ms via setCurrentTime()
   * 
   * @returns Current time in seconds
   */
  getCurrentTime(): number;

  /**
   * Get audio duration in seconds
   * Stored in Zustand: audio.duration
   * 
   * @returns Duration in seconds
   */
  getDuration(): number;

  /**
   * Check if audio is currently playing
   * Stored in Zustand: audio.isPlaying
   * 
   * @returns true if playing
   */
  getIsPlaying(): boolean;

  /**
   * Check if audio is loaded
   * Stored in Zustand: audio.isLoaded
   * 
   * @returns true if audio is loaded
   */
  isAudioLoaded(): boolean;

  // ==================== Audio Data Access ====================

  /**
   * Get decoded AudioBuffer
   * Stored in Zustand: audio.buffer
   * 
   * @returns AudioBuffer or null
   */
  getAudioBuffer(): AudioBuffer | null;

  /**
   * Get AudioContext
   * 
   * @returns AudioContext or null
   */
  getAudioContext(): AudioContext | null;

  /**
   * Get AnalyserNode for waveform data
   * 
   * @returns AnalyserNode or null
   */
  getAnalyserNode(): AnalyserNode | null;

  /**
   * Get GainNode for volume control
   * 
   * @returns GainNode or null
   */
  getGainNode(): GainNode | null;

  /**
   * Get sample rate
   * Stored in Zustand: audio.sampleRate
   * 
   * @returns Sample rate in Hz
   */
  getSampleRate(): number;

  /**
   * Get number of audio channels
   * 
   * @returns Number of channels
   */
  getNumberOfChannels(): number;

  // ==================== Audio Context Management ====================

  /**
   * Resume audio context (required after user interaction)
   * Browser security requires user interaction before audio can play
   * 
   * @example
   * ```typescript
   * await engine.resumeAudioContext();
   * await engine.play();
   * ```
   */
  resumeAudioContext(): Promise<void>;

  // ==================== Cleanup ====================

  /**
   * Clean up all resources
   * Stops playback, clears buffers, closes audio context
   * 
   * @example
   * ```typescript
   * engine.dispose();
   * ```
   */
  dispose(): void;
}

/**
 * Zustand Store Integration
 * 
 * The AudioEngine automatically updates the following store properties:
 * 
 * - audio.file: File | null
 * - audio.buffer: AudioBuffer | undefined
 * - audio.duration: number (in seconds)
 * - audio.currentTime: number (in seconds, updated every 100ms)
 * - audio.isPlaying: boolean
 * - audio.isLoaded: boolean
 * - audio.sampleRate: number | undefined
 * 
 * Real-time Updates:
 * - currentTime is updated every 100ms during playback
 * - isPlaying is updated on play/pause/stop
 * - All updates happen automatically, no manual store updates needed
 */

/**
 * Error Handling
 * 
 * The AudioEngine provides comprehensive error handling:
 * 
 * 1. Unsupported Formats:
 *    - Checks file extension and MIME type
 *    - Throws clear error message with supported formats list
 * 
 * 2. Corrupted Files:
 *    - Validates file size (non-empty)
 *    - Validates decoded buffer (non-empty, valid duration)
 *    - Catches decode errors with specific error types
 * 
 * 3. Decode Errors:
 *    - EncodingError: File is corrupted or unsupported format
 *    - NotSupportedError: Format not supported by browser
 *    - Generic errors: Wrapped with context
 * 
 * 4. Store Reset:
 *    - On any error, store is reset to initial state
 *    - Prevents inconsistent state
 * 
 * @example Error handling
 * ```typescript
 * try {
 *   await engine.loadAudioFile(file);
 * } catch (error) {
 *   if (error.message.includes('Unsupported')) {
 *     // Handle unsupported format
 *   } else if (error.message.includes('corrupted')) {
 *     // Handle corrupted file
 *   } else {
 *     // Handle other errors
 *   }
 * }
 * ```
 */

// Export the actual AudioEngine class as implementing the API
export type { AudioEngine };
export { getAudioEngine, useAudioEngine, pickAudioFile, validateAudioFile };


