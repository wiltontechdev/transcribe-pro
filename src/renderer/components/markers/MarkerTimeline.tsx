// MarkerTimeline.tsx - Wilton - Week 1
// SVG-based timeline overlay for displaying markers

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '../../store/store';
import { Marker } from '../../types/types';
import { MarkerManager } from './MarkerManager';
import { useAudioEngine } from '../audio/useAudioEngine';
import { useSmoothViewport } from '../../hooks/useSmoothViewport';
import { DESKTOP_MAX_ZOOM, PHONE_MAX_ZOOM, getDefaultZoomLevel } from '../../utils/defaultZoom';

// ===== Constants for marker layout =====
const MARKER_HEIGHT = 28; // desktop/default marker height
const MARKER_GAP = 6; // desktop/default gap between marker rows
const TIME_GRID_HEIGHT = 35; // desktop/default time grid height
const MIN_MARKER_AREA_HEIGHT = 100; // desktop/default minimum marker area height
const MAX_OVERLAPPING_MARKERS = 5; // Support up to 5 overlapping markers
const MAX_MARKER_AREA_HEIGHT = TIME_GRID_HEIGHT + (MAX_OVERLAPPING_MARKERS * (MARKER_HEIGHT + MARKER_GAP)) + 20; // Height for 5 markers + padding
const EDGE_HIT_PX = 12; // pixels from left/right edge of marker to start resize (crop) instead of move
// Padding varies by device - minimal on mobile for edge-to-edge display
const getTimeLabelPadding = (isMobile: boolean) => isMobile ? 8 : 50;
const MOBILE_TIMELINE_HINT_STORAGE_KEY = 'transcribe-pro-mobile-timeline-hint-dismissed';
const TIMELINE_TEXT_FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export function MarkerTimeline() {
  // ===== Setup state and refs =====
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isMobileLayout, setIsMobileLayout] = useState(window.innerWidth <= 1024);
  const [showMobileScrollHint, setShowMobileScrollHint] = useState(false);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsMobileLayout(window.innerWidth <= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const markerHeight = isMobile ? 16 : MARKER_HEIGHT;
  const markerGap = isMobile ? 2 : MARKER_GAP;
  const timeGridHeight = isMobile ? 20 : TIME_GRID_HEIGHT;
  const markerAreaPadding = isMobile ? 8 : 20;
  const minMarkerAreaHeight = isMobile ? 36 : MIN_MARKER_AREA_HEIGHT;
  const maxMarkerAreaHeight = useMemo(() => {
    return (MAX_OVERLAPPING_MARKERS * (markerHeight + markerGap)) + markerAreaPadding;
  }, [markerGap, markerHeight, markerAreaPadding]);
  const maxSvgHeight = timeGridHeight + maxMarkerAreaHeight;
  const markerCornerRadius = isMobile ? 3 : 4;
  const markerStrokeWidth = isMobile ? 1.5 : 2;

  // ===== Marker creation state =====
  const [isCreatingMarker, setIsCreatingMarker] = useState(false);
  const [markerStartTime, setMarkerStartTime] = useState<number | null>(null);
  const [markerEndTime, setMarkerEndTime] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [hasDragged, setHasDragged] = useState(false); // Track if user actually dragged

  // ===== Drag-to-move marker state =====
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const didDragRef = useRef(false);
  const dragAnchorTimeRef = useRef(0);
  const dragMarkerStartRef = useRef(0);
  const dragMarkerEndRef = useRef(0);

  // ===== Resize marker (crop in/out) by dragging left or right edge =====
  const [resizingMarkerId, setResizingMarkerId] = useState<string | null>(null);
  const [resizeEdge, setResizeEdge] = useState<'start' | 'end' | null>(null);

  // Listen for marker creation request from MarkerPanel
  const requestMarkerCreation = useAppStore((state) => state.ui.requestMarkerCreation);
  const setRequestMarkerCreation = useAppStore((state) => state.setRequestMarkerCreation);

  // Get data from Zustand store
  const markers = useAppStore((state) => state.markers);
  const duration = useAppStore((state) => state.audio.duration || 0);
  const activeMarkerId = useAppStore((state) => state.ui.selectedMarkerId);
  const markersAreInteractive = true;

  // Get AudioEngine methods for applying marker settings
  const { seek, setLoop, disableLoop } = useAudioEngine();

  // Get viewport state for synchronized zoom/scroll with Waveform
  const rawViewportStart = useAppStore((state) => state.ui.viewportStart);
  const rawViewportEnd = useAppStore((state) => state.ui.viewportEnd);
  const setViewport = useAppStore((state) => state.setViewport);
  const setZoomLevel = useAppStore((state) => state.setZoomLevel);
  const rawZoomLevel = useAppStore((state) => state.ui.zoomLevel);
  const currentTime = useAppStore((state) => state.audio.currentTime) || 0;
  const { animateZoom } = useSmoothViewport();
  const DEFAULT_ZOOM = getDefaultZoomLevel();
  const resolvedZoomLevel = (typeof rawZoomLevel === 'number' && isFinite(rawZoomLevel) && rawZoomLevel > 0)
    ? rawZoomLevel
    : DEFAULT_ZOOM;
  const zoomLevel = resolvedZoomLevel;

  // Pinch-to-zoom and single-finger scroll refs
  const lastTouchDistanceRef = useRef<number | null>(null);
  const pinchCenterTimeRef = useRef<number | null>(null);
  // Single-finger horizontal scroll tracking
  const singleTouchStartRef = useRef<{ x: number; vpStart: number; vpEnd: number } | null>(null);
  const isSingleTouchScrollRef = useRef(false);
  const MOBILE_DEFAULT_ZOOM = DEFAULT_ZOOM;

  // Clamp viewport values to current duration (handles case when new audio is shorter)
  // Also handles stale viewport values from previous audio and NaN values
  const viewportStart = (typeof rawViewportStart === 'number' && !isNaN(rawViewportStart) && isFinite(rawViewportStart))
    ? Math.max(0, Math.min(rawViewportStart, duration))
    : 0;
  const viewportEnd = (typeof rawViewportEnd === 'number' && !isNaN(rawViewportEnd) && isFinite(rawViewportEnd) && rawViewportEnd > 0)
    ? Math.min(rawViewportEnd, duration > 0 ? duration : rawViewportEnd)
    : (duration > 0 ? duration / resolvedZoomLevel : 1);

  // Calculate visible duration based on viewport - ensure it's never 0 or NaN
  const visibleDuration = (viewportEnd > viewportStart && !isNaN(viewportEnd - viewportStart))
    ? (viewportEnd - viewportStart)
    : (duration > 0 ? duration : 1);
  const canShowMobileScrollHint = isMobile && duration > visibleDuration + 0.05;

  const dismissMobileScrollHint = useCallback(() => {
    setShowMobileScrollHint(false);
    try {
      window.sessionStorage.setItem(MOBILE_TIMELINE_HINT_STORAGE_KEY, '1');
    } catch (_error) {}
  }, []);

  useEffect(() => {
    if (!canShowMobileScrollHint) {
      setShowMobileScrollHint(false);
      return;
    }

    try {
      const dismissed = window.sessionStorage.getItem(MOBILE_TIMELINE_HINT_STORAGE_KEY) === '1';
      setShowMobileScrollHint(!dismissed);
    } catch (_error) {
      setShowMobileScrollHint(true);
    }
  }, [canShowMobileScrollHint]);

  // Measure initial width on mount
  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      setContainerWidth(width);
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate padding based on device - minimal on mobile for edge-to-edge display
  const TIME_LABEL_PADDING = useMemo(() => getTimeLabelPadding(isMobile), [isMobile]);

  // Calculate usable width (accounting for padding)
  const usableWidth = useMemo(() => {
    return Math.max(0, containerWidth - (TIME_LABEL_PADDING * 2));
  }, [containerWidth, TIME_LABEL_PADDING]);

  // Calculate SVG width to match waveform width when zoomed
  // When zoomed, the waveform shows a smaller time range (viewport) stretched to fill canvas
  // The marker timeline should match this - same viewport, same width
  const svgWidth = useMemo(() => {
    if (duration === 0 || usableWidth === 0 || visibleDuration === 0) return containerWidth;
    // SVG width matches the container width (same as waveform canvas)
    // The viewport determines what time range is shown, and it's stretched to fill the width
    return containerWidth;
  }, [containerWidth, duration, usableWidth, visibleDuration]);

  // Pixel-to-time conversion function - uses viewport for zoomed view
  const pixelToTime = useCallback((pixelX: number): number => {
    if (duration === 0 || usableWidth === 0 || visibleDuration === 0) return 0;
    // Adjust for padding
    const adjustedX = pixelX - TIME_LABEL_PADDING;
    const clampedX = Math.max(0, Math.min(adjustedX, usableWidth));
    // Convert pixel position to time within the viewport
    const pixelPerSecond = usableWidth / visibleDuration;
    const timeInViewport = clampedX / pixelPerSecond;
    // Convert to absolute time
    return viewportStart + timeInViewport;
  }, [duration, visibleDuration, usableWidth, viewportStart]);

  // Time-to-pixel conversion function - uses viewport for zoomed view
  // When zoomed, positions are based on viewport, matching waveform
  // Note: Does NOT clamp - allows markers extending beyond viewport to be visible
  const timeToPixel = useCallback((timeInSeconds: number): number => {
    // Safety checks to prevent NaN
    if (!isFinite(timeInSeconds) || isNaN(timeInSeconds)) return TIME_LABEL_PADDING;
    if (duration <= 0 || usableWidth <= 0 || visibleDuration <= 0) return TIME_LABEL_PADDING;
    if (isNaN(visibleDuration) || !isFinite(visibleDuration)) return TIME_LABEL_PADDING;

    // Convert absolute time to position within viewport
    const timeInViewport = timeInSeconds - viewportStart;
    const pixelPerSecond = usableWidth / visibleDuration;

    // Check for invalid pixelPerSecond
    if (!isFinite(pixelPerSecond) || isNaN(pixelPerSecond)) return TIME_LABEL_PADDING;

    const pixelPosition = timeInViewport * pixelPerSecond;

    // Final NaN check
    if (isNaN(pixelPosition) || !isFinite(pixelPosition)) return TIME_LABEL_PADDING;

    // Don't clamp - allow negative values and values beyond usableWidth
    // This allows markers that extend beyond viewport to be partially visible
    return Math.round(TIME_LABEL_PADDING + pixelPosition);
  }, [duration, visibleDuration, usableWidth, viewportStart]);

  // Calculate marker dimensions with NaN safety
  const getMarkerDimensions = useCallback((marker: Marker) => {
    const startX = timeToPixel(marker.start);
    const endX = timeToPixel(marker.end);
    const width = endX - startX;

    // Safety checks for NaN
    const safeX = isFinite(startX) && !isNaN(startX) ? startX : TIME_LABEL_PADDING;
    const safeWidth = isFinite(width) && !isNaN(width) ? Math.max(width, 2) : 2;

    return {
      x: safeX,
      width: safeWidth,
    };
  }, [timeToPixel]);

  // Store current values in refs for native pinch-to-zoom event handlers
  const durationRefPinch = useRef(duration);
  const viewportStartRefPinch = useRef(viewportStart);
  const visibleDurationRefPinch = useRef(visibleDuration);
  const containerWidthRefPinch = useRef(containerWidth);
  const zoomLevelRefPinch = useRef(zoomLevel);
  const currentTimeRefPinch = useRef(currentTime);
  const isMobileRefPinch = useRef(isMobile);
  const isCreatingMarkerRef = useRef(isCreatingMarker);

  useEffect(() => {
    durationRefPinch.current = duration;
    viewportStartRefPinch.current = viewportStart;
    visibleDurationRefPinch.current = visibleDuration;
    containerWidthRefPinch.current = containerWidth;
    zoomLevelRefPinch.current = zoomLevel;
    currentTimeRefPinch.current = currentTime;
    isMobileRefPinch.current = isMobile;
    isCreatingMarkerRef.current = isCreatingMarker;
  }, [duration, viewportStart, visibleDuration, containerWidth, zoomLevel, currentTime, isMobile, isCreatingMarker]);

  // Use native event listeners for pinch-to-zoom (required for preventDefault)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleNativePinchStart = (e: TouchEvent) => {
      dismissMobileScrollHint();
      if (e.touches.length === 2) {
        // Two-finger touch - prepare for pinch
        isSingleTouchScrollRef.current = false;
        singleTouchStartRef.current = null;

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        lastTouchDistanceRef.current = distance;

        // Calculate center time for zoom
        if (containerRef.current && durationRefPinch.current > 0) {
          const rect = containerRef.current.getBoundingClientRect();
          const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
          const timeInViewport = (centerX / containerWidthRefPinch.current) * visibleDurationRefPinch.current;
          pinchCenterTimeRef.current = viewportStartRefPinch.current + timeInViewport;
        }
      } else if (e.touches.length === 1) {
        // Single-finger touch - prepare for horizontal scroll (unless marker creation is active)
        if (!isCreatingMarkerRef.current) {
          const touch = e.touches[0];
          singleTouchStartRef.current = {
            x: touch.clientX,
            vpStart: viewportStartRefPinch.current,
            vpEnd: viewportStartRefPinch.current + visibleDurationRefPinch.current,
          };
          isSingleTouchScrollRef.current = false; // Will be set to true if horizontal movement detected
        }
      }
    };

    const handleNativePinchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDistanceRef.current !== null) {
        e.preventDefault(); // Now works because listener is not passive

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const newDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

        const rawScale = newDistance / lastTouchDistanceRef.current;
        // Amplify pinch for bigger zoom response (exponent 1.5 makes pinch feel more responsive)
        const scale = Math.pow(rawScale, 1.5);

        if (Math.abs(scale - 1) > 0.01) { // Threshold to avoid jitter
          const currentZoom = zoomLevelRefPinch.current || (isMobileRefPinch.current ? MOBILE_DEFAULT_ZOOM : 1);
          let newZoom = currentZoom * scale;

          // Clamp zoom: phones can zoom in further than desktop for detailed edits.
          const minZoom = isMobileRefPinch.current ? MOBILE_DEFAULT_ZOOM : 1;
          const maxZoom = isMobileRefPinch.current ? PHONE_MAX_ZOOM : DESKTOP_MAX_ZOOM;
          newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

          if (Math.abs(newZoom - currentZoom) > 0.05) {
            // Calculate new viewport centered on pinch point
            const centerTime = pinchCenterTimeRef.current ?? currentTimeRefPinch.current;
            const dur = durationRefPinch.current;
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
      } else if (e.touches.length === 1 && singleTouchStartRef.current !== null && !isCreatingMarkerRef.current) {
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
          const dur = durationRefPinch.current;

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

    const handleNativePinchEnd = () => {
      lastTouchDistanceRef.current = null;
      pinchCenterTimeRef.current = null;
      singleTouchStartRef.current = null;
      isSingleTouchScrollRef.current = false;
    };

    // Add event listeners with { passive: false } to allow preventDefault
    svg.addEventListener('touchstart', handleNativePinchStart, { passive: true });
    svg.addEventListener('touchmove', handleNativePinchMove, { passive: false });
    svg.addEventListener('touchend', handleNativePinchEnd, { passive: true });

    return () => {
      svg.removeEventListener('touchstart', handleNativePinchStart);
      svg.removeEventListener('touchmove', handleNativePinchMove);
      svg.removeEventListener('touchend', handleNativePinchEnd);
    };
  }, [dismissMobileScrollHint, setViewport, setZoomLevel]);

  // Two-finger horizontal scroll + trackpad/mouse wheel zoom (desktop/larger devices)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      dismissMobileScrollHint();
      const deltaX = e.deltaX || (e.shiftKey ? e.deltaY : 0);
      const deltaY = e.deltaY;
      const isBiggerDevice = typeof window !== 'undefined' && window.innerWidth > 768;

      // Zoom: Ctrl+scroll or trackpad pinch (ctrlKey set by browser for pinch) on larger devices
      if (isBiggerDevice && (e.ctrlKey || e.metaKey) && Math.abs(deltaY) > 0) {
        e.preventDefault();
        const dur = durationRefPinch.current;
        if (dur <= 0) return;

        const currentZoom = zoomLevelRefPinch.current || 1;
        const zoomFactor = deltaY > 0 ? 1 / 1.6 : 1.6;
        let newZoom = currentZoom * zoomFactor;
        newZoom = Math.max(1, Math.min(DESKTOP_MAX_ZOOM, newZoom));

        if (Math.abs(newZoom - currentZoom) < 0.01) return;

        // Zoom centered on cursor position
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const vpStart = viewportStartRefPinch.current;
        const visibleDur = visibleDurationRefPinch.current > 0 ? visibleDurationRefPinch.current : dur;
        const centerTime = vpStart + (x / rect.width) * visibleDur;

        animateZoom(newZoom, centerTime, { duration: 150, easing: 'easeOutCubic' });
        return;
      }

      // Horizontal scrolling (two-finger swipe on trackpad or shift+scroll)
      if (Math.abs(deltaX) > Math.abs(deltaY) || e.shiftKey) {
        e.preventDefault();

        const dur = durationRefPinch.current;
        const vpStart = viewportStartRefPinch.current;
        const vpEnd = visibleDurationRefPinch.current > 0
          ? vpStart + visibleDurationRefPinch.current
          : dur;
        const visibleDur = vpEnd - vpStart;

        if (dur <= 0 || visibleDur <= 0) return;

        // Calculate scroll amount (scaled by visible duration)
        const scrollAmount = (deltaX / 500) * visibleDur;

        let newStart = vpStart + scrollAmount;
        let newEnd = vpEnd + scrollAmount;

        // Clamp to valid range
        if (newStart < 0) {
          newStart = 0;
          newEnd = visibleDur;
        }
        if (newEnd > dur) {
          newEnd = dur;
          newStart = Math.max(0, dur - visibleDur);
        }

        setViewport(newStart, newEnd);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [setViewport, animateZoom, dismissMobileScrollHint]);

  // Dummy handlers for React synthetic events (pinch handled by native listeners above)
  const handleTimelineTouchStart = useCallback((_e: React.TouchEvent) => {
    // Pinch-to-zoom is handled by native event listeners
  }, []);

  const handleTimelineTouchMove = useCallback((_e: React.TouchEvent) => {
    // Pinch-to-zoom is handled by native event listeners
  }, []);

  const handleTimelineTouchEnd = useCallback(() => {
    // Pinch-to-zoom is handled by native event listeners
  }, []);

  // Detect overlapping markers
  const markersOverlap = useCallback((m1: Marker, m2: Marker): boolean => {
    return m1.start < m2.end && m2.start < m1.end;
  }, []);

  // Assign layers to markers
  const getMarkerLayers = useCallback((markers: Marker[]): Map<string, number> => {
    const layers = new Map<string, number>();
    const sorted = [...markers].sort((a, b) => a.start - b.start);

    sorted.forEach((marker) => {
      let layer = 0;
      let foundLayer = false;

      while (!foundLayer) {
        const overlaps = sorted.some((otherMarker) => {
          if (otherMarker.id === marker.id) return false;
          if (layers.get(otherMarker.id) !== layer) return false;
          return markersOverlap(marker, otherMarker);
        });

        if (!overlaps) {
          layers.set(marker.id, layer);
          foundLayer = true;
        } else {
          layer++;
        }
      }
    });

    return layers;
  }, [markersOverlap]);

  // Calculate Y position from layer (below time grid)
  const getMarkerY = useCallback((layer: number): number => {
    return timeGridHeight + layer * (markerHeight + markerGap);
  }, [markerGap, markerHeight, timeGridHeight]);

  // Calculate marker layers (memoized)
  const markerLayers = useMemo(() => {
    return getMarkerLayers(markers);
  }, [markers, getMarkerLayers]);

  // Calculate total SVG height
  const maxLayer = useMemo(() => {
    if (markers.length === 0) return 0;
    return Math.max(...Array.from(markerLayers.values()), 0);
  }, [markerLayers, markers.length]);

  const markerAreaHeight = useMemo(() => {
    // Calculate needed height based on layers, with good padding
    const neededHeight = (maxLayer + 1) * (markerHeight + markerGap) + markerAreaPadding;
    const calculatedHeight = Math.max(neededHeight, minMarkerAreaHeight);
    // Cap at max height for 5 overlapping markers
    return Math.min(calculatedHeight, maxMarkerAreaHeight);
  }, [markerAreaPadding, markerGap, markerHeight, maxMarkerAreaHeight, maxLayer, minMarkerAreaHeight]);

  const svgHeight = timeGridHeight + markerAreaHeight;
  const svgRenderHeight = isMobileLayout ? svgHeight : Math.min(svgHeight, maxSvgHeight);
  const svgPreserveAspectRatio = isMobile ? 'xMinYMin meet' : 'xMidYMin meet';
  const timelineLabelFontSize = isMobile ? 8.5 : (isMobileLayout ? 10 : 12);
  const previewLabelFontSize = isMobile ? 8 : (isMobileLayout ? 9 : 11);
  const helperLabelFontSize = isMobile ? 7.5 : (isMobileLayout ? 8 : 11);
  const tooltipMaxWidth = isMobile ? 'min(76vw, 188px)' : (isMobileLayout ? 'min(60vw, 228px)' : '320px');
  const tooltipPadding = isMobile ? '5px 8px' : (isMobileLayout ? '6px 10px' : '8px 12px');
  const tooltipFontSize = isMobile ? '10px' : (isMobileLayout ? '11px' : '12px');
  const tooltipMetaFontSize = isMobile ? '9px' : (isMobileLayout ? '10px' : '11px');
  const tooltipBorderRadius = isMobile ? '5px' : '6px';
  const compactCreationTooltip = isMobileLayout;

  // Generate time grid markers (uses viewport for zoomed view)
  const timeGridMarkers = useMemo(() => {
    if (duration === 0 || usableWidth === 0 || visibleDuration === 0) return [];

    // Calculate appropriate interval based on VISIBLE duration (not total)
    // MUST match Waveform.tsx getTimeInterval exactly for alignment
    // Finer intervals for highly zoomed views to prevent large gaps
    let interval = 30; // default 30 seconds
    if (visibleDuration < 2) interval = 0.25;      // 0.25 seconds for < 2 sec visible (very zoomed)
    else if (visibleDuration < 5) interval = 0.5;  // 0.5 seconds for < 5 sec visible
    else if (visibleDuration < 10) interval = 1;   // 1 second for < 10 sec visible
    else if (visibleDuration < 20) interval = 2;   // 2 seconds for < 20 sec visible
    else if (visibleDuration < 30) interval = 5;   // 5 seconds for < 30 sec visible
    else if (visibleDuration < 60) interval = 10;  // 10 seconds for < 1 min visible
    else if (visibleDuration < 180) interval = 15; // 15 seconds for < 3 min visible
    else if (visibleDuration < 600) interval = 30; // 30 seconds for < 10 min visible
    else if (visibleDuration < 1800) interval = 60; // 1 minute for < 30 min visible
    else interval = 300;                            // 5 minutes for > 30 min visible

    const markers = [];

    // Start from first interval point at or after viewportStart
    const firstMarkerTime = Math.ceil(viewportStart / interval) * interval;

    // Generate markers within the viewport range
    for (let time = firstMarkerTime; time <= viewportEnd; time += interval) {
      const x = timeToPixel(time);
      // Only include markers that are within the visible container width
      if (x >= TIME_LABEL_PADDING && x <= containerWidth - TIME_LABEL_PADDING) {
        // Format label based on interval (show milliseconds for sub-second intervals)
        let label: string;
        if (interval < 1) {
          const minutes = Math.floor(time / 60);
          const seconds = Math.floor(time % 60);
          const ms = Math.round((time % 1) * 10);
          label = `${minutes}:${seconds.toString().padStart(2, '0')}.${ms}`;
        } else {
          const minutes = Math.floor(time / 60);
          const seconds = Math.floor(time % 60);
          label = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        markers.push({ time, x, label });
      }
    }
    return markers;
  }, [duration, usableWidth, visibleDuration, viewportStart, viewportEnd, timeToPixel, containerWidth]);

  // Handle SVG mouse move (for hover tooltip, marker drag, resize, and creation drag)
  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const scale = rect.width / svgWidth;
    const x = scale !== 0 ? xPx / scale : xPx; // viewBox space for pixelToTime
    const time = pixelToTime(x);
    const minDur = 0.5;

    // Resize marker (crop in/out) by dragging left or right edge
    if (resizingMarkerId && resizeEdge) {
      const marker = markers.find((m) => m.id === resizingMarkerId);
      if (marker) {
        if (resizeEdge === 'start') {
          let newStart = Math.max(0, Math.min(time, marker.end - minDur));
          if (marker.end - newStart < minDur) newStart = marker.end - minDur;
          try {
            MarkerManager.updateMarker(resizingMarkerId, { start: newStart, end: marker.end });
          } catch (_) {}
        } else {
          let newEnd = Math.min(duration, Math.max(time, marker.start + minDur));
          if (newEnd - marker.start < minDur) newEnd = marker.start + minDur;
          try {
            MarkerManager.updateMarker(resizingMarkerId, { start: marker.start, end: newEnd });
          } catch (_) {}
        }
        didDragRef.current = true;
      }
      return;
    }

    // Drag-to-move existing marker
    if (draggingMarkerId) {
      const deltaTime = time - dragAnchorTimeRef.current;
      let newStart = dragMarkerStartRef.current + deltaTime;
      let newEnd = dragMarkerEndRef.current + deltaTime;
      const minDur = 0.5;
      if (newStart < 0) {
        newStart = 0;
        newEnd = Math.min(dragMarkerEndRef.current - dragMarkerStartRef.current, duration);
      }
      if (newEnd > duration) {
        newEnd = duration;
        newStart = Math.max(0, duration - (dragMarkerEndRef.current - dragMarkerStartRef.current));
      }
      if (newEnd - newStart < minDur) {
        if (newStart === 0) newEnd = minDur;
        else newStart = newEnd - minDur;
      }
      try {
        MarkerManager.updateMarker(draggingMarkerId, { start: newStart, end: newEnd });
      } catch (_) {}
      didDragRef.current = true;
      return;
    }

    setHoverTime(time);
    setMousePosition({ x: e.clientX, y: e.clientY });

    if (isCreatingMarker && markerStartTime !== null) {
      const clampedTime = Math.max(0, Math.min(time, duration));
      setMarkerEndTime(clampedTime);
      if (Math.abs(clampedTime - markerStartTime) > 0.1) {
        setHasDragged(true);
      }
    }
  }, [isCreatingMarker, markerStartTime, duration, pixelToTime, draggingMarkerId, resizingMarkerId, resizeEdge, markers, svgWidth]);

  // Handle SVG mouse leave
  const handleSvgMouseLeave = useCallback(() => {
    setHoverTime(null);
    setMousePosition(null);
  }, []);

  // Start dragging a marker: move (body) or resize/crop (left/right edge) - mouse
  const handleMarkerRectMouseDown = useCallback((e: React.MouseEvent, marker: Marker) => {
    e.stopPropagation();
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    // Convert to same coordinate space as dimensions (viewBox); SVG may be scaled
    const scale = rect.width / svgWidth;
    const x = scale !== 0 ? xPx / scale : xPx;
    const edgeHit = scale !== 0 ? EDGE_HIT_PX / scale : EDGE_HIT_PX; // edge hit in viewBox units
    const dimensions = getMarkerDimensions(marker);
    const hitLeft = x < dimensions.x + edgeHit;
    const hitRight = x > dimensions.x + dimensions.width - edgeHit;
    if (hitLeft) {
      setResizingMarkerId(marker.id);
      setResizeEdge('start');
      setDraggingMarkerId(null);
    } else if (hitRight) {
      setResizingMarkerId(marker.id);
      setResizeEdge('end');
      setDraggingMarkerId(null);
    } else {
      setResizingMarkerId(null);
      setResizeEdge(null);
      const anchorTime = pixelToTime(x);
      setDraggingMarkerId(marker.id);
      dragAnchorTimeRef.current = anchorTime;
      dragMarkerStartRef.current = marker.start;
      dragMarkerEndRef.current = marker.end;
    }
    didDragRef.current = false;
  }, [pixelToTime, getMarkerDimensions, svgWidth]);

  // Start dragging a marker: move or resize (left/right edge) - touch
  const handleMarkerRectTouchStart = useCallback((e: React.TouchEvent, marker: Marker) => {
    if (e.touches.length !== 1 || !svgRef.current) return;
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = svgRef.current.getBoundingClientRect();
    const xPx = touch.clientX - rect.left;
    const scale = rect.width / svgWidth;
    const x = scale !== 0 ? xPx / scale : xPx;
    const edgeHit = scale !== 0 ? EDGE_HIT_PX / scale : EDGE_HIT_PX;
    const dimensions = getMarkerDimensions(marker);
    const hitLeft = x < dimensions.x + edgeHit;
    const hitRight = x > dimensions.x + dimensions.width - edgeHit;
    if (hitLeft) {
      setResizingMarkerId(marker.id);
      setResizeEdge('start');
      setDraggingMarkerId(null);
    } else if (hitRight) {
      setResizingMarkerId(marker.id);
      setResizeEdge('end');
      setDraggingMarkerId(null);
    } else {
      setResizingMarkerId(null);
      setResizeEdge(null);
      const anchorTime = pixelToTime(x);
      setDraggingMarkerId(marker.id);
      dragAnchorTimeRef.current = anchorTime;
      dragMarkerStartRef.current = marker.start;
      dragMarkerEndRef.current = marker.end;
    }
    didDragRef.current = false;
  }, [pixelToTime, getMarkerDimensions, svgWidth]);

  // Handle SVG mouse down (start marker creation drag)
  const handleSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!markersAreInteractive) return;
    if ((e.target as SVGElement).closest('g[data-marker-id]')) {
      return;
    }

    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pixelToTime(x);

    const clampedTime = Math.max(0, Math.min(time, duration));

    if (!isCreatingMarker) {
      setIsCreatingMarker(true);
      setMarkerStartTime(clampedTime);
      setMarkerEndTime(clampedTime);
      setHasDragged(false);
    }
  }, [isCreatingMarker, duration, pixelToTime, markersAreInteractive]);

  // Handle SVG touch start (mobile marker creation OR pinch-to-zoom)
  const handleSvgTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    dismissMobileScrollHint();
    // Two-finger touch - prepare for pinch-to-zoom
    if (e.touches.length === 2) {
      handleTimelineTouchStart(e);
      return;
    }
    if (!markersAreInteractive) return;

    // Single touch - marker creation
    if ((e.target as SVGElement).closest('g[data-marker-id]')) return;
    if (!svgRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const rect = svgRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const time = pixelToTime(x);
    const clampedTime = Math.max(0, Math.min(time, duration));

    if (!isCreatingMarker) {
      setIsCreatingMarker(true);
      setMarkerStartTime(clampedTime);
      setMarkerEndTime(clampedTime);
      setHasDragged(false);
    }
  }, [dismissMobileScrollHint, isCreatingMarker, duration, pixelToTime, handleTimelineTouchStart, markersAreInteractive]);

  // Format time for display - defined early as it's used by multiple callbacks
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle SVG touch move (marker drag, marker creation, or pinch-to-zoom)
  const handleSvgTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      handleTimelineTouchMove(e);
      return;
    }

    if (!svgRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const rect = svgRef.current.getBoundingClientRect();
    const xPx = touch.clientX - rect.left;
    const scale = rect.width / svgWidth;
    const x = scale !== 0 ? xPx / scale : xPx;
    const time = pixelToTime(x);
    const minDur = 0.5;

    // Resize marker (crop in/out) by dragging left or right edge - touch
    if (resizingMarkerId && resizeEdge) {
      const marker = markers.find((m) => m.id === resizingMarkerId);
      if (marker) {
        if (resizeEdge === 'start') {
          let newStart = Math.max(0, Math.min(time, marker.end - minDur));
          if (marker.end - newStart < minDur) newStart = marker.end - minDur;
          try {
            MarkerManager.updateMarker(resizingMarkerId, { start: newStart, end: marker.end });
          } catch (_) {}
        } else {
          let newEnd = Math.min(duration, Math.max(time, marker.start + minDur));
          if (newEnd - marker.start < minDur) newEnd = marker.start + minDur;
          try {
            MarkerManager.updateMarker(resizingMarkerId, { start: marker.start, end: newEnd });
          } catch (_) {}
        }
        didDragRef.current = true;
      }
      return;
    }

    // Drag-to-move existing marker (touch)
    if (draggingMarkerId) {
      const deltaTime = time - dragAnchorTimeRef.current;
      let newStart = dragMarkerStartRef.current + deltaTime;
      let newEnd = dragMarkerEndRef.current + deltaTime;
      const minDur = 0.5;
      if (newStart < 0) {
        newStart = 0;
        newEnd = Math.min(dragMarkerEndRef.current - dragMarkerStartRef.current, duration);
      }
      if (newEnd > duration) {
        newEnd = duration;
        newStart = Math.max(0, duration - (dragMarkerEndRef.current - dragMarkerStartRef.current));
      }
      if (newEnd - newStart < minDur) {
        if (newStart === 0) newEnd = minDur;
        else newStart = newEnd - minDur;
      }
      try {
        MarkerManager.updateMarker(draggingMarkerId, { start: newStart, end: newEnd });
      } catch (_) {}
      didDragRef.current = true;
      return;
    }

    const clampedTime = Math.max(0, Math.min(time, duration));
    if (isCreatingMarker) {
      setMarkerEndTime(clampedTime);
      if (markerStartTime !== null && Math.abs(clampedTime - markerStartTime) > 0.3) {
        setHasDragged(true);
      }
    }
    setHoverTime(clampedTime);
    setMousePosition({ x: touch.clientX, y: touch.clientY });
  }, [isCreatingMarker, markerStartTime, duration, pixelToTime, handleTimelineTouchMove, draggingMarkerId, resizingMarkerId, resizeEdge, markers, svgWidth]);

  // Handle SVG touch end - Creates marker OR ends pinch-to-zoom
  const handleSvgTouchEnd = useCallback(() => {
    // Reset pinch-to-zoom state
    handleTimelineTouchEnd();

    // Handle marker creation if in progress
    if (isCreatingMarker && markerStartTime !== null && markerEndTime !== null && hasDragged) {
      const start = Math.min(markerStartTime, markerEndTime);
      const end = Math.max(markerStartTime, markerEndTime);
      // Create marker immediately without popup (minimum 0.5 seconds)
      if (end - start >= 0.5) {
        try {
          // Use quick marker creation - auto name and color
          MarkerManager.createQuickMarker(start, end);
        } catch (error) {
        }
      }
    }
    // Reset all creation state
    setIsCreatingMarker(false);
    setMarkerStartTime(null);
    setMarkerEndTime(null);
    setHasDragged(false);
    setHoverTime(null);
    setMousePosition(null);
  }, [isCreatingMarker, markerStartTime, markerEndTime, hasDragged, formatTime, handleTimelineTouchEnd]);


  // Handle mouse up / touch end (end resize, drag-to-move, or marker creation)
  useEffect(() => {
    const handleMouseUp = () => {
      if (resizingMarkerId) {
        setResizingMarkerId(null);
        setResizeEdge(null);
        return;
      }
      if (draggingMarkerId) {
        setDraggingMarkerId(null);
        return;
      }
      if (isCreatingMarker && markerStartTime !== null && markerEndTime !== null) {
        if (hasDragged) {
          const start = Math.min(markerStartTime, markerEndTime);
          const end = Math.max(markerStartTime, markerEndTime);
          if (end - start >= 0.5) {
            try {
              MarkerManager.createQuickMarker(start, end);
            } catch (error) {
            }
          }
        }
        setIsCreatingMarker(false);
        setMarkerStartTime(null);
        setMarkerEndTime(null);
        setHasDragged(false);
      }
    };
    const handleTouchEnd = () => {
      setResizingMarkerId(null);
      setResizeEdge(null);
      setDraggingMarkerId(null);
    };
    const endResizeOrDrag = () => {
      setResizingMarkerId(null);
      setResizeEdge(null);
      setDraggingMarkerId(null);
    };
    window.addEventListener('mouseup', handleMouseUp, { capture: true });
    window.addEventListener('pointerup', endResizeOrDrag, { capture: true });
    document.addEventListener('touchend', handleTouchEnd, { capture: true });
    return () => {
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
      window.removeEventListener('pointerup', endResizeOrDrag, { capture: true });
      document.removeEventListener('touchend', handleTouchEnd, { capture: true });
    };
  }, [isCreatingMarker, markerStartTime, markerEndTime, hasDragged, formatTime, draggingMarkerId, resizingMarkerId]);

  // Disable time tooltip (no hover effects)
  const showTimeTooltip = true;

  // Cancel marker creation (abort drag before release)
  const handleCancelMarker = useCallback(() => {
    setIsCreatingMarker(false);
    setMarkerStartTime(null);
    setMarkerEndTime(null);
    setHasDragged(false);
    setHoverTime(null);
    setMousePosition(null);
    setRequestMarkerCreation(false); // Clear request from MarkerPanel
  }, [setRequestMarkerCreation]);

  // Keyboard shortcut: Esc to cancel marker creation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreatingMarker) {
        handleCancelMarker();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreatingMarker, handleCancelMarker]);

  // Note: Marker creation from MarkerPanel button now creates quick markers directly
  // This listener is kept for backward compatibility but may be unused
  useEffect(() => {
    if (requestMarkerCreation && duration > 0) {
      // Clear the request - MarkerPanel handles creation directly now
      setRequestMarkerCreation(false);
    }
  }, [requestMarkerCreation, duration, setRequestMarkerCreation]);

  // Click handler to activate marker (skip if user just finished dragging)
  const handleMarkerClick = useCallback(async (e: React.MouseEvent, markerId: string) => {
    if (!markersAreInteractive) return;
    e.stopPropagation();
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    try {
      const marker = MarkerManager.getMarker(markerId);
      if (!marker) return;
      await seek(marker.start);
      await MarkerManager.setActiveMarker(markerId, {
        seekToMarker: false,
        audioEngine: { seek, setLoop, disableLoop },
      });
    } catch (error) {
    }
  }, [seek, setLoop, disableLoop, markersAreInteractive]);

  // Get hovered marker data for tooltip
  const hoveredMarkerData = useMemo(() => {
    if (!hoveredMarker) return null;
    return markers.find(m => m.id === hoveredMarker);
  }, [hoveredMarker, markers]);

  // Get tooltip position
  const tooltipPosition = useMemo(() => {
    if (!hoveredMarkerData) return null;
    const dims = getMarkerDimensions(hoveredMarkerData);
    return {
      x: dims.x + dims.width / 2,
      markerX: dims.x
    };
  }, [hoveredMarkerData, getMarkerDimensions]);


  // Calculate preview marker dimensions
  const previewMarkerDims = useMemo(() => {
    if (!isCreatingMarker || markerStartTime === null || markerEndTime === null) return null;
    const start = Math.min(markerStartTime, markerEndTime);
    const end = Math.max(markerStartTime, markerEndTime);
    const startX = timeToPixel(start);
    const endX = timeToPixel(end);
    return {
      x: startX,
      width: Math.max(endX - startX, 2),
    };
  }, [isCreatingMarker, markerStartTime, markerEndTime, timeToPixel]);

  // Note: Auto-scroll is handled by Waveform component - both share the same viewport state
  // MarkerTimeline just responds to viewport changes from the shared store

  return (
    <div
      ref={containerRef}
      className="marker-timeline"
      style={{
        position: 'relative',
        width: '100%',
        minWidth: '100%',
        flexGrow: isMobileLayout ? 0 : (isMobile ? 1 : 0),
        flexShrink: isMobileLayout ? 1 : 0,
        flexBasis: 'auto',
        minHeight: isMobileLayout ? 'auto' : (isMobile ? '100%' : '100px'),
        maxHeight: isMobileLayout ? 'none' : (isMobile ? '100%' : undefined),
        height: isMobileLayout ? 'auto' : (isMobile ? '100%' : 'auto'),
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0, 102, 68, 0.08)',
        borderRadius: isMobile ? '0' : '16px',
        overflowX: 'hidden',
        overflowY: isMobileLayout ? 'auto' : (isMobile ? 'hidden' : 'visible'),
        boxShadow: isMobile ? 'none' : 'var(--neu-raised)',
        WebkitOverflowScrolling: isMobileLayout ? 'touch' : undefined,
        overscrollBehaviorY: isMobileLayout ? 'contain' : undefined,
      }}
    >
      {showMobileScrollHint && canShowMobileScrollHint && (
        <div className="mobile-timeline-scroll-hint" aria-hidden="true">
          <div className="mobile-timeline-scroll-hint__edge" />
          <div className="mobile-timeline-scroll-hint__pill">
            <span>Swipe timeline</span>
          </div>
        </div>
      )}

      {/* Marker hover tooltip */}
      {markersAreInteractive && hoveredMarker && hoveredMarkerData && tooltipPosition && !isCreatingMarker && (
        <div
          className="marker-tooltip"
          style={{
            position: 'absolute',
            left: `${tooltipPosition.x}px`,
            top: isMobileLayout ? '6px' : '-10px',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            color: '#FFD700',
            padding: tooltipPadding,
            borderRadius: tooltipBorderRadius,
            fontSize: tooltipFontSize,
            fontWeight: '500',
            pointerEvents: 'none',
            zIndex: 10000,
            whiteSpace: isMobileLayout ? 'normal' : 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            maxWidth: tooltipMaxWidth,
            width: 'max-content',
            lineHeight: 1.2,
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: isMobileLayout ? '2px' : '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hoveredMarkerData.name}
          </div>
          <div style={{
            fontSize: tooltipMetaFontSize,
            color: 'rgba(255, 255, 255, 0.9)',
            fontFamily: TIMELINE_TEXT_FONT,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: isMobileLayout ? '2px 6px' : '4px 8px',
            whiteSpace: 'normal',
          }}>
            <span>{formatTime(hoveredMarkerData.start)} - {formatTime(hoveredMarkerData.end)}</span>
            {hoveredMarkerData.speed && hoveredMarkerData.speed !== 1.0 && (
              <span style={{ color: '#4CAF50' }}>
                {hoveredMarkerData.speed.toFixed(2)}x
              </span>
            )}
            {hoveredMarkerData.loop && (
              <span style={{ color: '#FFD700' }}>
                Loop
              </span>
            )}
          </div>
        </div>
      )}

      {/* Time tooltip - Shows time range during drag or current time when hovering */}
      {markersAreInteractive && showTimeTooltip && hoverTime !== null && mousePosition && (
        <div
          className="time-tooltip"
          style={{
            position: 'fixed',
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y - (isMobileLayout ? 38 : 45)}px`,
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            color: '#FFFFFF',
            padding: isCreatingMarker && hasDragged
              ? (isMobileLayout ? '6px 9px' : '8px 14px')
              : (isMobileLayout ? '5px 8px' : '6px 12px'),
            borderRadius: tooltipBorderRadius,
            fontSize: tooltipFontSize,
            fontWeight: '500',
            pointerEvents: 'none',
            zIndex: 10001,
            whiteSpace: isMobileLayout ? 'normal' : 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
            border: isCreatingMarker && hasDragged
              ? `2px solid ${MarkerManager.getNextColor()}`
              : '1px solid rgba(212, 175, 55, 0.4)',
            fontFamily: TIMELINE_TEXT_FONT,
            maxWidth: tooltipMaxWidth,
            width: 'max-content',
            lineHeight: 1.15,
          }}
        >
          {isCreatingMarker && hasDragged && markerStartTime !== null && markerEndTime !== null ? (
            compactCreationTooltip ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#4CAF50' }}>{formatTime(Math.min(markerStartTime, markerEndTime))}</span>
                  <span style={{ color: 'rgba(255,255,255,0.52)' }}>-</span>
                  <span style={{ color: '#FF9800' }}>{formatTime(Math.max(markerStartTime, markerEndTime))}</span>
                </div>
                <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.64)' }}>
                  {formatTime(Math.abs(markerEndTime - markerStartTime))} duration
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Creating marker</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#4CAF50' }}>{formatTime(Math.min(markerStartTime, markerEndTime))}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>-</span>
                  <span style={{ color: '#FF9800' }}>{formatTime(Math.max(markerStartTime, markerEndTime))}</span>
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                  {formatTime(Math.abs(markerEndTime - markerStartTime))} duration
                </div>
              </div>
            )
          ) : (
            formatTime(hoverTime)
          )}
        </div>
      )}

      {/* Note: Marker creation form removed - using quick marker creation now */}
      {/* Markers can be edited via the Edit button in MarkerPanel */}

      {/* Cancel button during marker creation - allows aborting drag before release */}
      {isCreatingMarker && hasDragged && markerStartTime !== null && markerEndTime !== null && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1000,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCancelMarker();
            }}
            style={{
              padding: '0.4rem 0.8rem',
              background: 'rgba(255, 68, 68, 0.85)',
              border: 'none',
              borderRadius: '6px',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '600',
              fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive",
              transition: 'all 0.2s ease',
              boxShadow: 'var(--neu-raised)',
            }}
            title="Cancel (Esc)"
          >
            âœ• Cancel
          </button>
        </div>
      )}

      {/* Container for marker timeline - matches waveform width, no scrollbar */}
      <div
        style={{
          width: '100%',
          minWidth: '100%',
          flex: '1 1 auto',
          overflowX: 'hidden',
          overflowY: isMobileLayout ? 'auto' : 'hidden',
          position: 'relative',
          minHeight: 0,
          WebkitOverflowScrolling: isMobileLayout ? 'touch' : undefined,
        }}
      >
      {/* Render SVG - width matches container (same as waveform) */}
      {containerWidth > 0 && duration > 0 && (
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgRenderHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio={svgPreserveAspectRatio}
          style={{
            display: 'block',
            cursor: isCreatingMarker ? 'crosshair' : 'default',
            overflow: 'visible',
            minHeight: '0',
            height: `${svgRenderHeight}px`,
            width: '100%',
            minWidth: '100%',
            maxWidth: '100%',
            flexShrink: 0
          }}
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={handleSvgMouseLeave}
          onMouseDown={handleSvgMouseDown}
          onTouchStart={handleSvgTouchStart}
          onTouchMove={handleSvgTouchMove}
          onTouchEnd={handleSvgTouchEnd}
        >
          {/* Time Grid Background */}
          <rect
            x={0}
            y={0}
            width={svgWidth}
            height={timeGridHeight}
            fill="rgba(0, 0, 0, 0.3)"
          />

          {/* Time Grid Line */}
          <line
            x1={TIME_LABEL_PADDING}
            y1={timeGridHeight}
            x2={svgWidth - TIME_LABEL_PADDING}
            y2={timeGridHeight}
            stroke="rgba(0, 102, 68, 0.6)"
            strokeWidth={2}
          />

          {/* Time Grid Markers */}
          {timeGridMarkers.map((marker, idx) => (
            <g key={idx}>
              {/* Vertical tick */}
              <line
                x1={marker.x}
                y1={timeGridHeight - (isMobile ? 6 : 8)}
                x2={marker.x}
                y2={timeGridHeight}
                stroke="rgba(255, 255, 255, 0.6)"
                strokeWidth={1.5}
              />
              {/* Time label */}
              <text
                x={
                  isMobileLayout && marker.x < TIME_LABEL_PADDING + 24
                    ? marker.x + 4
                    : isMobileLayout && marker.x > containerWidth - TIME_LABEL_PADDING - 24
                      ? marker.x - 4
                      : marker.x
                }
                y={timeGridHeight - (isMobile ? 10 : 12)}
                fill="rgba(255, 255, 255, 0.8)"
                fontSize={timelineLabelFontSize}
                textAnchor={
                  isMobileLayout && marker.x < TIME_LABEL_PADDING + 24
                    ? 'start'
                    : isMobileLayout && marker.x > containerWidth - TIME_LABEL_PADDING - 24
                      ? 'end'
                      : 'middle'
                }
                fontFamily={TIMELINE_TEXT_FONT}
                fontWeight="600"
                letterSpacing="0.01em"
              >
                {marker.label}
              </text>
              {/* Vertical guide line (subtle) */}
              <line
                x1={marker.x}
                y1={timeGridHeight}
                x2={marker.x}
                y2={svgHeight}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={1}
                strokeDasharray="2,4"
              />
            </g>
          ))}

          {/* Preview marker being created - shows next available color */}
          {previewMarkerDims && (
            <g>
              <rect
                x={previewMarkerDims.x}
                y={timeGridHeight}
                width={previewMarkerDims.width}
                height={markerHeight}
                fill={MarkerManager.getNextColor()}
                opacity={0.5}
                stroke={MarkerManager.getNextColor()}
                strokeWidth={2}
                strokeDasharray="4,4"
                rx={markerCornerRadius}
                ry={markerCornerRadius}
              />
              {/* Preview time labels */}
              {markerStartTime !== null && markerEndTime !== null && (
                <>
                  <text
                    x={previewMarkerDims.x + 4}
                    y={timeGridHeight + (isMobile ? 13 : 16)}
                    fill="white"
                    fontSize={previewLabelFontSize}
                    fontWeight="600"
                    fontFamily={TIMELINE_TEXT_FONT}
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {formatTime(Math.min(markerStartTime, markerEndTime))}
                  </text>
                  <text
                    x={previewMarkerDims.x + previewMarkerDims.width - 4}
                    y={timeGridHeight + (isMobile ? 13 : 16)}
                    fill="white"
                    fontSize={previewLabelFontSize}
                    fontWeight="600"
                    textAnchor="end"
                    fontFamily={TIMELINE_TEXT_FONT}
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {formatTime(Math.max(markerStartTime, markerEndTime))}
                  </text>
                </>
              )}
              {/* Helper text when creating marker */}
              {hoverTime !== null && (
                <text
                  x={timeToPixel(hoverTime)}
                  y={timeGridHeight + markerHeight + (isMobile ? 16 : 20)}
                  fill="#D4AF37"
                  fontSize={helperLabelFontSize}
                  fontWeight="600"
                  textAnchor="middle"
                  pointerEvents="none"
                  style={{ fontFamily: TIMELINE_TEXT_FONT, letterSpacing: '0.01em' }}
                >
                  Release to create marker
                </text>
              )}
            </g>
          )}

          {/* Existing Markers */}
          {markers.map((marker) => {
            const dimensions = getMarkerDimensions(marker);
            const layer = markerLayers.get(marker.id) || 0;
            const y = getMarkerY(layer);
            const isActive = marker.id === activeMarkerId;

            return (
              <g
                key={marker.id}
                data-marker-id={marker.id}
                style={{ pointerEvents: markersAreInteractive ? 'auto' : 'none' }}
              >
                {/* Marker rectangle */}
                <rect
                  x={dimensions.x}
                  y={y}
                  width={dimensions.width}
                  height={markerHeight}
                  fill={marker.color || '#4CAF50'}
                  opacity={markersAreInteractive ? (isActive ? 0.95 : 0.7) : 0.35}
                  stroke={markersAreInteractive ? (isActive ? '#FFD700' : 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.16)'}
                  strokeWidth={isActive ? markerStrokeWidth : 1}
                  strokeDasharray={marker.loop ? '4 2' : 'none'}
                  rx={markerCornerRadius}
                  ry={markerCornerRadius}
                  onMouseDown={(e) => handleMarkerRectMouseDown(e, marker)}
                  onTouchStart={(e) => handleMarkerRectTouchStart(e, marker)}
                  onClick={(e) => handleMarkerClick(e, marker.id)}
                  onMouseEnter={() => setHoveredMarker(marker.id)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  style={{
                    cursor:
                      !markersAreInteractive
                        ? 'default'
                        : resizingMarkerId === marker.id
                        ? 'ew-resize'
                        : draggingMarkerId === marker.id
                          ? 'grabbing'
                          : 'grab',
                  }}
                />
                {/* Left edge: crop start (drag to trim/crop in from left) */}
                {dimensions.width > EDGE_HIT_PX * 2 && (
                  <rect
                    x={dimensions.x}
                    y={y}
                    width={EDGE_HIT_PX}
                    height={markerHeight}
                    fill="transparent"
                    onMouseDown={(e) => handleMarkerRectMouseDown(e, marker)}
                    onTouchStart={(e) => handleMarkerRectTouchStart(e, marker)}
                    style={{ cursor: 'ew-resize' }}
                  />
                )}
                {/* Right edge: crop end (drag to trim/crop in from right) */}
                {dimensions.width > EDGE_HIT_PX * 2 && (
                  <rect
                    x={dimensions.x + dimensions.width - EDGE_HIT_PX}
                    y={y}
                    width={EDGE_HIT_PX}
                    height={markerHeight}
                    fill="transparent"
                    onMouseDown={(e) => handleMarkerRectMouseDown(e, marker)}
                    onTouchStart={(e) => handleMarkerRectTouchStart(e, marker)}
                    style={{ cursor: 'ew-resize' }}
                  />
                )}

                {/* Loop indicator icon - circular arrow (only show if marker is wide enough) */}
                {marker.loop && dimensions.width > (isMobile ? 26 : 30) && (
                  <g>
                    {/* Loop icon background circle */}
                    <circle
                      cx={dimensions.x + dimensions.width - (isMobile ? 10 : 12)}
                      cy={y + (isMobile ? 10 : 14)}
                      r={isMobile ? 6 : 8}
                      fill="rgba(255, 215, 0, 0.9)"
                      stroke="rgba(0, 0, 0, 0.3)"
                      strokeWidth={1}
                    />
                    {/* Loop arrow - simplified circular arrow */}
                    <path
                      d={`M ${dimensions.x + dimensions.width - (isMobile ? 13 : 16)} ${y + (isMobile ? 10 : 14)}
                          A ${isMobile ? 3 : 4} ${isMobile ? 3 : 4} 0 1 1 ${dimensions.x + dimensions.width - (isMobile ? 7 : 8)} ${y + (isMobile ? 10 : 14)}`}
                      fill="none"
                      stroke="rgba(0, 0, 0, 0.9)"
                      strokeWidth={isMobile ? "1.2" : "1.5"}
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                    {/* Arrow head */}
                    <path
                      d={`M ${dimensions.x + dimensions.width - (isMobile ? 7 : 8)} ${y + (isMobile ? 10 : 14)}
                          L ${dimensions.x + dimensions.width - (isMobile ? 5 : 6)} ${y + (isMobile ? 8 : 12)}
                          L ${dimensions.x + dimensions.width - (isMobile ? 5 : 6)} ${y + (isMobile ? 12 : 16)}
                          Z`}
                      fill="rgba(0, 0, 0, 0.9)"
                      pointerEvents="none"
                    />
                  </g>
                )}

                {/* Marker label removed - names not displayed on timeline per design */}
              </g>
            );
          })}
        </svg>
      )}
      </div>
    </div>
  );
}

export default MarkerTimeline;
