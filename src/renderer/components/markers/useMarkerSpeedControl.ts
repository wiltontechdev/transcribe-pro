// useMarkerSpeedControl.ts
// Hook to apply marker speed only when playback is within marker range
// Speed changes ONLY when crossing marker boundaries, not continuously

import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/store';
import { useAudioEngine } from '../audio/useAudioEngine';
import { MarkerManager } from './MarkerManager';

/**
 * Hook to monitor playback position and apply marker speed only within marker range
 * Speed is applied ONCE when entering marker range and stays constant until leaving
 */
export function useMarkerSpeedControl() {
  const selectedMarkerId = useAppStore((state) => state.ui.selectedMarkerId);
  const { setSpeed } = useAudioEngine();
  
  // Track state to only change speed when crossing boundaries
  const lastInRangeStateRef = useRef<boolean | null>(null); // null = unknown, true = in range, false = out of range
  const lastAppliedSpeedRef = useRef<number | null>(null);
  const lastMarkerIdRef = useRef<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const lastSpeedChangeTimeRef = useRef<number>(0); // Track when speed was last changed
  
  // Store original duration (before speed changes) for accurate range checks
  // Markers are based on original timeline, not effective timeline
  const originalDurationRef = useRef<number | null>(null);
  
  // Capture original duration when audio loads
  useEffect(() => {
    const store = useAppStore.getState();
    const playbackRate = store.globalControls.playbackRate;
    const duration = store.audio.duration;
    
    // If duration exists and we haven't stored it yet, or if it's the "normal" duration (1x speed)
    // Store it as the original duration
    if (duration > 0) {
      // If speed is 1.0, this is likely the original duration
      // If speed is not 1.0, calculate original: effectiveDuration * speed = originalDuration
      if (playbackRate === 1.0 || originalDurationRef.current === null) {
        // Calculate original duration: effectiveDuration * currentSpeed = originalDuration
        const calculatedOriginal = duration * playbackRate;
        if (originalDurationRef.current === null || Math.abs(calculatedOriginal - originalDurationRef.current) > 1) {
          originalDurationRef.current = calculatedOriginal;
        }
      }
    }
  }, [useAppStore.getState().audio.duration, useAppStore.getState().globalControls.playbackRate]);

  // When marker is activated/deactivated, reset state tracking and immediately apply speed if in range
  useEffect(() => {
    if (!selectedMarkerId) {
      // No marker active - reset speed to normal
      if (lastAppliedSpeedRef.current !== 1.0 && !isUpdatingRef.current) {
        isUpdatingRef.current = true;
        setSpeed(1.0);
        lastAppliedSpeedRef.current = 1.0;
        lastMarkerIdRef.current = null;
        lastInRangeStateRef.current = null;
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 50);
      }
      return;
    }

    const activeMarker = MarkerManager.getMarker(selectedMarkerId);
    if (!activeMarker) {
      if (lastAppliedSpeedRef.current !== 1.0 && !isUpdatingRef.current) {
        isUpdatingRef.current = true;
        setSpeed(1.0);
        lastAppliedSpeedRef.current = 1.0;
        lastMarkerIdRef.current = null;
        lastInRangeStateRef.current = null;
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 50);
      }
      return;
    }

    // Marker changed - check if we're currently in range and apply speed immediately
    if (lastMarkerIdRef.current !== selectedMarkerId) {
      const previousMarkerId = lastMarkerIdRef.current;
      lastMarkerIdRef.current = selectedMarkerId;
      
      // Get marker speed - THIS marker's speed, not the previous one
      const markerSpeed = activeMarker.speed !== undefined ? activeMarker.speed : 1.0;
      
      
      // When marker changes, always apply its speed if we're in range
      // Use a small delay to allow seek operations to complete first
      setTimeout(() => {
        const store = useAppStore.getState();
        const currentTime = store.audio.currentTime;
        
        // Check if current position is within marker range (with small buffer for timing)
        const buffer = 0.5; // Larger buffer to account for seek timing and ensure we catch it
        const isInRange = currentTime >= (activeMarker.start - buffer) && currentTime <= (activeMarker.end + buffer);
        
        if (isInRange) {
          // We're in range - FORCE apply marker speed immediately (always apply, even if it was the same)
          // This ensures nested markers get their own speed applied
          if (!isUpdatingRef.current) {
            isUpdatingRef.current = true;
            // Force application by clearing the last applied speed first
            const previousSpeed = lastAppliedSpeedRef.current;
            lastAppliedSpeedRef.current = null; // Clear to force reapplication
            
            setSpeed(markerSpeed);
            lastAppliedSpeedRef.current = markerSpeed;
            lastInRangeStateRef.current = true;
            setTimeout(() => {
              isUpdatingRef.current = false;
            }, 300);
          }
        } else {
          // Not in range - reset state tracking (speed will be applied when entering range)
          lastInRangeStateRef.current = false;
          // If we were previously in a different marker's range, reset to normal speed
          if (lastAppliedSpeedRef.current !== 1.0 && !isUpdatingRef.current) {
            isUpdatingRef.current = true;
            setSpeed(1.0);
            lastAppliedSpeedRef.current = 1.0;
            setTimeout(() => {
              isUpdatingRef.current = false;
            }, 300);
          }
        }
      }, 200); // Delay to allow seek to complete
    }
  }, [selectedMarkerId, setSpeed]);

  // Monitor playback position - ONLY change speed when crossing boundaries
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!selectedMarkerId) {
      lastInRangeStateRef.current = null;
      return; // No marker active, nothing to monitor
    }

    // Set up interval to check position periodically (every 500ms to reduce checks and prevent flickering)
    intervalRef.current = window.setInterval(() => {
      if (isUpdatingRef.current) return; // Prevent nested updates

      const store = useAppStore.getState();
      const currentTime = store.audio.currentTime;
      const isPlaying = store.audio.isPlaying;
      const currentSpeed = store.globalControls.playbackRate;
      
      // Only adjust speed during playback
      if (!isPlaying) {
        return;
      }

      const activeMarker = MarkerManager.getMarker(selectedMarkerId);
      if (!activeMarker) {
        return;
      }

      // getCurrentTime() now returns ORIGINAL timeline time (duration never changes with speed)
      // Markers are also defined in ORIGINAL timeline
      // No conversion needed - both are in the same timeline
      
      // Store original duration (it never changes with speed)
      if (originalDurationRef.current === null) {
        const duration = store.audio.duration;
        if (duration > 0) {
          originalDurationRef.current = duration;
        } else {
          // Can't calculate yet, skip this check
          return;
        }
      }
      
      // currentTime is already in ORIGINAL timeline (no conversion needed)
      const originalTime = currentTime;
      
      // Check if playback is within marker range using ORIGINAL timeline
      // Use MUCH LARGER buffer with hysteresis to prevent rapid toggling
      // Increased buffers to prevent flickering when speed changes cause time jumps
      const enterBuffer = 1.0; // Buffer when entering (very forgiving)
      const exitBuffer = 1.5;   // Buffer when exiting (even more forgiving to prevent flicker)
      
      // Hysteresis: different thresholds for entering vs exiting
      let isInRange: boolean;
      if (lastInRangeStateRef.current === true) {
        // Currently in range - use exit buffer (harder to exit)
        // Only exit if we're clearly outside the marker range
        isInRange = originalTime >= (activeMarker.start - exitBuffer) && originalTime <= (activeMarker.end + exitBuffer);
      } else {
        // Currently out of range - use enter buffer (easier to enter)
        // Enter if we're close to or within the marker range
        isInRange = originalTime >= (activeMarker.start - enterBuffer) && originalTime <= (activeMarker.end + enterBuffer);
      }
      
      const markerSpeed = activeMarker.speed !== undefined ? activeMarker.speed : 1.0;

      // ONLY change speed when state changes (crossing boundary)
      // This prevents continuous updates while within or outside marker
      if (lastInRangeStateRef.current !== isInRange) {
        // State changed - we crossed a boundary
        lastInRangeStateRef.current = isInRange;
        
        if (isInRange) {
          // Entered marker range - apply marker speed ONCE
          // IMPORTANT: Always check against the CURRENT selected marker's speed, not the last applied
          // This ensures nested markers get their correct speed
          if (lastAppliedSpeedRef.current !== markerSpeed) {
            isUpdatingRef.current = true;
            setSpeed(markerSpeed);
            lastAppliedSpeedRef.current = markerSpeed;
            lastSpeedChangeTimeRef.current = Date.now();
            setTimeout(() => {
              isUpdatingRef.current = false;
            }, 500); // Longer timeout to prevent rapid updates
          } else if (lastAppliedSpeedRef.current === markerSpeed) {
            // Speed is already correct, but ensure it's actually applied (in case of timing issues)
            // This is a safety check for nested markers
          }
        } else {
          // Exited marker range - reset to normal speed ONCE
          if (lastAppliedSpeedRef.current !== 1.0) {
            isUpdatingRef.current = true;
            setSpeed(1.0);
            lastAppliedSpeedRef.current = 1.0;
            lastSpeedChangeTimeRef.current = Date.now();
            setTimeout(() => {
              isUpdatingRef.current = false;
            }, 500); // Longer timeout to prevent rapid updates
          }
        }
      }
      // If state hasn't changed, do nothing - speed stays constant
    }, 1000); // Check every 1000ms (reduced frequency to prevent flickering)

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedMarkerId, setSpeed]);
}
