// AudioEngineExample.tsx - Example usage of AudioEngine
// This is a reference implementation - you can use this pattern in your components

import React from 'react';
import { useAudioEngine } from './useAudioEngine';
import { pickAudioFile, validateAudioFile } from './audioFilePicker';
import { useAppStore } from '../../store/store';

/**
 * Example component showing how to use AudioEngine
 * This demonstrates the audio file loading functionality
 */
export const AudioEngineExample: React.FC = () => {
  const { 
    loadFile, 
    isLoading, 
    error, 
    isAudioLoaded, 
    resumeAudioContext,
    play,
    pause,
    stop,
    seek,
    isPlaying
  } = useAudioEngine();
  const audio = useAppStore((state) => state.audio);

  const handleLoadAudio = async () => {
    try {
      // Resume audio context (required after user interaction)
      await resumeAudioContext();

      // Open file picker
      const file = await pickAudioFile();

      if (!file) {
        return;
      }

      // Validate file
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      // Load audio file
      await loadFile(file);
    } catch (err) {
      alert(`Failed to load audio: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handlePlay = async () => {
    try {
      await resumeAudioContext();
      await play();
    } catch (err) {
    }
  };

  const handleSeek = async (time: number) => {
    try {
      await seek(time);
    } catch (err) {
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h3>AudioEngine Example</h3>
      
      <button
        onClick={handleLoadAudio}
        disabled={isLoading}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? 'Loading...' : 'Load Audio File'}
      </button>

      {error && (
        <div style={{ color: 'red', marginTop: '1rem' }}>
          Error: {error}
        </div>
      )}

      {isAudioLoaded && audio.file && (
        <div style={{ marginTop: '1rem' }}>
          <h4>Loaded Audio:</h4>
          <p><strong>File:</strong> {audio.file.name}</p>
          <p><strong>Duration:</strong> {audio.duration.toFixed(2)} seconds</p>
          <p><strong>Current Time:</strong> {audio.currentTime.toFixed(2)} seconds</p>
          <p><strong>Sample Rate:</strong> {audio.sampleRate} Hz</p>
          <p><strong>Size:</strong> {(audio.file.size / 1024 / 1024).toFixed(2)} MB</p>
          
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button onClick={handlePlay} disabled={isPlaying}>
              {isPlaying ? 'Playing...' : 'Play'}
            </button>
            <button onClick={pause} disabled={!isPlaying}>
              Pause
            </button>
            <button onClick={stop} disabled={!isAudioLoaded}>
              Stop
            </button>
            <button onClick={() => handleSeek(0)} disabled={!isAudioLoaded}>
              Seek to Start
            </button>
            <button onClick={() => handleSeek(audio.duration / 2)} disabled={!isAudioLoaded}>
              Seek to Middle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

