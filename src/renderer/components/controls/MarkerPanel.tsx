// MarkerPanel.tsx - Julius - Week 2-3
// Marker management panel (List + Editor)

import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/store';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MarkerManager, PRESET_COLORS } from '../markers/MarkerManager';
import { Marker } from '../../types/types';
import { useAudioEngine } from '../audio/useAudioEngine';
import { useMarkerSpeedControl } from '../markers/useMarkerSpeedControl';
import { FirstTimeTooltip } from '../ui/FirstTimeTooltip';

/**
 * Format time as MM:SS for display
 * @param seconds - Time in seconds
 * @returns Formatted time string (e.g., "1:30", "0:05")
 */
const formatTime = (seconds: number): string => {
  if (seconds === undefined || seconds === null || isNaN(seconds) || !isFinite(seconds)) {
    return '0:00';
  }
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.floor(Math.max(0, seconds) % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Calculate marker duration in seconds
 * @param marker - Marker object
 * @returns Duration in seconds
 */
const getMarkerDuration = (marker: Marker): number => {
  return marker.end - marker.start;
};

/**
 * Parse MM:SS format to seconds
 * @param timeStr - Time string in MM:SS format
 * @returns Time in seconds
 */
const parseTimeString = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  const mins = parseInt(parts[0]) || 0;
  const secs = parseFloat(parts[1]) || 0;
  return mins * 60 + secs;
};

const MarkerPanel: React.FC = () => {
  // TASK 10: Read markers from store
  // Use useStore hook to subscribe to markers array. Component will re-render when markers change.
  const markers = useAppStore((state) => state.markers);
  const selectedMarkerId = useAppStore((state) => state.ui.selectedMarkerId);
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  const audioDuration = useAppStore((state) => state.audio.duration || 0);
  const rawViewportStart = useAppStore((state) => state.ui.viewportStart);
  const rawViewportEnd = useAppStore((state) => state.ui.viewportEnd);

  const isMobile = useIsMobile();

  // Mobile/tablet detection for edit popup (like speed popup)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const isTablet = windowWidth >= 768 && windowWidth <= 1024;
  const isTinyMobile = isMobile && windowWidth <= 360;
  const isMobileOrTablet = isMobile || isTablet;
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // TASK 13: Get AudioEngine methods for applying marker settings
  const { setSpeed, seek, setLoop, disableLoop } = useAudioEngine();

  // Use hook to apply marker speed only within marker range
  useMarkerSpeedControl();

  // State for editing markers
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    color: string;
    speed: number;
    loop: boolean;
    start: number;
    end: number;
  } | null>(null);
  // Separate minutes/seconds for time editing (so user can change either within audio bounds)
  const [startMinStr, setStartMinStr] = useState('');
  const [startSecStr, setStartSecStr] = useState('');
  const [endMinStr, setEndMinStr] = useState('');
  const [endSecStr, setEndSecStr] = useState('');

  // TASK 14: Ref for scrolling active marker into view
  const activeMarkerRef = useRef<HTMLDivElement>(null);

  // TASK 14: Scroll active marker into view when it changes
  useEffect(() => {
    if (selectedMarkerId && activeMarkerRef.current) {
      activeMarkerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedMarkerId]);

  // Disable looping when marker is deactivated
  useEffect(() => {
    if (!selectedMarkerId) {
      // Marker was deactivated - disable looping
      disableLoop();
    }
  }, [selectedMarkerId, disableLoop]);

  // TASK 10: Sort markers - Active marker first, then chronological order (by start time)
  // Active marker at top for easy access, rest sorted by start time
  const sortedMarkers = useMemo(() => {
    const allMarkers = MarkerManager.getAllMarkers();

    // If there's an active marker, put it first
    if (selectedMarkerId) {
      const activeMarker = allMarkers.find(m => m.id === selectedMarkerId);
      const otherMarkers = allMarkers.filter(m => m.id !== selectedMarkerId);
      if (activeMarker) {
        return [activeMarker, ...otherMarkers];
      }
    }

    return allMarkers;
  }, [markers, selectedMarkerId]);

  // Theme-aware colors
  const textColor = isLightMode ? '#1a1a1a' : '#FFFFFF';
  const textSecondary = isLightMode ? '#666666' : '#AAAAAA';
  const bgPrimary = isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 15, 15, 0.95)';
  const glassBg = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.3)';
  const borderColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
  const itemBg = isLightMode ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.05)';
  const itemHoverBg = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)';
  const selectedBg = isLightMode ? 'rgba(0, 102, 68, 0.15)' : 'rgba(0, 102, 68, 0.25)';

  // Active marker border color - amber for high visibility (not green)
  const MARKER_ACCENT = '#D97706';

  // TASK 13: Click handler to activate marker
  // Clicking anywhere on a marker list item makes it the active marker
  // Always seeks to marker start when clicked
  const handleMarkerClick = useCallback(
    async (marker: Marker) => {
      try {
        // TASK 13: Call MarkerManager's setActiveMarker method
        // This updates store with new active ID
        // Speed is now handled by useMarkerSpeedControl hook based on playback position
        // Always seek to marker start when clicking on it
        await MarkerManager.setActiveMarker(marker.id, {
          seekToMarker: true, // Always seek to marker start when clicking
          audioEngine: {
            seek, // Seek to marker start
            setLoop, // Enable looping for markers with loop=true
            disableLoop, // Disable looping when marker is deactivated
            // Speed is handled by useMarkerSpeedControl hook
          },
        });
      } catch (error) {
      }
    },
    [seek, setLoop, disableLoop]
  );

  // Handle deactivate marker with smooth animation
  const handleDeactivateMarker = useCallback(() => {
    // Add smooth transition by animating the deactivation
    const markerPanel = document.querySelector('.marker-panel') as HTMLElement | null;
    if (markerPanel) {
      markerPanel.style.transition = 'all 0.3s ease';
    }

    // Disable looping when marker is deactivated
    disableLoop();

    // Reset speed to normal smoothly
    setSpeed(1.0);

    // Clear active marker after a brief delay for smooth visual transition
    setTimeout(() => {
      const store = useAppStore.getState();
      store.setSelectedMarkerId(null);
    }, 50);
  }, [setSpeed, disableLoop]);

  const currentTime = useAppStore((state) => state.audio.currentTime || 0);
  const viewportStart = typeof rawViewportStart === 'number' && isFinite(rawViewportStart)
    ? Math.max(0, Math.min(rawViewportStart, audioDuration || rawViewportStart))
    : 0;
  const viewportEnd = typeof rawViewportEnd === 'number' && isFinite(rawViewportEnd) && rawViewportEnd > viewportStart
    ? Math.max(viewportStart, Math.min(rawViewportEnd, audioDuration || rawViewportEnd))
    : Math.max(viewportStart, audioDuration || viewportStart);
  const visibleTimelineDuration = viewportEnd > viewportStart
    ? viewportEnd - viewportStart
    : Math.max(audioDuration, 0);
  const isCurrentTimeVisible =
    currentTime >= viewportStart - 0.001 &&
    currentTime <= viewportEnd + 0.001;
  const markerCreateTime = audioDuration > 0
    ? Math.max(
        0,
        Math.min(
          isCurrentTimeVisible ? currentTime : viewportStart,
          audioDuration
        )
      )
    : 0;
  const quickMarkerDuration = Math.min(
    5,
    Math.max(1.5, visibleTimelineDuration > 0 ? visibleTimelineDuration * 0.18 : 5)
  );
  const markerCreateTimeLabel = formatTime(markerCreateTime);
  const markerCreateHint = isCurrentTimeVisible
    ? `Add at ${markerCreateTimeLabel} from the visible playhead`
    : `Add at ${markerCreateTimeLabel} from the visible timeline`;

  const openMarkerEditor = useCallback((marker: Marker) => {
    setEditingMarkerId(marker.id);
    setEditFormData({
      name: marker.name,
      color: marker.color || '#FF4444',
      speed: marker.speed !== undefined ? marker.speed : 1.0,
      loop: marker.loop === true,
      start: marker.start,
      end: marker.end,
    });
    setStartMinStr(String(Math.floor(marker.start / 60)));
    setStartSecStr(String(Math.floor(marker.start % 60)));
    setEndMinStr(String(Math.floor(marker.end / 60)));
    setEndSecStr(String(Math.floor(marker.end % 60)));
  }, []);

  // TASK 15: Handle Create Marker button click
  // Creates a quick marker at current position with default 5-second duration
  const handleCreateButtonClick = useCallback(async () => {
    if (audioDuration > 0) {
      try {
        let start = markerCreateTime;
        let end = Math.min(markerCreateTime + quickMarkerDuration, audioDuration);
        if (end - start >= 0.5) {
          const newMarker = MarkerManager.createQuickMarker(start, end);
          await MarkerManager.setActiveMarker(newMarker.id, {
            seekToMarker: false,
            audioEngine: {
              seek,
              setLoop,
              disableLoop,
            },
          });
          if (isMobileOrTablet) {
            openMarkerEditor(newMarker);
          }
        } else {
          const altStart = Math.max(0, markerCreateTime - quickMarkerDuration);
          if (markerCreateTime - altStart >= 0.5) {
            const newMarker = MarkerManager.createQuickMarker(altStart, markerCreateTime);
            await MarkerManager.setActiveMarker(newMarker.id, {
              seekToMarker: false,
              audioEngine: {
                seek,
                setLoop,
                disableLoop,
              },
            });
            if (isMobileOrTablet) {
              openMarkerEditor(newMarker);
            }
          }
        }
      } catch (error) {
      }
    }
  }, [audioDuration, disableLoop, isMobileOrTablet, markerCreateTime, openMarkerEditor, quickMarkerDuration, seek, setLoop]);

  // TASK 15: Keyboard shortcut for marker creation (N key)
  // NOTE: Global key handlers are centralized in App.tsx

  // Handle editing marker
  const handleStartEdit = useCallback((marker: Marker, e: React.MouseEvent) => {
    e.stopPropagation();
    openMarkerEditor(marker);
  }, [openMarkerEditor]);

  const handleCancelEdit = useCallback(() => {
    setEditingMarkerId(null);
    setEditFormData(null);
    setStartMinStr('');
    setStartSecStr('');
    setEndMinStr('');
    setEndSecStr('');
  }, []);

  // Commit time inputs to editFormData; clamps to [0, audioDuration] and ensures start < end, min duration 0.5s
  const commitTimeInputs = useCallback(() => {
    if (!editFormData || audioDuration <= 0) return;
    const startMin = Math.max(0, parseInt(startMinStr, 10) || 0);
    const startSec = Math.max(0, Math.min(59, parseInt(startSecStr, 10) || 0));
    const endMin = Math.max(0, parseInt(endMinStr, 10) || 0);
    const endSec = Math.max(0, Math.min(59, parseInt(endSecStr, 10) || 0));
    let start = startMin * 60 + startSec;
    let end = endMin * 60 + endSec;
    start = Math.max(0, Math.min(start, audioDuration));
    end = Math.max(0, Math.min(end, audioDuration));
    if (start >= end) end = Math.min(start + 0.5, audioDuration);
    if (end - start < 0.5) start = Math.max(0, end - 0.5);
    setEditFormData({ ...editFormData, start, end });
    setStartMinStr(String(Math.floor(start / 60)));
    setStartSecStr(String(Math.floor(start % 60)));
    setEndMinStr(String(Math.floor(end / 60)));
    setEndSecStr(String(Math.floor(end % 60)));
  }, [editFormData, audioDuration, startMinStr, startSecStr, endMinStr, endSecStr]);

  const handleSaveEdit = useCallback((markerId: string) => {
    if (!editFormData) return;

    try {
      const marker = MarkerManager.getMarker(markerId);
      if (!marker) return;

      // Update marker using MarkerManager
      MarkerManager.updateMarker(markerId, {
        name: editFormData.name,
        color: editFormData.color,
        speed: editFormData.speed,
        loop: editFormData.loop,
        start: editFormData.start,
        end: editFormData.end,
      });

      // If this is the active marker, reapply the settings to audio engine
      if (markerId === selectedMarkerId) {
        // Apply loop setting
        if (editFormData.loop) {
          setLoop(editFormData.start, editFormData.end);
        } else {
          disableLoop();
        }

        // Speed is handled by useMarkerSpeedControl hook based on playback position
      }

      setEditingMarkerId(null);
      setEditFormData(null);
      setStartMinStr('');
      setStartSecStr('');
      setEndMinStr('');
      setEndSecStr('');
    } catch (error) {
      if (error instanceof Error) {
        alert(`Cannot update marker: ${error.message}`);
      }
    }
  }, [editFormData, selectedMarkerId, setLoop, disableLoop]);

  // Handle delete marker with confirmation
  const handleDeleteMarker = useCallback((marker: Marker, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent marker activation

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Delete marker "${marker.name}"?\n\nThis cannot be undone.`
    );

    if (confirmed) {
      try {
        MarkerManager.deleteMarker(marker.id);
        // If we were editing this marker, cancel edit mode
        if (editingMarkerId === marker.id) {
          setEditingMarkerId(null);
          setEditFormData(null);
        }
      } catch (error) {
        if (error instanceof Error) {
          alert(`Cannot delete marker: ${error.message}`);
        }
      }
    }
  }, [editingMarkerId]);

  // Toggle loop on marker - one click, no need to open Edit
  const handleToggleLoop = useCallback((marker: Marker, e: React.MouseEvent) => {
    e.stopPropagation();
    const newLoop = !marker.loop;
    MarkerManager.updateMarker(marker.id, { loop: newLoop });
    if (marker.id === selectedMarkerId) {
      if (newLoop) {
        setLoop(marker.start, marker.end);
      } else {
        disableLoop();
      }
    }
  }, [selectedMarkerId, setLoop, disableLoop]);

  // Keyboard shortcut: Delete key to delete active marker
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedMarkerId) {
          const marker = MarkerManager.getMarker(selectedMarkerId);
          if (marker) {
            handleDeleteMarker(marker, e as any);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMarkerId, handleDeleteMarker]);

  return (
    <div
      className="marker-panel"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: isLightMode ? '#e4ebf5' : '#1a1a1a',
        border: 'none',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: isLightMode
          ? '6px 6px 12px rgba(166, 180, 200, 0.5), -4px -4px 10px rgba(255, 255, 255, 0.9)'
          : '6px 6px 12px rgba(0, 0, 0, 0.5), -4px -4px 10px rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Header - Neumorphic; on mobile/tablet: wrap buttons for better fit */}
      <div
        style={{
          display: 'flex',
          flexDirection: isTinyMobile ? 'row' : isMobile ? 'column' : 'row',
          alignItems: isTinyMobile ? 'center' : isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: isTinyMobile ? '0.3rem' : isMobile ? '0.5rem' : 0,
          padding: isTinyMobile ? '0.35rem 0.45rem' : isMobile ? '0.5rem 0.6rem' : '0.5rem 0.75rem',
          background: isLightMode ? '#e4ebf5' : '#1a1a1a',
          borderBottom: isLightMode
            ? '1px solid rgba(166, 180, 200, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div
          style={{
            color: textColor,
            fontSize: isTinyMobile ? '0.78rem' : isMobile ? '0.9rem' : '0.85rem',
            fontWeight: '600',
            flexShrink: 0,
          }}
        >
          Markers ({sortedMarkers.length})
        </div>

        {/* Button group: Navigation arrows (when active) + Create + Deactivate - wrap on mobile */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isTinyMobile ? '0.25rem' : isMobile ? '0.4rem' : '0.35rem',
          flexWrap: 'wrap',
          justifyContent: isTinyMobile ? 'flex-end' : isMobile ? 'flex-end' : 'flex-start',
        }}>
          {/* Marker navigation - show when markers exist (navigate even without selection) */}
          {sortedMarkers.length > 0 && (() => {
            const prevMarker = MarkerManager.getPreviousMarker();
            const nextMarker = MarkerManager.getNextMarker();
            const btnSize = isTinyMobile ? 32 : isMobile ? 40 : 34;
            const navBtn = (onClick: () => void, title: string, guideText: string, tooltipId: string, icon: React.ReactNode, disabled?: boolean) => (
              <FirstTimeTooltip key={tooltipId} id={tooltipId} guideText={guideText} disabled={disabled} isLightMode={isLightMode}>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
                  disabled={disabled}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: `${btnSize}px`, height: `${btnSize}px`, padding: 0,
                    touchAction: 'manipulation',
                    background: disabled ? (isLightMode ? '#e8e8e8' : '#2a2a2a') : (isLightMode ? 'rgba(217, 119, 6, 0.2)' : 'rgba(217, 119, 6, 0.3)'),
                    color: disabled ? (isLightMode ? '#999' : '#666') : MARKER_ACCENT,
                    border: `2px solid ${disabled ? (isLightMode ? '#ccc' : '#555') : MARKER_ACCENT}`,
                    borderRadius: '8px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    boxShadow: disabled ? 'none' : (isLightMode ? '0 2px 8px rgba(217, 119, 6, 0.35)' : '0 2px 10px rgba(217, 119, 6, 0.4)'),
                    transition: 'all 0.2s ease',
                  }}
                  title={title}
                  onMouseEnter={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = isLightMode ? '0 3px 12px rgba(217, 119, 6, 0.45)' : '0 3px 14px rgba(217, 119, 6, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = disabled ? 'none' : (isLightMode ? '0 2px 8px rgba(217, 119, 6, 0.35)' : '0 2px 10px rgba(217, 119, 6, 0.4)');
                  }}
                >
                  {icon}
                </button>
              </FirstTimeTooltip>
            );
            return (
              <>
                {navBtn(
                  () => { if (prevMarker) handleMarkerClick(prevMarker); },
                  'Previous marker',
                  'Go to the previous marker in the list',
                  'marker_nav_prev',
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
                  !prevMarker
                )}
                {navBtn(
                  () => { if (nextMarker) handleMarkerClick(nextMarker); },
                  'Next marker',
                  'Go to the next marker in the list',
                  'marker_nav_next',
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
                  !nextMarker
                )}
              </>
            );
          })()}
          {/* Deactivate Button - Only visible when a marker is active */}
          {selectedMarkerId && (
            <FirstTimeTooltip id="marker_nav_deactivate" guideText="Deactivate to return to normal speed" isLightMode={isLightMode}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeactivateMarker();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isTinyMobile ? '32px' : isMobile ? '36px' : '28px',
                  height: isTinyMobile ? '32px' : isMobile ? '36px' : '28px',
                  touchAction: 'manipulation',
                  padding: 0,
                  background: isLightMode ? '#e4ebf5' : '#1a1a1a',
                  color: isLightMode ? '#000000' : '#FFFFFF',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isLightMode
                    ? '3px 3px 6px rgba(166, 180, 200, 0.5), -2px -2px 4px rgba(255, 255, 255, 0.9)'
                    : '3px 3px 6px rgba(0, 0, 0, 0.5), -2px -2px 4px rgba(255, 255, 255, 0.05)',
                  opacity: 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.color = '#FF4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.color = isLightMode ? '#000000' : '#FFFFFF';
                }}
                title="Deactivate marker (return to normal speed)"
              >
              <svg
                width={isTinyMobile ? "15" : "18"}
                height={isTinyMobile ? "15" : "18"}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transition: 'all 0.3s ease' }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </button>
            </FirstTimeTooltip>
          )}

          {/* Create Marker Button - Neumorphic */}
          <button
            onClick={handleCreateButtonClick}
            disabled={audioDuration <= 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isTinyMobile ? '32px' : isMobile ? '36px' : '28px',
              height: isTinyMobile ? '32px' : isMobile ? '36px' : '28px',
              touchAction: 'manipulation',
              padding: 0,
              background: isLightMode ? '#e4ebf5' : '#1a1a1a',
              color: audioDuration > 0
                ? '#006644'
                : (isLightMode ? '#999999' : '#666666'),
              border: 'none',
              borderRadius: '50%',
              cursor: audioDuration > 0 ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              opacity: audioDuration > 0 ? 1 : 0.6,
              boxShadow: audioDuration > 0
                ? (isLightMode
                    ? '3px 3px 6px rgba(166, 180, 200, 0.5), -2px -2px 4px rgba(255, 255, 255, 0.9)'
                    : '3px 3px 6px rgba(0, 0, 0, 0.5), -2px -2px 4px rgba(255, 255, 255, 0.05)')
                : (isLightMode
                    ? 'inset 2px 2px 4px rgba(166, 180, 200, 0.5), inset -1px -1px 2px rgba(255, 255, 255, 0.9)'
                    : 'inset 2px 2px 4px rgba(0, 0, 0, 0.5), inset -1px -1px 2px rgba(255, 255, 255, 0.03)'),
            }}
          onMouseEnter={(e) => {
            if (audioDuration > 0) {
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (audioDuration > 0) {
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          title={audioDuration > 0 ? `Create a marker at ${markerCreateTimeLabel}` : 'Load audio file first'}
        >
          <svg
            width={isTinyMobile ? "12" : "14"}
            height={isTinyMobile ? "12" : "14"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        </div>
      </div>

      {/* TASK 10: Vertical scrollable list with custom scrollbar */}
      {/* TASK 20: Scroll Handling - Panel has fixed height, enables scrolling when markers don't fit */}
      <div
        className="marker-list-container"
        style={{
          flex: '1 1 auto',
          height: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          overscrollBehaviorY: 'contain',
          padding: isMobile ? '0.25rem 0.3rem' : '0.5rem',
          minHeight: 0,
        }}
      >
        {/* TASK 19: Empty State - Special UI when no markers exist */}
        {sortedMarkers.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem 1rem',
              color: textSecondary,
              fontSize: '0.9rem',
              textAlign: 'center',
              minHeight: '150px',
            }}
          >
            <div
              style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: textColor,
                marginBottom: '0.75rem',
                opacity: 0.9,
              }}
            >
              No markers yet
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                opacity: 0.8,
                lineHeight: 1.6,
                maxWidth: '280px',
              }}
            >
              You haven't created any markers.
              <br />
              <br />
              Click the + button above or drag on the timeline to add your first marker.
            </div>
          </div>
        )}

        {/* TASK 10: Map over markers array */}
        {/* Loop through each marker, creating a list item for each one. Use marker.id as the React key. */}
        {sortedMarkers.map((marker) => {
          const isSelected = marker.id === selectedMarkerId;
          const duration = getMarkerDuration(marker);
          const markerSpeed = marker.speed !== undefined ? marker.speed : 1.0;
          const hasLoop = marker.loop === true;

          return (
            <div
              key={marker.id}
              ref={isSelected ? activeMarkerRef : null} // TASK 14: Ref for scrolling into view
              style={{
                // Compact horizontal layout - more compact on mobile
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                gap: isMobile ? '0.3rem' : '0.75rem',
                padding: isMobile ? '0.45rem 0.55rem' : '0.75rem 1rem',
                marginBottom: isMobile ? '0.2rem' : '0.5rem',
                // Active marker highlighting - Neumorphic
                background: 'var(--neu-bg-base)',
                border: 'none',
                borderRadius: isMobile ? '6px' : 'var(--radius-sm)',
                cursor: 'pointer', // TASK 13: Visual feedback - change cursor to pointer on hover
                transition: 'all 0.2s ease', // Faster transition for mobile
                position: 'relative',
                userSelect: 'none', // TASK 13: Prevent text selection when clicking rapidly
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                // Neumorphic shadow for active marker
                boxShadow: isSelected
                  ? 'var(--neu-pressed), 0 0 6px rgba(0, 102, 68, 0.3)'
                  : 'var(--neu-flat)',
                opacity: isSelected ? 1 : 0.95,
                transform: 'none',
              }}
              onClick={() => handleMarkerClick(marker)} // TASK 13: Add click handler to list item - always seeks to start
              onTouchStart={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = itemHoverBg;
                }
              }}
              onTouchEnd={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = itemBg;
                }
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = itemHoverBg; // TASK 13: Hover effect
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = itemBg;
                }
              }}
            >
              {/* Mobile Edit Mode - inline only on desktop; mobile/tablet use popup below */}
              {isMobile && editingMarkerId === marker.id && editFormData && !isMobileOrTablet ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  width: '100%',
                }}>
                  {/* Row 1: Color, Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentIndex = PRESET_COLORS.indexOf(editFormData.color as typeof PRESET_COLORS[number]);
                        const nextIndex = (currentIndex + 1) % PRESET_COLORS.length;
                        setEditFormData({ ...editFormData, color: PRESET_COLORS[nextIndex] });
                      }}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: editFormData.color,
                        border: `2px solid ${isLightMode ? '#006644' : '#00AA66'}`,
                        flexShrink: 0,
                        cursor: 'pointer',
                      }}
                      title="Tap to change color"
                    />
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="Marker name"
                      style={{
                        flex: 1,
                        padding: '0.3rem 0.4rem',
                        background: 'var(--neu-bg-base)',
                        border: '2px solid var(--text-accent-green)',
                        borderRadius: '4px',
                        color: textColor,
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        boxShadow: 'var(--neu-pressed)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Row 2: Time Range - Minutes and Seconds (within loaded audio length) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                    <span style={{ color: textSecondary, fontSize: '0.7rem', minWidth: '35px' }}>Time:</span>
                    <span style={{ color: textSecondary, fontSize: '0.65rem' }}>Start</span>
                    <input
                      type="number"
                      min={0}
                      max={599}
                      value={startMinStr}
                      onChange={(e) => setStartMinStr(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      onBlur={commitTimeInputs}
                      placeholder="m"
                      style={{ width: '36px', padding: '0.25rem 0.2rem', background: 'var(--neu-bg-base)', border: 'none', borderRadius: '4px', color: textColor, fontSize: '0.75rem', fontFamily: 'monospace', textAlign: 'center', boxShadow: 'var(--neu-pressed)' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ color: textSecondary, fontSize: '0.75rem' }}>:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={startSecStr}
                      onChange={(e) => setStartSecStr(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      onBlur={commitTimeInputs}
                      placeholder="s"
                      style={{ width: '32px', padding: '0.25rem 0.2rem', background: 'var(--neu-bg-base)', border: 'none', borderRadius: '4px', color: textColor, fontSize: '0.75rem', fontFamily: 'monospace', textAlign: 'center', boxShadow: 'var(--neu-pressed)' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ color: textSecondary, fontSize: '0.75rem', marginLeft: '0.2rem' }}>â€”</span>
                    <span style={{ color: textSecondary, fontSize: '0.65rem' }}>End</span>
                    <input
                      type="number"
                      min={0}
                      max={599}
                      value={endMinStr}
                      onChange={(e) => setEndMinStr(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      onBlur={commitTimeInputs}
                      placeholder="m"
                      style={{ width: '36px', padding: '0.25rem 0.2rem', background: 'var(--neu-bg-base)', border: 'none', borderRadius: '4px', color: textColor, fontSize: '0.75rem', fontFamily: 'monospace', textAlign: 'center', boxShadow: 'var(--neu-pressed)' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ color: textSecondary, fontSize: '0.75rem' }}>:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={endSecStr}
                      onChange={(e) => setEndSecStr(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      onBlur={commitTimeInputs}
                      placeholder="s"
                      style={{ width: '32px', padding: '0.25rem 0.2rem', background: 'var(--neu-bg-base)', border: 'none', borderRadius: '4px', color: textColor, fontSize: '0.75rem', fontFamily: 'monospace', textAlign: 'center', boxShadow: 'var(--neu-pressed)' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Row 3: Speed + Loop */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ color: textSecondary, fontSize: '0.7rem' }}>Speed:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newSpeed = Math.max(0.3, editFormData.speed - 0.1);
                          setEditFormData({ ...editFormData, speed: Math.round(newSpeed * 10) / 10 });
                        }}
                        disabled={editFormData.speed <= 0.3}
                        style={{
                          width: '24px',
                          height: '24px',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '4px',
                          color: editFormData.speed <= 0.3 ? textSecondary : textColor,
                          cursor: editFormData.speed <= 0.3 ? 'not-allowed' : 'pointer',
                          opacity: editFormData.speed <= 0.3 ? 0.4 : 1,
                          fontSize: '0.8rem',
                          fontWeight: '600',
                        }}
                      >âˆ’</button>
                      <span style={{ color: textColor, fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: '600', minWidth: '40px', textAlign: 'center' }}>
                        {editFormData.speed.toFixed(1)}x
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newSpeed = Math.min(4.0, editFormData.speed + 0.1);
                          setEditFormData({ ...editFormData, speed: Math.round(newSpeed * 10) / 10 });
                        }}
                        disabled={editFormData.speed >= 4.0}
                        style={{
                          width: '24px',
                          height: '24px',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '4px',
                          color: editFormData.speed >= 4.0 ? textSecondary : textColor,
                          cursor: editFormData.speed >= 4.0 ? 'not-allowed' : 'pointer',
                          opacity: editFormData.speed >= 4.0 ? 0.4 : 1,
                          fontSize: '0.8rem',
                          fontWeight: '600',
                        }}
                      >+</button>
                    </div>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        color: textColor,
                        userSelect: 'none',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={editFormData.loop}
                        onChange={(e) => setEditFormData({ ...editFormData, loop: e.target.checked })}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer',
                          accentColor: isLightMode ? '#006644' : '#00AA66',
                        }}
                      />
                      <span style={{ color: editFormData.loop ? '#00AA00' : textSecondary }}>Loop</span>
                    </label>
                  </div>

                  {/* Row 4: Save/Cancel Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEdit();
                      }}
                      style={{
                        padding: '0.35rem 0.8rem',
                        background: 'var(--neu-bg-base)',
                        border: 'none',
                        borderRadius: '4px',
                        color: textColor,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        boxShadow: 'var(--neu-pressed)',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEdit(marker.id);
                      }}
                      style={{
                        padding: '0.35rem 0.8rem',
                        background: isLightMode ? '#006644' : '#00AA66',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#FFFFFF',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: '600',
                        boxShadow: 'var(--neu-pressed)',
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : isMobile ? (
              /* Mobile/Tablet: Stacked card layout - no per-marker arrows (use header instead) */
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
                width: '100%',
              }}>
                {/* Row 1: Color + Name + Edit + Delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '999px',
                      background: marker.color || '#FF4444',
                      border: `2px solid ${isLightMode ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.16)'}`,
                      flexShrink: 0,
                      boxShadow: `0 0 0 3px ${isSelected ? `${marker.color || '#FF4444'}22` : 'transparent'}`,
                    }}
                  />
                  <div
                    style={{
                      color: textColor,
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={marker.name}
                  >
                    {marker.name}
                  </div>
                  <button
                    onClick={(e) => handleStartEdit(marker, e)}
                    style={{
                      padding: '0.35rem 0.6rem',
                      background: 'var(--neu-bg-base)',
                      border: 'none',
                      borderRadius: '6px',
                      color: textSecondary,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      boxShadow: 'var(--neu-pressed)',
                      touchAction: 'manipulation',
                    }}
                    title="Edit marker"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => handleDeleteMarker(marker, e)}
                    style={{
                      width: '36px',
                      height: '36px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: textSecondary,
                      cursor: 'pointer',
                      touchAction: 'manipulation',
                    }}
                    title={`Delete marker "${marker.name}"`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
                {/* Row 2: Time range + Speed + Loop */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <div style={{ color: textSecondary, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {formatTime(marker.start)} â€” {formatTime(marker.end)}
                  </div>
                  <span style={{ color: textSecondary, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {markerSpeed.toFixed(1)}x
                  </span>
                  <button
                    onClick={(e) => handleToggleLoop(marker, e)}
                    style={{
                      padding: '0.15rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: hasLoop ? '#00AA00' : (isLightMode ? '#CC4444' : '#FF6666'),
                    }}
                    title={hasLoop ? 'Loop enabled (click to disable, L for active marker)' : 'Loop disabled (click to enable, L for active marker)'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                    </svg>
                  </button>
                </div>
              </div>
              ) : (
              /* Desktop: Compact horizontal layout with per-marker arrows */
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                flex: '0 0 auto',
                minWidth: 0,
              }}>
                {/* Color indicator - clickable when editing to cycle colors */}
                <div
                  onClick={(e) => {
                    if (editingMarkerId === marker.id && editFormData) {
                      e.stopPropagation();
                      // Find current color index and cycle to next
                      const currentIndex = PRESET_COLORS.indexOf(editFormData.color as typeof PRESET_COLORS[number]);
                      const nextIndex = (currentIndex + 1) % PRESET_COLORS.length;
                      setEditFormData({ ...editFormData, color: PRESET_COLORS[nextIndex] });
                    }
                  }}
                  style={{
                    width: editingMarkerId === marker.id ? (isMobile ? '14px' : '16px') : (isMobile ? '8px' : '10px'),
                    height: editingMarkerId === marker.id ? (isMobile ? '14px' : '16px') : (isMobile ? '8px' : '10px'),
                    borderRadius: '50%',
                    background: editingMarkerId === marker.id && editFormData ? editFormData.color : (marker.color || '#FF4444'),
                    border: editingMarkerId === marker.id
                      ? `2px solid ${isLightMode ? '#006644' : '#00AA66'}`
                      : `1px solid ${isLightMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.3)'}`,
                    flexShrink: 0,
                    boxShadow: isSelected ? `0 0 4px ${marker.color || '#FF4444'}60` : 'none',
                    cursor: editingMarkerId === marker.id ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                  }}
                  title={editingMarkerId === marker.id ? 'Click to change color' : undefined}
                />

                {/* Marker name - editable when in edit mode */}
                {editingMarkerId === marker.id && editFormData ? (
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="Marker name"
                    style={{
                      width: isMobile ? '60px' : '80px',
                      padding: '0.2rem 0.3rem',
                      background: 'var(--neu-bg-base)',
                      border: '2px solid var(--text-accent-green)',
                      borderRadius: '3px',
                      color: textColor,
                      fontSize: isMobile ? '0.7rem' : '0.8rem',
                      fontWeight: '600',
                      boxShadow: 'var(--neu-pressed)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <div
                    style={{
                      color: textColor,
                      fontSize: isMobile ? '0.7rem' : '0.8rem',
                      fontWeight: '600',
                      minWidth: 0,
                      flex: '1 1 auto',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={marker.name}
                  >
                    {marker.name}
                  </div>
                )}

                {/* Time range - editable Minutes : Seconds for Start and End (within audio length) */}
                {editingMarkerId === marker.id && editFormData ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <input
                      type="number"
                      min={0}
                      max={599}
                      value={startMinStr}
                      onChange={(e) => setStartMinStr(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      onBlur={commitTimeInputs}
                      placeholder="m"
                      style={{ width: '32px', padding: '0.2rem 0.15rem', background: 'var(--neu-bg-base)', border: 'none', borderRadius: '3px', color: textColor, fontSize: '0.7rem', fontFamily: 'monospace', textAlign: 'center', boxShadow: 'var(--neu-pressed)' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ color: textSecondary, fontSize: '0.7rem' }}>:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={startSecStr}
                      onChange={(e) => setStartSecStr(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      onBlur={commitTimeInputs}
                      placeholder="s"
                      style={{ width: '28px', padding: '0.2rem 0.15rem', background: 'var(--neu-bg-base)', border: 'none', borderRadius: '3px', color: textColor, fontSize: '0.7rem', fontFamily: 'monospace', textAlign: 'center', boxShadow: 'var(--neu-pressed)' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ color: textSecondary, fontSize: '0.65rem', marginLeft: '0.1rem' }}>â€”</span>
                    <input
                      type="number"
                      min={0}
                      max={599}
                      value={endMinStr}
                      onChange={(e) => setEndMinStr(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      onBlur={commitTimeInputs}
                      placeholder="m"
                      style={{ width: '32px', padding: '0.2rem 0.15rem', background: 'var(--neu-bg-base)', border: 'none', borderRadius: '3px', color: textColor, fontSize: '0.7rem', fontFamily: 'monospace', textAlign: 'center', boxShadow: 'var(--neu-pressed)' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ color: textSecondary, fontSize: '0.7rem' }}>:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={endSecStr}
                      onChange={(e) => setEndSecStr(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      onBlur={commitTimeInputs}
                      placeholder="s"
                      style={{ width: '28px', padding: '0.2rem 0.15rem', background: 'var(--neu-bg-base)', border: 'none', borderRadius: '3px', color: textColor, fontSize: '0.7rem', fontFamily: 'monospace', textAlign: 'center', boxShadow: 'var(--neu-pressed)' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: textSecondary, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    <span>{formatTime(marker.start)}</span>
                    <span>â€”</span>
                    <span>{formatTime(marker.end)}</span>
                  </div>
                )}

                {/* Speed - editable with icon buttons */}
                {editingMarkerId === marker.id && editFormData ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {/* Decrease speed button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSpeed = Math.max(0.3, editFormData.speed - 0.1);
                        setEditFormData({ ...editFormData, speed: Math.round(newSpeed * 10) / 10 });
                      }}
                      disabled={editFormData.speed <= 0.3}
                      style={{
                        width: '20px',
                        height: '20px',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: editFormData.speed <= 0.3
                          ? (isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)')
                          : (isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'),
                        border: `1px solid ${borderColor}`,
                        borderRadius: '4px',
                        color: editFormData.speed <= 0.3 ? textSecondary : textColor,
                        cursor: editFormData.speed <= 0.3 ? 'not-allowed' : 'pointer',
                        opacity: editFormData.speed <= 0.3 ? 0.4 : 1,
                        fontSize: '0.7rem',
                        fontWeight: '600',
                      }}
                      title="Decrease speed by 0.1x"
                    >
                      âˆ’
                    </button>

                    {/* Speed display */}
                    <span style={{
                      color: textColor,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      minWidth: '38px',
                      textAlign: 'center'
                    }}>
                      {editFormData.speed.toFixed(1)}x
                    </span>

                    {/* Reset to 1.0x button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditFormData({ ...editFormData, speed: 1.0 });
                      }}
                      style={{
                        width: '20px',
                        height: '20px',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: editFormData.speed === 1.0
                          ? (isLightMode ? '#006644' : '#00AA66')
                          : (isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'),
                        border: `1px solid ${editFormData.speed === 1.0 ? 'transparent' : borderColor}`,
                        borderRadius: '4px',
                        color: editFormData.speed === 1.0 ? '#FFFFFF' : textColor,
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                      }}
                      title="Reset to 1.0x"
                    >
                      1
                    </button>

                    {/* Increase speed button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSpeed = Math.min(4.0, editFormData.speed + 0.1);
                        setEditFormData({ ...editFormData, speed: Math.round(newSpeed * 10) / 10 });
                      }}
                      disabled={editFormData.speed >= 4.0}
                      style={{
                        width: '20px',
                        height: '20px',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: editFormData.speed >= 4.0
                          ? (isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)')
                          : (isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'),
                        border: `1px solid ${borderColor}`,
                        borderRadius: '4px',
                        color: editFormData.speed >= 4.0 ? textSecondary : textColor,
                        cursor: editFormData.speed >= 4.0 ? 'not-allowed' : 'pointer',
                        opacity: editFormData.speed >= 4.0 ? 0.4 : 1,
                        fontSize: '0.7rem',
                        fontWeight: '600',
                      }}
                      title="Increase speed by 0.1x"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span style={{ color: textSecondary, fontFamily: 'monospace', fontSize: '0.7rem', minWidth: '35px' }}>
                    {markerSpeed.toFixed(1)}x
                  </span>
                )}

                {/* Loop - editable checkbox */}
                {editingMarkerId === marker.id && editFormData ? (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      color: textColor,
                      userSelect: 'none',
                    }}
                    onClick={(e) => e.stopPropagation()}
                    title="Loop this marker section (L toggles active marker loop)"
                  >
                    <input
                      type="checkbox"
                      checked={editFormData.loop}
                      onChange={(e) => {
                        setEditFormData({ ...editFormData, loop: e.target.checked });
                      }}
                      style={{
                        width: '14px',
                        height: '14px',
                        cursor: 'pointer',
                        accentColor: isLightMode ? '#006644' : '#00AA66',
                      }}
                    />
                    <span style={{ color: editFormData.loop ? '#00AA00' : textSecondary }}>
                      Loop
                    </span>
                  </label>
                ) : (
                  <button
                    onClick={(e) => handleToggleLoop(marker, e)}
                    style={{
                      padding: '0.15rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: hasLoop ? '#00AA00' : (isLightMode ? '#CC4444' : '#FF6666'),
                    }}
                    title={hasLoop ? 'Loop enabled (click to disable, L for active marker)' : 'Loop disabled (click to enable, L for active marker)'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                    </svg>
                  </button>
                )}

                {/* Edit/Save buttons and Delete button */}
                {editingMarkerId === marker.id && editFormData ? (
                  <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEdit(marker.id);
                      }}
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: isLightMode ? '#006644' : '#00AA66',
                        border: 'none',
                        borderRadius: '3px',
                        color: '#FFFFFF',
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                        fontWeight: '600',
                        boxShadow: 'var(--neu-pressed)',
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEdit();
                      }}
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: 'var(--neu-bg-base)',
                        border: 'none',
                        borderRadius: '3px',
                        color: textColor,
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                        boxShadow: 'var(--neu-pressed)',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    gap: isMobile ? '0.2rem' : '0.3rem',
                    marginLeft: isMobile ? '0' : 'auto',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}>
                    {editingMarkerId !== marker.id && (
                      <>
                        {/* Navigation arrows - only when marker is active; larger on mobile for touch */}
                        {isSelected && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); const prev = MarkerManager.getPreviousMarker(); prev && handleMarkerClick(prev); }}
                              style={{
                                width: isMobile ? '32px' : '24px', height: isMobile ? '32px' : '24px', minWidth: isMobile ? '32px' : '24px', padding: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isMobile ? (isLightMode ? 'rgba(0,102,68,0.1)' : 'rgba(0,170,102,0.15)') : 'transparent', border: `1px solid ${borderColor}`, borderRadius: '6px',
                                color: isLightMode ? '#006644' : '#00AA66', cursor: 'pointer', touchAction: 'manipulation',
                              }}
                              title="Previous marker"
                            >
                              <svg width={isMobile ? "14" : "12"} height={isMobile ? "14" : "12"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); const next = MarkerManager.getNextMarker(); next && handleMarkerClick(next); }}
                              style={{
                                width: isMobile ? '32px' : '24px', height: isMobile ? '32px' : '24px', minWidth: isMobile ? '32px' : '24px', padding: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isMobile ? (isLightMode ? 'rgba(0,102,68,0.1)' : 'rgba(0,170,102,0.15)') : 'transparent', border: `1px solid ${borderColor}`, borderRadius: '6px',
                                color: isLightMode ? '#006644' : '#00AA66', cursor: 'pointer', touchAction: 'manipulation',
                              }}
                              title="Next marker"
                            >
                              <svg width={isMobile ? "14" : "12"} height={isMobile ? "14" : "12"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                            </button>
                          </>
                        )}
                        {/* Deactivate button - only visible when marker is active */}
                        {isSelected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeactivateMarker();
                            }}
                            style={{
                              width: isMobile ? '32px' : '24px',
                              height: isMobile ? '32px' : '24px',
                              minWidth: isMobile ? '32px' : '24px',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'transparent',
                              border: `1px solid ${isLightMode ? '#FF4444' : '#FF6666'}`,
                              borderRadius: '4px',
                              color: isLightMode ? '#FF4444' : '#FF6666',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              fontSize: '0.7rem',
                              touchAction: 'manipulation',
                            }}
                            title="Deactivate marker"
                          >
                            <svg
                              width={isMobile ? "14" : "14"}
                              height={isMobile ? "14" : "14"}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => handleStartEdit(marker, e)}
                          style={{
                            padding: isMobile ? '0.15rem 0.3rem' : '0.2rem 0.5rem',
                            background: 'var(--neu-bg-base)',
                            border: 'none',
                            borderRadius: '3px',
                            color: textSecondary,
                            fontSize: isMobile ? '0.6rem' : '0.65rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: 'var(--neu-pressed)',
                            touchAction: 'manipulation',
                          }}
                          title="Edit marker"
                        >
                          Edit
                        </button>
                        {/* Delete Marker Button */}
                        <button
                          onClick={(e) => handleDeleteMarker(marker, e)}
                          style={{
                            width: isMobile ? '22px' : '24px',
                            height: isMobile ? '22px' : '24px',
                            minWidth: isMobile ? '22px' : '24px',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'transparent',
                            border: `1px solid transparent`,
                            borderRadius: '4px',
                            color: textSecondary,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            touchAction: 'manipulation',
                          }}
                          title={`Delete marker "${marker.name}"`}
                        >
                          <svg
                            width={isMobile ? "12" : "14"}
                            height={isMobile ? "12" : "14"}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Marker Edit Popup - mobile/tablet only (like speed popup) */}
      {isMobileOrTablet && editingMarkerId && editFormData && (() => {
        const marker = sortedMarkers.find((m) => m.id === editingMarkerId);
        if (!marker) return null;
        const isCompactPopupMobile = isMobile && window.innerWidth <= 430;
        const isUltraCompactPopup = isMobile && window.innerWidth <= 360;
        const popupPadding = isCompactPopupMobile ? 14 : isMobile ? 18 : 18;
        const popupWidth = isMobile
          ? Math.min(window.innerWidth - (isUltraCompactPopup ? 12 : 20), 380)
          : Math.min(320, window.innerWidth - 40);
        const popupSectionStyle: React.CSSProperties = {
          display: 'flex',
          flexDirection: 'column',
          gap: isCompactPopupMobile ? 8 : 10,
          padding: isCompactPopupMobile ? '10px' : isMobile ? '12px' : '10px',
          borderRadius: isCompactPopupMobile ? 10 : 12,
          background: isLightMode ? 'rgba(255, 255, 255, 0.56)' : 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${borderColor}`,
        };
        const popupInputStyle: React.CSSProperties = {
          width: '100%',
          padding: isCompactPopupMobile ? '9px 8px' : '10px 8px',
          background: 'var(--neu-bg-base)',
          border: 'none',
          borderRadius: 6,
          color: textColor,
          fontSize: isCompactPopupMobile ? '0.82rem' : '0.9rem',
          fontFamily: 'monospace',
          textAlign: 'center',
          boxShadow: 'var(--neu-pressed)',
          boxSizing: 'border-box',
        };
        const popupStepperButtonStyle: React.CSSProperties = {
          width: isCompactPopupMobile ? 32 : 36,
          height: isCompactPopupMobile ? 32 : 36,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          fontSize: isCompactPopupMobile ? '0.92rem' : '1rem',
          fontWeight: 700,
        };
        const popupActionButtonStyle: React.CSSProperties = {
          padding: isCompactPopupMobile ? '11px 14px' : '12px 20px',
          width: '100%',
          border: 'none',
          borderRadius: isCompactPopupMobile ? 9 : 10,
          fontSize: isCompactPopupMobile ? '0.88rem' : '0.95rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: 'var(--neu-pressed)',
          touchAction: 'manipulation',
        };
        const popupContent = (
          <div
            style={{
              padding: popupPadding,
              width: popupWidth,
              maxWidth: '100%',
              maxHeight: isCompactPopupMobile ? 'calc(100dvh - 12px)' : '85vh',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              boxSizing: 'border-box',
              background: isLightMode
                ? 'linear-gradient(180deg, rgba(248, 250, 253, 0.98) 0%, rgba(228, 235, 245, 0.98) 100%)'
                : 'linear-gradient(180deg, rgba(28, 34, 34, 0.98) 0%, rgba(18, 20, 20, 0.98) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: isLightMode ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: isCompactPopupMobile ? 20 : isMobile ? 18 : 14,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.28)',
              display: 'flex',
              flexDirection: 'column',
              gap: isCompactPopupMobile ? 12 : 16,
              animation: 'fadeInScale 0.2s ease-out',
              paddingBottom: isCompactPopupMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 14px)' : popupPadding,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <div style={{ fontSize: isCompactPopupMobile ? '0.94rem' : '1rem', fontWeight: 700, color: textColor }}>
                  Adjust Marker
                </div>
                <div style={{ color: textSecondary, fontSize: isCompactPopupMobile ? '0.72rem' : '0.76rem', lineHeight: 1.4 }}>
                  Fine-tune the range, playback speed, and looping before you continue.
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                style={{
                  width: isCompactPopupMobile ? 30 : 32,
                  height: isCompactPopupMobile ? 30 : 32,
                  padding: 0,
                  borderRadius: '999px',
                  border: `1px solid ${borderColor}`,
                  background: isLightMode ? 'rgba(255, 255, 255, 0.78)' : 'rgba(255, 255, 255, 0.06)',
                  color: textSecondary,
                  cursor: 'pointer',
                  flexShrink: 0,
                  fontSize: isCompactPopupMobile ? '0.88rem' : '0.95rem',
                  fontWeight: 700,
                }}
                title="Close"
              >
                x
              </button>
            </div>
            {/* Color + Name */}
            <div style={popupSectionStyle}>
              <div style={{ color: textSecondary, fontSize: isCompactPopupMobile ? '0.72rem' : '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Label
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: isUltraCompactPopup ? 'column' : 'row',
                  alignItems: isUltraCompactPopup ? 'stretch' : 'center',
                  gap: isCompactPopupMobile ? 10 : 12,
                }}
              >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = PRESET_COLORS.indexOf(editFormData.color as typeof PRESET_COLORS[number]);
                  const nextIndex = (currentIndex + 1) % PRESET_COLORS.length;
                  setEditFormData({ ...editFormData, color: PRESET_COLORS[nextIndex] });
                }}
                style={{
                  width: isCompactPopupMobile ? 24 : 28,
                  height: isCompactPopupMobile ? 24 : 28,
                  borderRadius: '50%',
                  background: editFormData.color,
                  border: `2px solid ${isLightMode ? '#006644' : '#00AA66'}`,
                  flexShrink: 0,
                  cursor: 'pointer',
                  alignSelf: isUltraCompactPopup ? 'flex-start' : 'center',
                }}
                title="Tap to change color"
              />
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Marker name"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: isCompactPopupMobile ? '11px 12px' : '12px 14px',
                  background: 'var(--neu-bg-base)',
                  border: `2px solid ${isLightMode ? '#006644' : '#00AA66'}`,
                  borderRadius: 8,
                  color: textColor,
                  fontSize: isCompactPopupMobile ? '0.88rem' : '0.95rem',
                  fontWeight: 600,
                  boxShadow: 'var(--neu-pressed)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            </div>
            {/* Time Range */}
            <div style={popupSectionStyle}>
              <span style={{ color: textSecondary, fontSize: isCompactPopupMobile ? '0.76rem' : '0.8rem', fontWeight: 600 }}>Time Range</span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isUltraCompactPopup ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                  gap: isCompactPopupMobile ? 8 : 10,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ color: textSecondary, fontSize: isCompactPopupMobile ? '0.7rem' : '0.75rem' }}>Start</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: 6, alignItems: 'center' }}>
                    <input
                      type="number"
                      min={0}
                      max={599}
                      value={startMinStr}
                      onChange={(e) => setStartMinStr(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      onBlur={commitTimeInputs}
                      placeholder="m"
                      style={popupInputStyle}
                    />
                    <span style={{ color: textSecondary, fontSize: isCompactPopupMobile ? '0.8rem' : '0.85rem' }}>:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={startSecStr}
                      onChange={(e) => setStartSecStr(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      onBlur={commitTimeInputs}
                      placeholder="s"
                      style={popupInputStyle}
                    />
                  </div>
                </div>
                <span style={{ display: 'none', color: textSecondary, marginLeft: 4 }}>-</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ color: textSecondary, fontSize: isCompactPopupMobile ? '0.7rem' : '0.75rem' }}>End</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: 6, alignItems: 'center' }}>
                    <input
                      type="number"
                      min={0}
                      max={599}
                      value={endMinStr}
                      onChange={(e) => setEndMinStr(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      onBlur={commitTimeInputs}
                      placeholder="m"
                      style={popupInputStyle}
                    />
                    <span style={{ color: textSecondary, fontSize: isCompactPopupMobile ? '0.8rem' : '0.85rem' }}>:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={endSecStr}
                      onChange={(e) => setEndSecStr(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      onBlur={commitTimeInputs}
                      placeholder="s"
                      style={popupInputStyle}
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Speed + Loop */}
            <div style={popupSectionStyle}>
              <div style={{ color: textSecondary, fontSize: isCompactPopupMobile ? '0.76rem' : '0.8rem', fontWeight: 600 }}>Playback</div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: isCompactPopupMobile ? 'column' : 'row',
                  alignItems: isCompactPopupMobile ? 'stretch' : 'center',
                  justifyContent: 'space-between',
                  gap: isCompactPopupMobile ? 10 : 16,
                }}
              >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCompactPopupMobile ? 'space-between' : 'flex-start',
                  gap: isCompactPopupMobile ? 8 : 10,
                  width: isCompactPopupMobile ? '100%' : 'auto',
                }}
              >
                <span style={{ color: textSecondary, fontSize: isCompactPopupMobile ? '0.8rem' : '0.85rem', fontWeight: 600 }}>Speed</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newSpeed = Math.max(0.3, editFormData.speed - 0.1);
                    setEditFormData({ ...editFormData, speed: Math.round(newSpeed * 10) / 10 });
                  }}
                  disabled={editFormData.speed <= 0.3}
                  style={{
                    ...popupStepperButtonStyle,
                    color: editFormData.speed <= 0.3 ? textSecondary : textColor,
                    cursor: editFormData.speed <= 0.3 ? 'not-allowed' : 'pointer',
                  }}
                >-</button>
                <span style={{ color: textColor, fontFamily: 'monospace', fontSize: isCompactPopupMobile ? '0.92rem' : '1rem', fontWeight: 700, minWidth: isCompactPopupMobile ? 42 : 48, textAlign: 'center' }}>
                  {editFormData.speed.toFixed(1)}x
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newSpeed = Math.min(4.0, editFormData.speed + 0.1);
                    setEditFormData({ ...editFormData, speed: Math.round(newSpeed * 10) / 10 });
                  }}
                  disabled={editFormData.speed >= 4.0}
                  style={{
                    ...popupStepperButtonStyle,
                    color: editFormData.speed >= 4.0 ? textSecondary : textColor,
                    cursor: editFormData.speed >= 4.0 ? 'not-allowed' : 'pointer',
                  }}
                >+</button>
              </div>
              <label
                style={{
                  display: 'flex',
                  flexDirection: isCompactPopupMobile ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  justifyContent: isCompactPopupMobile ? 'space-between' : 'flex-start',
                  gap: 10,
                  cursor: 'pointer',
                  fontSize: isCompactPopupMobile ? '0.82rem' : '0.9rem',
                  color: textColor,
                  userSelect: 'none',
                  width: isCompactPopupMobile ? '100%' : 'auto',
                  padding: isCompactPopupMobile ? '8px 10px' : 0,
                  borderRadius: isCompactPopupMobile ? 8 : 0,
                  background: isCompactPopupMobile ? 'var(--neu-bg-base)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={editFormData.loop}
                  onChange={(e) => setEditFormData({ ...editFormData, loop: e.target.checked })}
                  style={{
                    width: isCompactPopupMobile ? 18 : 20,
                    height: isCompactPopupMobile ? 18 : 20,
                    cursor: 'pointer',
                    accentColor: isLightMode ? '#006644' : '#00AA66',
                  }}
                />
                <span style={{ color: editFormData.loop ? '#00AA00' : textSecondary, fontWeight: 600 }}>Loop</span>
              </label>
            </div>
            </div>
            {/* Save / Cancel */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isCompactPopupMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                gap: isCompactPopupMobile ? 8 : 12,
                marginTop: 4,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                style={{
                  ...popupActionButtonStyle,
                  background: 'var(--neu-bg-base)',
                  color: textColor,
                }}
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveEdit(marker.id);
                }}
                style={{
                  ...popupActionButtonStyle,
                  background: isLightMode ? '#006644' : '#00AA66',
                  color: '#FFFFFF',
                }}
              >
                Save
              </button>
            </div>
          </div>
        );
        return createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(2px)',
              zIndex: 10020,
              display: 'flex',
              alignItems: isCompactPopupMobile ? 'flex-end' : 'center',
              justifyContent: 'center',
              padding: isCompactPopupMobile ? 8 : 16,
              paddingBottom: isCompactPopupMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 8px)' : 16,
              boxSizing: 'border-box',
            }}
            onClick={() => handleCancelEdit()}
          >
            {popupContent}
          </div>,
          document.body
        );
      })()}

      {/* TASK 20: Custom Scrollbar Styling */}
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .marker-list-container::-webkit-scrollbar {
          width: 8px;
        }
        .marker-list-container::-webkit-scrollbar-track {
          background: ${isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'};
          border-radius: 4px;
        }
        .marker-list-container::-webkit-scrollbar-thumb {
          background: ${isLightMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'};
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        .marker-list-container::-webkit-scrollbar-thumb:hover {
          background: ${isLightMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'};
        }
        /* Firefox scrollbar */
        .marker-list-container {
          scrollbar-width: thin;
          scrollbar-color: ${isLightMode ? 'rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05)'};
        }
      `}</style>
    </div>
  );
};

export default MarkerPanel;
