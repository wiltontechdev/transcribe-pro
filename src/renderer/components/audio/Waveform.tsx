// Waveform.tsx - Julius - Week 1
// Waveform rendering component using Canvas

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../../store/store';
import { useAudioEngine } from './useAudioEngine';
import { useSmoothViewport } from '../../hooks/useSmoothViewport';

/**
 * Peak data structure
 * Represents min/max amplitude values for a single pixel position
 */
interface Peak {
  min: number;
  max: number;
}

/**
 * Stereo peaks - separate peaks for left and right channels
 */
interface StereoPeaks {
  left: Peak[];
  right: Peak[];
}

/**
 * Cache metadata to track when peaks need regeneration
 */
interface PeakCache {
  peaks: Peak[] | StereoPeaks | null;
  bufferId: string | null; // Track buffer reference
  canvasWidth: number;
  zoomLevel: number;
  isStereo: boolean;
}

const Waveform: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const zoomAnimationRef = useRef<number | null>(null);
  
  // Animated viewport state for smooth zoom transitions
  const animatedViewportRef = useRef({ start: 0, end: 0, initialized: false });
  const targetViewportRef = useRef({ start: 0, end: 0 });
  const [animationTick, setAnimationTick] = useState(0); // Triggers re-renders during zoom animation
  
  // Hover state for interactive time display
  const [hoverInfo, setHoverInfo] = useState<{ x: number; time: number; visible: boolean }>({
    x: 0,
    time: 0,
    visible: false
  });
  
  // Click feedback state
  const [clickFeedback, setClickFeedback] = useState(false);
  
  // Get audio engine for seek functionality
  const { seek } = useAudioEngine();
  
  // Get audio buffer, zoom level, and playback state from Zustand store
  const audioBuffer = useAppStore((state) => state.audio.buffer);
  const zoomLevel = useAppStore((state) => state.ui.zoomLevel);
  const setZoomLevel = useAppStore((state) => state.setZoomLevel);
  const viewportStart = useAppStore((state) => state.ui.viewportStart);
  const viewportEnd = useAppStore((state) => state.ui.viewportEnd);
  const setViewport = useAppStore((state) => state.setViewport);
  const currentTime = useAppStore((state) => state.audio.currentTime);
  const duration = useAppStore((state) => state.audio.duration);
  const isPlaying = useAppStore((state) => state.audio.isPlaying);
  const activeMarkerId = useAppStore((state) => state.ui.selectedMarkerId); // For triggering redraw when marker changes
  const markers = useAppStore((state) => state.markers); // For triggering redraw when markers change
  
  // Note: Active marker data is read inside drawWaveformWithBuffer from store state
  // to ensure fresh values during animation frames
  
  // Reset animated viewport when new audio is loaded
  // Store sets buffer+viewport+zoom together (web and Electron); use store viewport
  useEffect(() => {
    if (audioBuffer && duration > 0) {
      const end = viewportEnd > 0 && viewportEnd <= duration ? viewportEnd : duration / 5;
      const start = viewportStart >= 0 && viewportStart < end ? viewportStart : 0;
      animatedViewportRef.current = { start, end, initialized: true };
      targetViewportRef.current = { start, end };
      setAnimationTick(n => n + 1);
    }
  }, [audioBuffer, duration, viewportStart, viewportEnd]);
  
  // Update viewport when duration changes (e.g., speed change)
  // This ensures waveform and timer stay in sync when speed changes
  useEffect(() => {
    if (duration > 0 && animatedViewportRef.current.initialized) {
      // When duration changes (speed change), adjust viewport proportionally
      const oldEnd = animatedViewportRef.current.end;
      if (oldEnd > 0 && Math.abs(oldEnd - duration) > 0.01) {
        // Scale the viewport to match new duration
        const scale = duration / oldEnd;
        const newStart = animatedViewportRef.current.start * scale;
        const newEnd = duration;
        
        // Update viewport
        animatedViewportRef.current = { 
          start: Math.max(0, Math.min(newStart, duration)), 
          end: Math.max(0, Math.min(newEnd, duration)), 
          initialized: true 
        };
        targetViewportRef.current = { 
          start: Math.max(0, Math.min(newStart, duration)), 
          end: Math.max(0, Math.min(newEnd, duration)) 
        };
        setViewport(Math.max(0, Math.min(newStart, duration)), Math.max(0, Math.min(newEnd, duration)));
        setAnimationTick(n => n + 1);
      }
    }
  }, [duration, setViewport]);
  
  // Sync animated viewport ref with store values directly for perfect sync with MarkerTimeline
  // Animation is now handled by useSmoothViewport hook which updates the store
  useEffect(() => {
    const targetStart = viewportStart;
    const targetEnd = viewportEnd > 0 ? viewportEnd : duration;
    
    // Update animated viewport ref directly from store values
    // This ensures perfect sync with MarkerTimeline which also reads from store
    if (targetEnd > 0) {
      animatedViewportRef.current = { start: targetStart, end: targetEnd, initialized: true };
      targetViewportRef.current = { start: targetStart, end: targetEnd };
      // Force re-render to update waveform
      setAnimationTick(n => n + 1);
    }
  }, [viewportStart, viewportEnd, duration]);
  
  // Cache peaks outside component state to avoid unnecessary re-renders
  const peakCacheRef = useRef<PeakCache>({
    peaks: null,
    bufferId: null,
    canvasWidth: 0,
    zoomLevel: 1,
    isStereo: false,
  });

  /**
   * Measure container and set canvas dimensions
   * Handles device pixel ratio for high-DPI screens
   */
  const updateCanvasSize = () => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const rect = container.getBoundingClientRect();
    
    // Get CSS dimensions
    const cssWidth = Math.max(1, rect.width); // Ensure at least 1px
    const cssHeight = Math.max(1, rect.height); // Ensure at least 1px

    // Get device pixel ratio for high-DPI screens
    const devicePixelRatio = window.devicePixelRatio || 1;

    // Set canvas internal size (actual pixels)
    const internalWidth = cssWidth * devicePixelRatio;
    const internalHeight = cssHeight * devicePixelRatio;

    // Set canvas display size (CSS pixels)
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    // Set canvas internal resolution
    canvas.width = internalWidth;
    canvas.height = internalHeight;

    // Get 2D drawing context
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale the context by devicePixelRatio
    // This allows us to draw in CSS pixels, but render at physical resolution
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Update state for drawing logic
    setCanvasSize({ width: cssWidth, height: cssHeight });

    // Get current audio buffer from store (always fresh)
    const currentBuffer = useAppStore.getState().audio.buffer;
    
    // Redraw waveform after resize
    drawWaveformWithBuffer(ctx, cssWidth, cssHeight, currentBuffer);
  };

  /**
   * Generate peaks from AudioBuffer for a single channel
   * Converts raw samples into manageable peaks (one per pixel)
   * Now supports viewport for zoomed view
   * 
   * @param channelData - Float32Array of audio samples for one channel
   * @param canvasWidth - Width of canvas in pixels
   * @param sampleRate - Sample rate of the audio
   * @param viewportStart - Start time in seconds (for zoomed view)
   * @param viewportEnd - End time in seconds (for zoomed view)
   * @returns Array of peaks, one per pixel
   */
  const generatePeaksForChannel = (
    channelData: Float32Array, 
    canvasWidth: number,
    sampleRate: number,
    viewportStart: number,
    viewportEnd: number
  ): Peak[] => {
    if (!channelData || canvasWidth <= 0 || channelData.length === 0) {
      return [];
    }

    const width = Math.floor(canvasWidth);
    if (width <= 0) return [];
    
    const totalSamples = channelData.length;
    const duration = totalSamples / sampleRate;
    
    // Calculate sample range for viewport
    const vpStart = Math.max(0, viewportStart);
    const vpEnd = Math.min(duration, viewportEnd > vpStart ? viewportEnd : duration);
    
    // Convert viewport times to sample indices
    const startSampleIndex = Math.floor((vpStart / duration) * totalSamples);
    const endSampleIndex = Math.min(Math.floor((vpEnd / duration) * totalSamples), totalSamples);
    const viewportSamples = endSampleIndex - startSampleIndex;
    
    if (viewportSamples <= 0) return [];
    
    const samplesPerPixel = viewportSamples / width;
    
    // Pre-allocate array for speed
    const peaks: Peak[] = new Array(width);
    
    // For very large sample counts per pixel, sample at intervals for speed
    const maxSamplesToCheck = 500;
    const step = samplesPerPixel > maxSamplesToCheck ? Math.floor(samplesPerPixel / maxSamplesToCheck) : 1;

    // Loop through each pixel position
    for (let pixelIndex = 0; pixelIndex < width; pixelIndex++) {
      const startSample = startSampleIndex + Math.floor(pixelIndex * samplesPerPixel);
      const endSample = Math.min(
        startSampleIndex + Math.floor((pixelIndex + 1) * samplesPerPixel),
        endSampleIndex
      );
      
      if (startSample >= totalSamples || endSample <= startSample) {
        peaks[pixelIndex] = { min: 0, max: 0 };
        continue;
      }
      
      // Initialize min/max with first sample
      let min = channelData[startSample];
      let max = channelData[startSample];
      
      // Loop through samples with step (faster for large ranges)
      for (let i = startSample; i < endSample; i += step) {
        const sample = channelData[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      
      peaks[pixelIndex] = { min, max };
    }

    return peaks;
  };

  /**
   * Generate peaks from AudioBuffer
   * Supports both mono and stereo audio with viewport for zoomed view
   * 
   * @param buffer - AudioBuffer containing raw audio samples
   * @param canvasWidth - Width of canvas in pixels
   * @param viewportStart - Start time in seconds
   * @param viewportEnd - End time in seconds
   * @returns Peaks array (mono) or StereoPeaks object (stereo)
   */
  const generatePeaks = (
    buffer: AudioBuffer, 
    canvasWidth: number,
    viewportStart: number,
    viewportEnd: number
  ): Peak[] | StereoPeaks => {
    if (!buffer || canvasWidth <= 0) {
      return [];
    }

    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    
    // Mono: use only left channel (channel 0)
    if (numberOfChannels === 1) {
      const channelData = buffer.getChannelData(0);
      return generatePeaksForChannel(channelData, canvasWidth, sampleRate, viewportStart, viewportEnd);
    }
    
    // Stereo: generate peaks for both channels
    const leftChannelData = buffer.getChannelData(0);
    const rightChannelData = buffer.getChannelData(1);
    
    return {
      left: generatePeaksForChannel(leftChannelData, canvasWidth, sampleRate, viewportStart, viewportEnd),
      right: generatePeaksForChannel(rightChannelData, canvasWidth, sampleRate, viewportStart, viewportEnd),
    };
  };

  // Track last regeneration time for throttling during animation
  const lastPeakRegenTimeRef = useRef(0);
  
  /**
   * Get cached peaks or generate new ones if needed
   * Regenerates when viewport, zoom, or audio changes
   * Throttled during animation for smooth performance
   */
  const getPeaks = (
    buffer: AudioBuffer | undefined, 
    canvasWidth: number, 
    currentZoomLevel: number,
    vpStart: number,
    vpEnd: number
  ): Peak[] | StereoPeaks | null => {
    if (!buffer || canvasWidth <= 0) {
      return null;
    }

    // Safety checks for NaN or invalid viewport values
    const safeVpStart = (isFinite(vpStart) && !isNaN(vpStart) && vpStart >= 0) ? vpStart : 0;
    const safeVpEnd = (isFinite(vpEnd) && !isNaN(vpEnd) && vpEnd > safeVpStart && vpEnd <= buffer.duration) 
      ? vpEnd 
      : buffer.duration;

    const cache = peakCacheRef.current;
    const isStereo = buffer.numberOfChannels > 1;
    
    // Create a unique identifier for this buffer
    const bufferId = `${buffer.length}-${buffer.sampleRate}-${buffer.duration}-${buffer.numberOfChannels}`;
    
    // Round viewport values to reduce unnecessary regeneration during animation
    // Use 2 decimal places - gives good balance between accuracy and performance
    const roundedVpStart = Math.round(safeVpStart * 100) / 100;
    const roundedVpEnd = Math.round(safeVpEnd * 100) / 100;
    const viewportKey = `${roundedVpStart}-${roundedVpEnd}`;
    
    // Check if we need to regenerate peaks (including viewport changes)
    const needsRegeneration = 
      cache.bufferId !== bufferId ||
      cache.canvasWidth !== canvasWidth ||
      cache.zoomLevel !== currentZoomLevel ||
      cache.isStereo !== isStereo ||
      (cache as any).viewportKey !== viewportKey;

    if (needsRegeneration) {
      // Throttle peak regeneration during animation (max 10fps = 100ms intervals)
      const now = performance.now();
      const timeSinceLastRegen = now - lastPeakRegenTimeRef.current;
      const throttleInterval = 100; // ms
      
      // If we regenerated recently, return cached peaks (but will use new viewport for drawing positions)
      if (timeSinceLastRegen < throttleInterval && cache.peaks) {
        return cache.peaks;
      }
      
      lastPeakRegenTimeRef.current = now;
      
      // Generate new peaks with viewport
      const peaks = generatePeaks(buffer, canvasWidth, roundedVpStart, roundedVpEnd);
      
      // Log peak generation (minimal logging)
      if (Array.isArray(peaks)) {
      } else if (peaks && 'left' in peaks) {
      }
      
      // Update cache
      cache.peaks = peaks;
      cache.bufferId = bufferId;
      cache.canvasWidth = canvasWidth;
      cache.zoomLevel = currentZoomLevel;
      cache.isStereo = isStereo;
      (cache as any).viewportKey = viewportKey;
    }

    return cache.peaks;
  };

  /**
   * Calculate appropriate time interval based on VISIBLE duration
   * MUST match MarkerTimeline intervals exactly for alignment
   * Added finer intervals for zoomed views to prevent large gaps
   */
  const getTimeInterval = (visibleDuration: number): number => {
    // Match MarkerTimeline.tsx intervals exactly
    // Finer intervals for highly zoomed views
    if (visibleDuration < 2) return 0.25;      // 0.25 seconds for < 2 sec visible (very zoomed)
    if (visibleDuration < 5) return 0.5;       // 0.5 seconds for < 5 sec visible
    if (visibleDuration < 10) return 1;        // 1 second for < 10 sec visible
    if (visibleDuration < 20) return 2;        // 2 seconds for < 20 sec visible
    if (visibleDuration < 30) return 5;        // 5 seconds for < 30 sec visible
    if (visibleDuration < 60) return 10;       // 10 seconds for < 1 min visible
    if (visibleDuration < 180) return 15;      // 15 seconds for < 3 min visible
    if (visibleDuration < 600) return 30;      // 30 seconds for < 10 min visible
    if (visibleDuration < 1800) return 60;     // 1 minute for < 30 min visible
    return 300;                                 // 5 minutes for > 30 min visible
  };

  /**
   * Draw time grid overlay on canvas
   * Draws only vertical reference lines (no labels - they're in MarkerTimeline)
   * Lines align exactly with MarkerTimeline below (uses viewport for zoom)
   */
  const drawTimeGrid = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    visibleDuration: number,
    offsetX: number,
    usableWidth: number,
    viewportStart: number,
    viewportEnd: number
  ) => {
    if (visibleDuration <= 0 || usableWidth <= 0) return;

    // Calculate interval based on visible duration (matches MarkerTimeline)
    const interval = getTimeInterval(visibleDuration);
    
    ctx.save();
    
    // Start from first interval point at or after viewportStart
    const firstMarkerTime = Math.ceil(viewportStart / interval) * interval;
    
    // Draw intermediate gridlines (half-interval) for finer resolution
    const subInterval = interval / 2;
    const firstSubMarkerTime = Math.ceil(viewportStart / subInterval) * subInterval;
    
    for (let time = firstSubMarkerTime; time <= viewportEnd; time += subInterval) {
      const relativeTime = time - viewportStart;
      const x = Math.round(offsetX + (relativeTime / visibleDuration) * usableWidth);
      
      if (x >= offsetX && x <= width - offsetX) {
        // Check if this is a main interval or sub-interval
        const isMainInterval = Math.abs(time % interval) < 0.001 || Math.abs((time % interval) - interval) < 0.001;
        
        if (isMainInterval) {
          // Main grid lines - brighter
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 1;
        } else {
          // Sub grid lines - more subtle
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 0.5;
        }
        
        // Draw vertical line at half-pixel offset for crisp lines
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  };

  /**
   * Draw playhead indicator showing current playback position
   * 
   * @param ctx - 2D rendering context
   * @param height - Canvas height
   * @param progressX - X position of the playhead
   */
  const drawPlayhead = (
    ctx: CanvasRenderingContext2D,
    height: number,
    progressX: number
  ) => {
    ctx.save();
    
    // Draw playhead line
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 4;
    
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();
    
    // Draw playhead triangle at top
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(progressX - 6, 0);
    ctx.lineTo(progressX + 6, 0);
    ctx.lineTo(progressX, 8);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  };

  /**
   * Draw waveform on canvas using cached peaks
   * @param ctx - 2D rendering context
   * @param width - Canvas width in CSS pixels
   * @param height - Canvas height in CSS pixels
   * @param buffer - AudioBuffer to draw (optional, uses current audioBuffer if not provided)
   */
  const drawWaveformWithBuffer = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    buffer?: AudioBuffer | undefined
  ) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Use provided buffer or current audioBuffer from closure
    const bufferToUse = buffer !== undefined ? buffer : audioBuffer;

    // Draw dark background
    ctx.fillStyle = '#0F0F0F';
    ctx.fillRect(0, 0, width, height);

    if (!bufferToUse) {
      const storeStateForPlaceholder = useAppStore.getState();
      const hasAudio = storeStateForPlaceholder.audio.isLoaded && storeStateForPlaceholder.audio.duration > 0;
      ctx.font = '16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (hasAudio) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText('Building waveform…', width / 2, height / 2);
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('Longer files take a moment', width / 2, height / 2 + 22);
      } else {
        ctx.fillStyle = '#E85A4A';
        ctx.fillText('No audio loaded', width / 2, height / 2);
      }
      return;
    }

    // Align with MarkerTimeline: use same padding calculation
    // Minimal padding on mobile for edge-to-edge display
    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
    const TIME_LABEL_PADDING = isMobileDevice ? 8 : 50;
    const usableWidth = Math.max(0, width - (TIME_LABEL_PADDING * 2));
    
    // Get fresh values from store for animation frame updates
    const storeState = useAppStore.getState();
    const actualCurrentTime = storeState.audio.currentTime;
    const actualDuration = storeState.audio.duration;
    
    // Get active marker from store (fresh value)
    const activeMarkerId = storeState.ui.selectedMarkerId;
    const markers = storeState.markers;
    const activeMarker = activeMarkerId 
      ? markers.find((m) => m.id === activeMarkerId) || null
      : null;
    
    // Use animated viewport for smooth zoom transitions
    // Add NaN safety checks
    let vpStart = animatedViewportRef.current.initialized 
      ? animatedViewportRef.current.start 
      : storeState.ui.viewportStart;
    let vpEnd = animatedViewportRef.current.initialized 
      ? animatedViewportRef.current.end 
      : storeState.ui.viewportEnd;
    
    // Safety checks for NaN or invalid values
    if (!isFinite(vpStart) || isNaN(vpStart) || vpStart < 0) {
      vpStart = 0;
    }
    if (!isFinite(vpEnd) || isNaN(vpEnd) || vpEnd <= vpStart || vpEnd > actualDuration) {
      vpEnd = actualDuration > 0 ? actualDuration : 1;
    }
    if (vpStart >= vpEnd) {
      vpStart = 0;
      vpEnd = actualDuration > 0 ? actualDuration : 1;
    }
    
    // Calculate visible duration (viewport)
    const visibleDuration = vpEnd > vpStart ? vpEnd - vpStart : actualDuration;
    
    // Get cached peaks for the current viewport - regenerates when zoomed
    const peaks = getPeaks(bufferToUse, usableWidth, zoomLevel, vpStart, vpEnd > vpStart ? vpEnd : actualDuration);
    
    if (!peaks || (Array.isArray(peaks) && peaks.length === 0)) {
      return;
    }

    const isStereo = bufferToUse.numberOfChannels > 1;
    const maxAmplitude = 1.0; // Use full amplitude range for maximum visibility
    
    // Calculate playback progress for gradient (using viewport)
    // Progress is relative to the visible viewport, not the full duration
    const relativeTime = actualCurrentTime - vpStart;
    const progress = visibleDuration > 0 ? Math.max(0, Math.min(relativeTime / visibleDuration, 1)) : 0;
    const progressX = TIME_LABEL_PADDING + (usableWidth * progress);

    // Calculate active marker pixel positions if marker is active
    // Account for viewport when calculating positions
    let markerStartX = 0;
    let markerEndX = 0;
    let markerColor = '';
    if (activeMarker && actualDuration > 0 && visibleDuration > 0) {
      // Calculate marker positions relative to viewport
      const markerStartRelative = Math.max(0, activeMarker.start - vpStart);
      const markerEndRelative = Math.min(visibleDuration, activeMarker.end - vpStart);
      const markerStartRatio = markerStartRelative / visibleDuration;
      const markerEndRatio = markerEndRelative / visibleDuration;
      markerStartX = TIME_LABEL_PADDING + (usableWidth * markerStartRatio);
      markerEndX = TIME_LABEL_PADDING + (usableWidth * markerEndRatio);
      markerColor = activeMarker.color || '#4CAF50';
    }

    if (isStereo && !Array.isArray(peaks) && 'left' in peaks && 'right' in peaks) {
      // Stereo drawing: split canvas in half
      const stereoPeaks = peaks as StereoPeaks;
      const halfHeight = height / 2;
      
      // Draw left channel (top half) with gradient - offset by padding
      drawChannelWithGradient(
        ctx, 
        stereoPeaks.left, 
        usableWidth, 
        halfHeight, 
        TIME_LABEL_PADDING, 
        0, 
        maxAmplitude, 
        progressX,
        activeMarker ? { startX: markerStartX, endX: markerEndX, color: markerColor } : null
      );
      
      // Draw divider line between channels (very subtle)
      ctx.strokeStyle = 'rgba(222, 41, 16, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, halfHeight);
      ctx.lineTo(width, halfHeight);
      ctx.stroke();
      
      // Draw right channel (bottom half) with gradient - offset by padding
      drawChannelWithGradient(
        ctx, 
        stereoPeaks.right, 
        usableWidth, 
        halfHeight, 
        TIME_LABEL_PADDING, 
        halfHeight, 
        maxAmplitude, 
        progressX,
        activeMarker ? { startX: markerStartX, endX: markerEndX, color: markerColor } : null
      );
      
      // Draw center lines for each channel (spanning full width)
      // Make them more subtle so they don't interfere with waveform visibility
      ctx.strokeStyle = 'rgba(222, 41, 16, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      // Top channel center (quarter height)
      ctx.moveTo(0, halfHeight / 2);
      ctx.lineTo(width, halfHeight / 2);
      // Bottom channel center (three-quarter height)
      ctx.moveTo(0, halfHeight + halfHeight / 2);
      ctx.lineTo(width, halfHeight + halfHeight / 2);
      ctx.stroke();
    } else {
      // Mono drawing: use full canvas height, centered - offset by padding
      const monoPeaks = Array.isArray(peaks) ? peaks : [];
      if (monoPeaks.length > 0) {
        drawChannelWithGradient(
          ctx, 
          monoPeaks, 
          usableWidth, 
          height, 
          TIME_LABEL_PADDING, 
          0, 
          maxAmplitude, 
          progressX,
          activeMarker ? { startX: markerStartX, endX: markerEndX, color: markerColor } : null
        );
        
        // Draw center line (spanning full width)
        // Make it more subtle so it doesn't interfere with waveform visibility
        ctx.strokeStyle = 'rgba(222, 41, 16, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }
    }

    // LAYER 2: Draw time grid overlay (after waveform, before playhead)
    // This ensures grid is visible but doesn't obscure waveform detail
    // Use viewport for zoomed view
    drawTimeGrid(ctx, width, height, visibleDuration, TIME_LABEL_PADDING, usableWidth, vpStart, vpEnd);

    // LAYER 3: Draw playhead (on top of everything)
    // Only draw if there's actual playback progress
    if (actualCurrentTime > 0 || storeState.audio.isPlaying) {
      drawPlayhead(ctx, height, progressX);
    }
  };

  /**
   * Draw a single channel's waveform with gradient based on playback progress
   * Handles coordinate system conversion: canvas Y-axis is inverted (0 at top, increases downward)
   * 
   * @param ctx - 2D rendering context
   * @param peaks - Array of peaks for this channel
   * @param width - Canvas width
   * @param channelHeight - Height available for this channel
   * @param offsetY - Y offset for this channel (0 for mono, 0 or halfHeight for stereo)
   * @param maxAmplitude - Scale factor for amplitude visualization
   * @param progressX - X position of playback progress (for gradient)
   * @param activeMarkerRange - Active marker range info (startX, endX, color) or null
   */
  const drawChannelWithGradient = (
    ctx: CanvasRenderingContext2D,
    peaks: Peak[],
    width: number,
    channelHeight: number,
    offsetX: number,
    offsetY: number,
    maxAmplitude: number,
    progressX: number,
    activeMarkerRange: { startX: number; endX: number; color: string } | null = null
  ) => {
    if (peaks.length === 0) return;

    const centerY = offsetY + channelHeight / 2;
    const halfHeight = channelHeight / 2;
    
    // Pre-calculate pixel width outside loop for performance
    const pixelWidth = width / peaks.length;

    // Find the maximum absolute amplitude in the peaks for normalization
    let maxAbsAmplitude = 0;
    for (let i = 0; i < peaks.length; i++) {
      maxAbsAmplitude = Math.max(
        maxAbsAmplitude,
        Math.abs(peaks[i].min),
        Math.abs(peaks[i].max)
      );
    }

    // Normalize amplitude to use full range
    // Always normalize to make the waveform fill the available space
    const amplitudeScale = maxAbsAmplitude > 0.001 ? 1 / maxAbsAmplitude : 1;
    
    // Waveform bar settings - create rounded bars like the reference image
    const barWidth = Math.max(3, Math.floor(pixelWidth * 0.8)); // 80% of pixel width, min 3px
    const barGap = Math.max(1, pixelWidth - barWidth); // Small gap between bars
    const verticalScale = 0.9; // Use 90% of channel height
    
    // Draw each peak as a rounded vertical bar
    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i];
      const x = offsetX + (i * pixelWidth);
      
      // Normalize the peak amplitude
      const normalizedMax = Math.abs(peak.max) * amplitudeScale;
      const normalizedMin = Math.abs(peak.min) * amplitudeScale;
      const peakAmplitude = Math.max(normalizedMax, normalizedMin);
      
      // Calculate bar height (symmetrical around center)
      // Minimum height ensures visibility even for quiet audio
      const minBarHeight = 4;
      const maxBarHeight = halfHeight * verticalScale * maxAmplitude;
      const barHeight = Math.max(minBarHeight, peakAmplitude * maxBarHeight * 2);
      
      // Calculate Y position (centered on the centerY line)
      const yTop = centerY - (barHeight / 2);
      
      // Determine color based on active marker or playback progress
      let color: string;
      
      // If there's an active marker, check if this bar is within marker range
      if (activeMarkerRange) {
        const barCenterX = x + barWidth / 2;
        const isInMarkerRange = barCenterX >= activeMarkerRange.startX && barCenterX <= activeMarkerRange.endX;
        
        if (isInMarkerRange) {
          // Use marker color for active marker section
          color = activeMarkerRange.color;
        } else {
          // Greyish color for inactive sections
          color = '#444444'; // Darker grey to show inactivity
        }
      } else {
        // Normal behavior: color based on playback progress
        // x is the position of this bar, progressX is where playback has reached
        const isPlayed = x < progressX;
        
        if (isPlayed) {
          // Played portion: gradient from white → green → red based on position
          const playedRatio = progressX > offsetX ? (x - offsetX) / (progressX - offsetX) : 0;
          
          // Smooth gradient: white (start) → green (middle) → red (near playhead)
          if (playedRatio < 0.4) {
            // White to Green
            const t = playedRatio / 0.4;
            const r = Math.round(255 - 255 * t);
            const g = Math.round(255 - (255 - 180) * t);
            const b = Math.round(255 - (255 - 100) * t);
            color = `rgb(${r}, ${g}, ${b})`;
          } else if (playedRatio < 0.7) {
            // Green to Red
            const t = (playedRatio - 0.4) / 0.3;
            const r = Math.round(0 + 220 * t);
            const g = Math.round(180 - 140 * t);
            const b = Math.round(100 - 80 * t);
            color = `rgb(${r}, ${g}, ${b})`;
          } else {
            // Red (near playhead) - brightest
            color = '#DE2910';
          }
        } else {
          // Unplayed portion: grey
          color = '#555555';
        }
      }
      
      // Draw rounded bar
      ctx.fillStyle = color;
      const radius = Math.min(barWidth / 2, barHeight / 2);
      
      // Draw rounded rectangle (with fallback for older browsers)
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, yTop, barWidth, barHeight, radius);
      } else {
        // Fallback: draw regular rectangle
        ctx.rect(x, yTop, barWidth, barHeight);
      }
      ctx.fill();
    }
  };

  /**
   * Initialize canvas and set up resize listener
   */
  useEffect(() => {
    // Initial size setup
    updateCanvasSize();

    // Handle window resize
    const handleResize = () => {
      updateCanvasSize();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup: remove event listener on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  /**
   * Redraw waveform when audio buffer, zoom level, canvas size, or animation tick changes
   */
  useEffect(() => {
    if (!canvasRef.current || canvasSize.width === 0 || canvasSize.height === 0) return;
    if (isPlaying && animationTick === 0) return; // Let animation frame handle playback, but allow zoom animations

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get device pixel ratio
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Reset transform and redraw
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    drawWaveformWithBuffer(ctx, canvasSize.width, canvasSize.height, audioBuffer);
  }, [audioBuffer, zoomLevel, canvasSize, duration, animationTick, activeMarkerId, markers]); // Redraw when active marker or markers array changes

  /**
   * Animation frame loop for smooth playback updates
   */
  useEffect(() => {
    if (!isPlaying) {
      // Do one final redraw when playback stops
      if (canvasRef.current && canvasSize.width > 0 && canvasSize.height > 0) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const devicePixelRatio = window.devicePixelRatio || 1;
          ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
          drawWaveformWithBuffer(ctx, canvasSize.width, canvasSize.height, audioBuffer);
        }
      }
      return;
    }

    const animate = () => {
      if (!canvasRef.current || canvasSize.width === 0 || canvasSize.height === 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const devicePixelRatio = window.devicePixelRatio || 1;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      
      // Get latest buffer from store for fresh currentTime
      const currentBuffer = useAppStore.getState().audio.buffer;
      drawWaveformWithBuffer(ctx, canvasSize.width, canvasSize.height, currentBuffer);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, canvasSize, audioBuffer]);

  /**
   * Format time as M:SS for hover tooltip
   */
  const formatHoverTime = (seconds: number): string => {
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle mouse move over canvas - show time position
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration <= 0) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    // Use same padding as MarkerTimeline - minimal on mobile
    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
    const TIME_LABEL_PADDING = isMobileDevice ? 8 : 50;
    const usableWidth = Math.max(0, width - (TIME_LABEL_PADDING * 2));
    
    // Get current viewport
    const vpStart = viewportStart;
    const vpEnd = viewportEnd > 0 ? viewportEnd : duration;
    const visibleDuration = vpEnd - vpStart;
    
    // Convert pixel to time (relative to viewport)
    const adjustedX = x - TIME_LABEL_PADDING;
    const clampedX = Math.max(0, Math.min(adjustedX, usableWidth));
    const time = vpStart + (clampedX / usableWidth) * visibleDuration;
    
    setHoverInfo({
      x: e.clientX - rect.left,
      time: Math.max(0, Math.min(time, duration)),
      visible: true
    });
  };

  /**
   * Handle mouse leave - hide hover indicator
   */
  const handleMouseLeave = () => {
    setHoverInfo(prev => ({ ...prev, visible: false }));
  };

  /**
   * Handle click on waveform - seek to clicked position
   */
  const handleClick = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration <= 0) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    // Use same padding as MarkerTimeline - minimal on mobile
    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
    const TIME_LABEL_PADDING = isMobileDevice ? 8 : 50;
    const usableWidth = Math.max(0, width - (TIME_LABEL_PADDING * 2));
    
    // Get current viewport
    const vpStart = viewportStart;
    const vpEnd = viewportEnd > 0 ? viewportEnd : duration;
    const visibleDuration = vpEnd - vpStart;
    
    // Convert pixel to time (relative to viewport)
    const adjustedX = x - TIME_LABEL_PADDING;
    const clampedX = Math.max(0, Math.min(adjustedX, usableWidth));
    const seekTime = vpStart + (clampedX / usableWidth) * visibleDuration;
    
    // Clamp to valid range
    const clampedTime = Math.max(0, Math.min(seekTime, duration));
    
    // Seek to the clicked time
    await seek(clampedTime);
    
    // Visual feedback - brief flash
    setClickFeedback(true);
    setTimeout(() => setClickFeedback(false), 150);
    
  }, [duration, seek, viewportStart, viewportEnd]);

  // Smooth viewport animation hook
  const { animateScrollToTime } = useSmoothViewport();
  const lastAutoScrollTimeRef = useRef<number>(0);

  /**
   * Auto-scroll viewport during playback to keep playhead visible
   * Uses smooth animation for a seamless scrolling experience
   * Only scrolls when playhead goes out of view (not when it's still visible)
   */
  useEffect(() => {
    if (!isPlaying || zoomLevel <= 1 || duration <= 0) return;
    
    const vpStart = viewportStart;
    const vpEnd = viewportEnd > 0 ? viewportEnd : duration;
    const visibleDuration = vpEnd - vpStart;
    
    // Only auto-scroll if playhead is outside the visible viewport
    // Add a small buffer (5% of visible duration) to prevent constant scrolling
    const buffer = visibleDuration * 0.05;
    const isPlayheadBeforeViewport = currentTime < (vpStart + buffer);
    const isPlayheadAfterViewport = currentTime > (vpEnd - buffer);
    
    if (isPlayheadBeforeViewport || isPlayheadAfterViewport) {
      // Prevent triggering animation too frequently (debounce)
      const now = Date.now();
      if (now - lastAutoScrollTimeRef.current < 150) return;
      lastAutoScrollTimeRef.current = now;
      
      // Use smooth animation for auto-scroll
      animateScrollToTime(currentTime, { duration: 200, easing: 'easeOutQuad' });
    }
  }, [currentTime, isPlaying, zoomLevel, viewportStart, viewportEnd, duration, animateScrollToTime]);

  // Initial zoom shows 20% (1/5) of audio on both mobile and desktop
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const DEFAULT_ZOOM = 5; // Show 1/5 (20%) of the audio initially
  const MOBILE_DEFAULT_ZOOM = 5; // Same for mobile

  /**
   * Initialize viewport when duration changes (new audio loaded)
   * Both mobile and desktop: start with 20% view (zoom level 5)
   */
  useEffect(() => {
    if (duration > 0 && (viewportEnd === 0 || viewportEnd > duration)) {
      // Start with 20% (1/5) of audio visible
      const initialEnd = duration / DEFAULT_ZOOM;
      setViewport(0, initialEnd);
      setZoomLevel(DEFAULT_ZOOM);
    }
  }, [duration, viewportEnd, setViewport, setZoomLevel]);
  
  // Pinch-to-zoom and single-finger scroll for mobile/tablet - using refs for native event listeners
  const lastTouchDistanceRef = useRef<number | null>(null);
  const pinchCenterTimeRef = useRef<number | null>(null);
  // Single-finger horizontal scroll tracking
  const singleTouchStartRef = useRef<{ x: number; vpStart: number; vpEnd: number } | null>(null);
  const isSingleTouchScrollRef = useRef(false);
  
  // Store current values in refs for native event handlers
  const durationRef = useRef(duration);
  const viewportStartRef = useRef(viewportStart);
  const viewportEndRef = useRef(viewportEnd);
  const zoomLevelRef = useRef(zoomLevel);
  const currentTimeRef = useRef(currentTime);
  
  useEffect(() => {
    durationRef.current = duration;
    viewportStartRef.current = viewportStart;
    viewportEndRef.current = viewportEnd;
    zoomLevelRef.current = zoomLevel;
    currentTimeRef.current = currentTime;
  }, [duration, viewportStart, viewportEnd, zoomLevel, currentTime]);
  
  // Use native event listeners for pinch-to-zoom (required for preventDefault)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleNativeTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Two-finger touch - prepare for pinch
        isSingleTouchScrollRef.current = false;
        singleTouchStartRef.current = null;
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        lastTouchDistanceRef.current = distance;
        
        // Calculate center time for zoom
        if (containerRef.current && durationRef.current > 0) {
          const rect = containerRef.current.getBoundingClientRect();
          const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
          const vpStart = viewportStartRef.current;
          const vpEnd = viewportEndRef.current > 0 ? viewportEndRef.current : durationRef.current;
          const visibleDuration = vpEnd - vpStart;
          pinchCenterTimeRef.current = vpStart + (centerX / rect.width) * visibleDuration;
        }
      } else if (e.touches.length === 1) {
        // Single-finger touch - prepare for horizontal scroll
        const touch = e.touches[0];
        singleTouchStartRef.current = {
          x: touch.clientX,
          vpStart: viewportStartRef.current,
          vpEnd: viewportEndRef.current > 0 ? viewportEndRef.current : durationRef.current,
        };
        isSingleTouchScrollRef.current = false; // Will be set to true if horizontal movement detected
      }
    };
    
    const handleNativeTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDistanceRef.current !== null) {
        e.preventDefault(); // Now works because listener is not passive
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const newDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        
        const scale = newDistance / lastTouchDistanceRef.current;
        
        if (Math.abs(scale - 1) > 0.02) { // Threshold to avoid jitter
          const currentZoom = zoomLevelRef.current || MOBILE_DEFAULT_ZOOM;
          let newZoom = currentZoom * scale;
          
          // Clamp zoom: min 4 (1/4 view), max 50
          newZoom = Math.max(MOBILE_DEFAULT_ZOOM, Math.min(50, newZoom));
          
          if (Math.abs(newZoom - currentZoom) > 0.1) {
            // Calculate new viewport centered on pinch point
            const centerTime = pinchCenterTimeRef.current ?? currentTimeRef.current;
            const dur = durationRef.current;
            const newVisibleDuration = dur / newZoom;
            let newStart = centerTime - newVisibleDuration / 2;
            let newEnd = centerTime + newVisibleDuration / 2;
            
            // Clamp to valid range
            if (newStart < 0) {
              newStart = 0;
              newEnd = newVisibleDuration;
            }
            if (newEnd > dur) {
              newEnd = dur;
              newStart = Math.max(0, dur - newVisibleDuration);
            }
            
            setViewport(newStart, newEnd);
            setZoomLevel(newZoom);
            lastTouchDistanceRef.current = newDistance;
          }
        }
      } else if (e.touches.length === 1 && singleTouchStartRef.current !== null) {
        // Single-finger horizontal scroll
        const touch = e.touches[0];
        const deltaX = singleTouchStartRef.current.x - touch.clientX;
        
        // Only scroll if horizontal movement is significant (> 5px)
        if (Math.abs(deltaX) > 5) {
          e.preventDefault(); // Prevent page scroll
          isSingleTouchScrollRef.current = true;
          
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          
          const { vpStart: origVpStart, vpEnd: origVpEnd } = singleTouchStartRef.current;
          const origVisibleDuration = origVpEnd - origVpStart;
          const dur = durationRef.current;
          
          // Calculate time delta based on pixel movement
          const timeDelta = (deltaX / rect.width) * origVisibleDuration;
          
          let newStart = origVpStart + timeDelta;
          let newEnd = origVpEnd + timeDelta;
          
          // Clamp to valid range
          if (newStart < 0) {
            newStart = 0;
            newEnd = origVisibleDuration;
          }
          if (newEnd > dur) {
            newEnd = dur;
            newStart = Math.max(0, dur - origVisibleDuration);
          }
          
          setViewport(newStart, newEnd);
        }
      }
    };
    
    const handleNativeTouchEnd = () => {
      lastTouchDistanceRef.current = null;
      pinchCenterTimeRef.current = null;
      singleTouchStartRef.current = null;
      isSingleTouchScrollRef.current = false;
    };
    
    // Add event listeners with { passive: false } to allow preventDefault
    canvas.addEventListener('touchstart', handleNativeTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleNativeTouchEnd, { passive: true });
    
    return () => {
      canvas.removeEventListener('touchstart', handleNativeTouchStart);
      canvas.removeEventListener('touchmove', handleNativeTouchMove);
      canvas.removeEventListener('touchend', handleNativeTouchEnd);
    };
  }, [setViewport, setZoomLevel]);

  // Two-finger horizontal scroll support (trackpad on Mac/Windows, mouse wheel horizontal)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleWheel = (e: WheelEvent) => {
      // Handle horizontal scrolling (two-finger swipe on trackpad or shift+scroll)
      const deltaX = e.deltaX || (e.shiftKey ? e.deltaY : 0);
      
      if (Math.abs(deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        e.preventDefault();
        
        const dur = durationRef.current;
        const vpStart = viewportStartRef.current;
        const vpEnd = viewportEndRef.current > 0 ? viewportEndRef.current : dur;
        const visibleDuration = vpEnd - vpStart;
        
        if (dur <= 0 || visibleDuration <= 0) return;
        
        // Calculate scroll amount (scaled by visible duration)
        const scrollAmount = (deltaX / 500) * visibleDuration;
        
        let newStart = vpStart + scrollAmount;
        let newEnd = vpEnd + scrollAmount;
        
        // Clamp to valid range
        if (newStart < 0) {
          newStart = 0;
          newEnd = visibleDuration;
        }
        if (newEnd > dur) {
          newEnd = dur;
          newStart = Math.max(0, dur - visibleDuration);
        }
        
        setViewport(newStart, newEnd);
      }
    };
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [setViewport]);

  return (
    <div 
      ref={containerRef}
      className="waveform-container" 
      style={{ 
        width: '100%', 
        height: '100%', // Fill container height
        minHeight: isMobile ? '100%' : '100px',
        background: 'var(--neu-bg-base)',
        border: 'none',
        borderRadius: isMobile ? '6px' : '16px',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isMobile ? 'none' : 'var(--neu-raised)',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Container for waveform - no manual scrolling, only auto-scroll via viewport */}
      <div
        style={{
          width: '100%',
          flex: '1 1 auto',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        <canvas
          ref={canvasRef}
          className="waveform-canvas"
          style={{
            width: '100%',
            minWidth: '100%',
            height: '100%',
            display: 'block',
            cursor: 'crosshair',
            filter: clickFeedback ? 'brightness(1.2)' : 'none',
            transition: 'filter 0.1s ease-out',
            flexShrink: 0,
            touchAction: 'none' // Allow custom touch handling via native events
          }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          // Touch events handled via native listeners in useEffect for pinch-to-zoom
        />
      </div>
      
      
      {/* Hover indicator and time tooltip */}
      {hoverInfo.visible && duration > 0 && (
        <>
          {/* Thin line - black for classic theme, green for normal */}
          <div
            style={{
              position: 'absolute',
              left: `${hoverInfo.x}px`,
              top: 0,
              bottom: 0,
              width: '1px',
              background: 'linear-gradient(to bottom, rgba(0, 255, 128, 0.8), rgba(0, 255, 128, 0.3))',
              pointerEvents: 'none',
              transform: 'translateX(-0.5px)',
              boxShadow: '0 0 6px rgba(0, 255, 128, 0.6)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
          
          {/* Time tooltip */}
          <div
            style={{
              position: 'absolute',
              left: `${hoverInfo.x}px`,
              top: '8px',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 20, 10, 0.95)',
              color: '#00FF80',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              border: '1px solid rgba(0, 255, 128, 0.4)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 12px rgba(0, 255, 128, 0.2)',
              animation: 'fadeIn 0.15s ease-out',
              zIndex: 10
            }}
          >
            {formatHoverTime(hoverInfo.time)}
          </div>
        </>
      )}
      
      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-5px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Waveform;









