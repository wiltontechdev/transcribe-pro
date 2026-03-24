// PlaybackPanel.tsx - Julius - Week 1-2
// Playback controls panel with Kenyan-themed styling, glassmorphism, and animations

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAudioEngine } from '../audio/useAudioEngine';
import { useAppStore } from '../../store/store';
import { MarkerManager } from '../markers/MarkerManager';
import { showToast } from '../ui/Toast';

// Kenyan flag colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';
const KENYAN_WHITE = '#FFFFFF';

// Handwritten font family - Merienda from Google Fonts
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', 'Patrick Hand', cursive";
const UI_FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

interface MarkerEditDraft {
  name: string;
  start: string;
  end: string;
  speed: string;
  loop: boolean;
}

interface PlaybackPanelProps {
  forceCompactLayout?: boolean;
}

const PlaybackPanel: React.FC<PlaybackPanelProps> = ({ forceCompactLayout = false }) => {
  const { 
    play, 
    pause, 
    stop, 
    seek,
    resumeAudioContext,
    setSpeed,
    setLoop,
    disableLoop,
  } = useAudioEngine();
  
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  
  // Mobile and tablet detection for responsive speed popup
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const isMobile = forceCompactLayout || windowWidth < 768;
  const isTablet = !forceCompactLayout && windowWidth >= 768 && windowWidth <= 1024;
  const isMobileOrTablet = isMobile || isTablet;
  const isCompactMobile = isMobile && (forceCompactLayout || windowWidth <= 420);
  const isTinyMobile = isMobile && (forceCompactLayout || windowWidth <= 360);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Use store state for reactive updates (not hook's ref-based values)
  const audio = useAppStore((state) => state.audio) || {
    file: null,
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isLoaded: false,
  };
  
  // Get isAudioLoaded and isPlaying from store for reactivity
  const isAudioLoaded = audio.isLoaded;
  const isPlaying = audio.isPlaying;
  const markers = useAppStore((state) => state.markers);
  const selectedMarkerId = useAppStore((state) => state.ui.selectedMarkerId);
  const setSelectedMarkerId = useAppStore((state) => state.setSelectedMarkerId);
  const activeMarker = selectedMarkerId
    ? markers.find((marker) => marker.id === selectedMarkerId) ?? null
    : null;
  const hasMarkers = markers.length > 0;
  const isActiveMarkerLooping = !!activeMarker?.loop;
  
  const storedSpeed = useAppStore((state) => state.globalControls.playbackRate);
  const [playbackSpeed, setPlaybackSpeed] = useState(storedSpeed || 1.0);
  const [showSpeedPopup, setShowSpeedPopup] = useState(false);
  const [showMarkerEditPopup, setShowMarkerEditPopup] = useState(false);
  const [markerEditDraft, setMarkerEditDraft] = useState<MarkerEditDraft | null>(null);
  const speedPopupRef = useRef<HTMLDivElement>(null);
  const mutedHintShownRef = useRef(false);
  
  // Sync playback speed with store
  useEffect(() => {
    if (storedSpeed !== undefined && Math.abs(storedSpeed - playbackSpeed) > 0.01) {
      setPlaybackSpeed(storedSpeed);
    }
  }, [storedSpeed]);
  
  // Close speed popup when clicking/touching outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (speedPopupRef.current && !speedPopupRef.current.contains(e.target as Node)) {
        setShowSpeedPopup(false);
      }
    };
    if (showSpeedPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showSpeedPopup]);
  
  // Theme-aware colors
  const textColor = isLightMode ? '#1a1a1a' : '#FFFFFF';
  const textSecondary = isLightMode ? '#4a5568' : 'rgba(255, 255, 255, 0.62)';
  const bgPrimary = isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'linear-gradient(145deg, rgba(15, 15, 15, 0.95), rgba(26, 26, 26, 0.9))';
  const glassBg = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.3)';
  const borderColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
  const buttonBg = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)';

  useEffect(() => {
    return () => {};
  }, []);

  const handlePlay = async () => {
    if (!isAudioLoaded) return;

    const storeBefore = useAppStore.getState();
    console.debug('[PlaybackDebug][UI] play-click', {
      isAudioLoaded,
      isPlaying,
      currentTime: storeBefore.audio.currentTime,
      muted: storeBefore.globalControls.isMuted,
      volumeDb: storeBefore.globalControls.volume,
      selectedMarkerId: storeBefore.ui.selectedMarkerId,
    });

    const showMutedHintOnce = () => {
      const state = useAppStore.getState();
      const muted = state.globalControls.isMuted || (state.globalControls.volume ?? 6) <= -60;
      if (muted && !mutedHintShownRef.current) {
        mutedHintShownRef.current = true;
        showToast('Audio is muted. Press M or click the speaker icon to unmute.', 'warning', 2500);
      } else if (!muted) {
        mutedHintShownRef.current = false;
      }
    };

    try {
      // CRITICAL: play() must run before any await - browsers block audio if user gesture is lost.
      // Awaiting seek/resume before play() loses the gesture, so first play would be silent.
      const store = useAppStore.getState();
      const selectedMarkerId = store.ui.selectedMarkerId;
      if (selectedMarkerId) {
        const marker = MarkerManager.getMarker(selectedMarkerId);
        if (marker) seek(marker.start); // Fire seek (sync internally) - don't await
      }
      await play(); // play() runs howl.play() synchronously before its first await
      console.debug('[PlaybackDebug][UI] play-success', {
        storeIsPlaying: useAppStore.getState().audio.isPlaying,
        currentTime: useAppStore.getState().audio.currentTime,
      });
      showMutedHintOnce();
    } catch (err) {
      console.error('[PlaybackDebug][UI] play-failed-first-attempt', err);
      try {
        // Retry after explicit context resume; handles occasional Electron context race.
        await resumeAudioContext();
        await play();
        console.debug('[PlaybackDebug][UI] play-success-after-retry', {
          storeIsPlaying: useAppStore.getState().audio.isPlaying,
          currentTime: useAppStore.getState().audio.currentTime,
        });
        showMutedHintOnce();
        return;
      } catch (retryErr) {
        console.error('[PlaybackDebug][UI] play-failed-retry', retryErr);
      }
      showToast('Playback failed. Please reload the audio file and try again.', 'error', 3500);
    }
  };

  const handlePause = () => {
    try {
      pause();
    } catch (err) {
    }
  };

  const handlePlayPauseToggle = () => {
    if (!isAudioLoaded) return;
    if (isPlaying) {
      handlePause();
      return;
    }
    void handlePlay();
  };

  const handleStop = () => {
    try {
      stop();
    } catch (err) {
    }
  };

  const handleMarkerNavigation = (direction: 'previous' | 'next') => {
    if (!markerControlsEnabled) return;

    try {
      const marker = direction === 'previous'
        ? MarkerManager.getPreviousMarker()
        : MarkerManager.getNextMarker();

      if (!marker) return;

      void MarkerManager.setActiveMarker(marker.id, {
        seekToMarker: true,
        audioEngine: { seek, setLoop, disableLoop },
      });
    } catch (_err) {
    }
  };

  const handleToggleActiveMarkerLoop = () => {
    if (!activeMarker) return;

    try {
      const nextLoop = !activeMarker.loop;
      MarkerManager.updateMarker(activeMarker.id, { loop: nextLoop });

      if (nextLoop) {
        setLoop(activeMarker.start, activeMarker.end);
      } else {
        disableLoop();
      }
    } catch (_err) {
    }
  };

  const handleSkipBackward = async () => {
    if (!isAudioLoaded) return;
    const newTime = Math.max(0, (audio.currentTime || 0) - 5);
    await seek(newTime);
  };

  const handleSkipForward = async () => {
    if (!isAudioLoaded || !audio.duration) return;
    const newTime = Math.min(audio.duration, (audio.currentTime || 0) + 5);
    await seek(newTime);
  };

  const handleSpeedChange = (speed: number) => {
    const clampedSpeed = Math.max(0.25, Math.min(4.0, Math.round(speed * 100) / 100));
    setPlaybackSpeed(clampedSpeed);
    
    // IMMEDIATE speed change - no debounce for instant response like YouTube!
    setSpeed(clampedSpeed);
    useAppStore.getState().setPlaybackRate(clampedSpeed);
  };

  const openMarkerEditPopup = () => {
    if (!activeMarker) return;
    setMarkerEditDraft({
      name: activeMarker.name,
      start: activeMarker.start.toFixed(2),
      end: activeMarker.end.toFixed(2),
      speed: (activeMarker.speed ?? 1.0).toFixed(2),
      loop: activeMarker.loop === true,
    });
    setShowMarkerEditPopup(true);
  };

  const closeMarkerEditPopup = () => {
    setShowMarkerEditPopup(false);
    setMarkerEditDraft(null);
  };

  const handleSaveMarkerEdit = () => {
    if (!activeMarker || !markerEditDraft) return;

    try {
      const name = markerEditDraft.name.trim() || activeMarker.name;
      const start = Math.max(0, Number.parseFloat(markerEditDraft.start) || 0);
      let end = Math.max(0, Number.parseFloat(markerEditDraft.end) || 0);
      const speed = Math.max(0.3, Math.min(4.0, Number.parseFloat(markerEditDraft.speed) || 1.0));

      if (end <= start) {
        end = start + 0.1;
      }

      MarkerManager.updateMarker(activeMarker.id, {
        name,
        start,
        end,
        speed,
        loop: markerEditDraft.loop,
      });

      if (selectedMarkerId === activeMarker.id) {
        if (markerEditDraft.loop) {
          setLoop(start, end);
        } else {
          disableLoop();
        }

        const currentTime = useAppStore.getState().audio.currentTime || 0;
        const nextSpeed = currentTime >= start && currentTime <= end ? speed : 1.0;
        setSpeed(nextSpeed);
        useAppStore.getState().setPlaybackRate(nextSpeed);
      }

      closeMarkerEditPopup();
      showToast(`Updated "${name}"`, 'success', 2200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update marker.';
      showToast(message, 'error', 3000);
    }
  };

  const handleDeleteActiveMarker = () => {
    if (!activeMarker) return;

    const confirmed = window.confirm(`Delete marker "${activeMarker.name}"?\n\nThis cannot be undone.`);
    if (!confirmed) return;

    try {
      MarkerManager.deleteMarker(activeMarker.id);
      disableLoop();
      setSpeed(1.0);
      useAppStore.getState().setPlaybackRate(1.0);
      closeMarkerEditPopup();
      showToast(`Deleted "${activeMarker.name}"`, 'success', 2200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete marker.';
      showToast(message, 'error', 3000);
    }
  };

  const handleClearActiveMarker = () => {
    if (!activeMarker) return;

    disableLoop();
    setSpeed(1.0);
    useAppStore.getState().setPlaybackRate(1.0);
    setSelectedMarkerId(null);
    closeMarkerEditPopup();
    showToast('Returned to normal playback.', 'info', 1800);
  };

  const renderMarkerCardTitle = () => {
    if (markerCardState === 'active') return activeMarker?.name || 'Active marker';
    if (markerCardState === 'idle') return 'No Active Marker';
    return 'No Markers Yet';
  };

  const renderMarkerCardSubtitle = () => {
    if (markerCardState === 'active' && activeMarker) {
      const markerSpeed = activeMarker.speed ?? 1.0;
      const speedLabel = markerSpeed !== 1.0 ? ` | ${markerSpeed.toFixed(1)}x` : '';
      const loopLabel = activeMarker.loop ? ' | loop' : '';
      return `${formatTime(activeMarker.start)} - ${formatTime(activeMarker.end)}${speedLabel}${loopLabel}`;
    }
    if (markerCardState === 'idle') {
      return 'Tap a timeline marker to edit or remove it here.';
    }
    return 'Create markers on the timeline to manage them here.';
  };

  const formatTime = (seconds: number | undefined): string => {
    if (seconds === undefined || seconds === null || isNaN(seconds) || !isFinite(seconds)) {
      return '0:00';
    }
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.floor(Math.max(0, seconds) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileType = (fileName: string | null): string => {
    if (!fileName) return '';
    const ext = fileName.split('.').pop()?.toUpperCase();
    return ext || '';
  };

  // Calculate progress percentage
  const progressPercent = audio.duration > 0 
    ? (audio.currentTime / audio.duration) * 100 
    : 0;

  const mobilePrimaryButtonSize = isTinyMobile ? '38px' : isCompactMobile ? '42px' : '46px';
  const mobilePrimaryButtonMinSize = isTinyMobile ? '36px' : isCompactMobile ? '38px' : '42px';
  const mobileSecondaryButtonSize = isTinyMobile ? '34px' : isCompactMobile ? '38px' : '42px';
  const mobileSecondaryButtonMinSize = isTinyMobile ? '32px' : isCompactMobile ? '34px' : '38px';
  const mobileTertiaryButtonSize = isTinyMobile ? '30px' : isCompactMobile ? '34px' : '38px';
  const mobileTertiaryButtonMinSize = isTinyMobile ? '28px' : isCompactMobile ? '32px' : '34px';
  const mobilePanelPadding = isTinyMobile ? '1px 2px' : isCompactMobile ? '2px 3px' : '3px 5px';
  const mobilePanelGap = isTinyMobile ? '1px' : isCompactMobile ? '2px' : '4px';
  const mobileFileIconSize = isTinyMobile ? '11' : isCompactMobile ? '12' : '14';
  const mobileFileLabelSize = isTinyMobile ? '0.62rem' : isCompactMobile ? '0.66rem' : '0.7rem';
  const mobileTimeIconSize = isTinyMobile ? '9' : isCompactMobile ? '10' : '12';
  const mobileTimeLabelSize = isTinyMobile ? '0.62rem' : isCompactMobile ? '0.66rem' : '0.72rem';
  const mobileTransportGap = isTinyMobile ? '2px' : isCompactMobile ? '4px' : '6px';
  const mobilePrimaryIconSize = isTinyMobile ? '17' : isCompactMobile ? '19' : '21';
  const mobileSecondaryIconSize = isTinyMobile ? '16' : isCompactMobile ? '18' : '20';
  const mobileTransportStackGap = isTinyMobile ? '3px' : isCompactMobile ? '4px' : '5px';
  const mobileUtilityGap = isTinyMobile ? '6px' : isCompactMobile ? '8px' : '10px';
  const mobileUtilityRailGap = isTinyMobile ? '4px' : '6px';
  const mobileUtilityRailPadding = isTinyMobile ? '4px' : '5px';
  const mobileUtilityActionSize = isTinyMobile ? '28px' : isCompactMobile ? '30px' : '32px';
  const mobileUtilityActionIconSize = isTinyMobile ? '14' : '15';
  const markerLoopColor = isActiveMarkerLooping ? KENYAN_GREEN : KENYAN_RED;
  const markerControlsEnabled = hasMarkers;
  const markerCardState = activeMarker
    ? 'active'
    : hasMarkers
      ? 'idle'
      : 'empty';

  // Neumorphic button style - responsive size for good UX
  // Larger buttons on mobile for better touch targets (44-52px)
  const glassButtonStyle = (isActive: boolean, isDisabled: boolean, color: string = textColor) => ({
    width: isMobile ? mobilePrimaryButtonSize : 'clamp(36px, 10vw, 48px)',
    height: isMobile ? mobilePrimaryButtonSize : 'clamp(36px, 10vw, 48px)',
    minWidth: isMobile ? mobilePrimaryButtonMinSize : '36px',
    minHeight: isMobile ? mobilePrimaryButtonMinSize : '36px',
    borderRadius: '50%',
    background: isLightMode ? '#e4ebf5' : '#1e1e1e',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: isActive 
      ? (isLightMode 
          ? 'inset 4px 4px 8px rgba(163, 177, 198, 0.5), inset -4px -4px 8px rgba(255, 255, 255, 0.8)'
          : 'inset 4px 4px 8px rgba(0, 0, 0, 0.5), inset -3px -3px 6px rgba(50, 50, 50, 0.2)')
      : (isLightMode 
          ? '6px 6px 12px rgba(163, 177, 198, 0.5), -6px -6px 12px rgba(255, 255, 255, 0.8)'
          : '6px 6px 12px rgba(0, 0, 0, 0.4), -4px -4px 10px rgba(50, 50, 50, 0.2)'),
    transition: 'transform 0.06s ease, box-shadow 0.1s ease, color 0.1s ease',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    color: isActive ? KENYAN_GREEN : color,
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  });

  return (
    <div className="playback-panel mx-auto w-full max-w-full overflow-x-auto" style={{ 
      height: isMobile ? 'auto' : '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? mobilePanelGap : 'clamp(0.25rem, 1vw, 0.4rem)',
      padding: isMobile ? mobilePanelPadding : 'clamp(0.35rem, 1.5vw, 0.5rem) clamp(0.5rem, 2vw, 0.75rem)',
      background: isLightMode ? '#e4ebf5' : '#1a1a1a',
      borderRadius: isMobile ? '6px' : 'clamp(12px, 3vw, 16px)',
      border: 'none',
      boxShadow: isLightMode
        ? '6px 6px 12px rgba(166, 180, 200, 0.5), -4px -4px 10px rgba(255, 255, 255, 0.9)'
        : '6px 6px 12px rgba(0, 0, 0, 0.5), -4px -4px 10px rgba(255, 255, 255, 0.05)',
      transition: 'transform 0.08s ease, box-shadow 0.12s ease',
      overflowY: 'visible',
      overflowX: 'hidden',
      position: 'relative',
      fontFamily: isMobile ? UI_FONT : HANDWRITTEN_FONT,
      minHeight: isMobile ? 'auto' : 'fit-content'
    }}>
      {/* Animated background gradient - hidden on mobile */}
      {!isMobile && (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isLightMode 
          ? `radial-gradient(ellipse at 20% 20%, ${KENYAN_GREEN}08 0%, transparent 50%),
             radial-gradient(ellipse at 80% 80%, ${KENYAN_RED}08 0%, transparent 50%)`
          : `radial-gradient(ellipse at 20% 20%, ${KENYAN_GREEN}10 0%, transparent 50%),
             radial-gradient(ellipse at 80% 80%, ${KENYAN_RED}10 0%, transparent 50%)`,
        pointerEvents: 'none',
        animation: 'backgroundPulse 4s ease-in-out infinite alternate'
      }} />
      )}

      {/* Animated File Name - Hidden on mobile to save space */}
      {!isMobile && (
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(0.25rem, 1vw, 0.5rem)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
        maxWidth: '100%',
        padding: 'clamp(0.1rem, 0.5vw, 0.2rem) clamp(0.2rem, 1vw, 0.4rem)',
        minHeight: 'auto',
        borderRadius: '8px',
        backgroundImage: isPlaying 
          ? `linear-gradient(90deg, ${KENYAN_RED}20, ${KENYAN_GREEN}20, ${KENYAN_RED}20)`
          : 'none',
        backgroundColor: isPlaying ? 'transparent' : 'transparent',
        backgroundSize: isPlaying ? '200% 100%' : 'auto',
        animation: isPlaying ? 'gradientSlide 3s ease-in-out infinite' : 'none'
      }}>
        {/* File name with marquee effect for long names */}
        <div style={{
          color: isPlaying 
            ? KENYAN_GREEN
            : textColor,
          fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)',
          fontWeight: '600',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 'clamp(120px, 40vw, 200px)',
          fontFamily: HANDWRITTEN_FONT,
          textShadow: isPlaying 
            ? `0 0 10px ${KENYAN_GREEN}80, 0 0 20px ${KENYAN_GREEN}40`
            : 'none',
          animation: isPlaying ? 'textGlow 2s ease-in-out infinite' : 'none',
          transition: 'color 0.12s ease, opacity 0.12s ease'
        }}>
          {audio.file?.name || 'No audio loaded'}
        </div>
        
        {/* Animated equalizer bars when playing */}
        {isPlaying && (
          <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '14px' }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: '3px',
                  background: `linear-gradient(to top, ${KENYAN_RED}, ${KENYAN_GREEN})`,
                  borderRadius: '2px',
                  animation: `equalizer 0.${4 + i}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        )}
      </div>
      )}
      
      {/* CSS Animations for file name */}
      <style>{`
        @keyframes gradientSlide {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes textGlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes equalizer {
          0% { height: 4px; }
          100% { height: 14px; }
        }
      `}</style>

        {/* Mobile: Music name with clock icon */}
      {isMobile && !isTinyMobile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isTinyMobile ? '3px' : isCompactMobile ? '4px' : '6px',
          padding: isTinyMobile ? '0 4px' : isCompactMobile ? '1px 6px' : '2px 8px',
          marginBottom: isTinyMobile ? '0' : '1px',
        }}>
          {/* Clock/Music icon */}
          <svg 
            width={mobileFileIconSize}
            height={mobileFileIconSize}
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={isPlaying ? KENYAN_GREEN : textColor}
            strokeWidth="2" 
            strokeLinecap="round"
            style={{ flexShrink: 0, opacity: 0.7 }}
          >
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          {/* File name - truncated */}
          <span style={{
            color: isPlaying ? KENYAN_GREEN : textColor,
            fontSize: mobileFileLabelSize,
            fontWeight: '600',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: isTinyMobile ? '132px' : isCompactMobile ? '160px' : '200px',
            fontFamily: UI_FONT,
            letterSpacing: '0.01em',
          }}>
            {audio.file?.name?.replace(/\.[^/.]+$/, '') || 'No audio'}
          </span>
        </div>
      )}

        {/* Time Progress Display - Compact on mobile */}
      <div className="playback-time-display mx-auto w-full max-w-full px-1" style={{
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        alignItems: isMobile ? 'center' : 'stretch',
        justifyContent: isMobile ? 'center' : 'flex-start',
        gap: isMobile ? (isTinyMobile ? '4px' : isCompactMobile ? '6px' : '8px') : '0.25rem',
        position: 'relative',
        zIndex: 1,
        flexShrink: 0,
        marginBottom: isMobile ? '0' : '0.2rem',
      }}>
        {/* Progress Bar - Hidden on mobile, shown as thin line */}
        {!isMobile && (
        <div style={{
          width: '100%',
          height: '6px',
          background: isLightMode ? '#e4ebf5' : '#1a1a1a',
          borderRadius: '3px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: isLightMode 
            ? 'inset 2px 2px 4px rgba(166, 180, 200, 0.5), inset -1px -1px 2px rgba(255, 255, 255, 0.9)'
            : 'inset 2px 2px 4px rgba(0, 0, 0, 0.5), inset -1px -1px 2px rgba(255, 255, 255, 0.03)'
        }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${KENYAN_GREEN}, ${KENYAN_RED})`,
            borderRadius: '3px',
            transition: 'width 0.1s linear',
          }} />
        </div>
        )}
        
        {/* Time Display - Compact on mobile */}
        <div style={{
          display: 'flex',
          justifyContent: isMobile ? 'center' : 'space-between',
          alignItems: 'center',
          padding: isMobile ? '0' : 'clamp(0.15rem, 0.5vw, 0.2rem) clamp(0.25rem, 1vw, 0.4rem)',
          background: isMobile ? 'transparent' : (isLightMode ? '#e4ebf5' : '#1a1a1a'),
          borderRadius: '8px',
          border: 'none',
          boxShadow: isMobile ? 'none' : (isLightMode 
            ? 'inset 2px 2px 4px rgba(166, 180, 200, 0.4), inset -1px -1px 2px rgba(255, 255, 255, 0.8)'
            : 'inset 2px 2px 4px rgba(0, 0, 0, 0.4), inset -1px -1px 2px rgba(255, 255, 255, 0.03)'),
          flexWrap: 'wrap',
          gap: '0.25rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? (isTinyMobile ? '2px' : isCompactMobile ? '3px' : '4px') : 'clamp(0.25rem, 1vw, 0.5rem)'
          }}>
            {/* Clock icon - smaller on mobile */}
            <svg width={isMobile ? mobileTimeIconSize : "clamp(12px, 3vw, 16px)"} height={isMobile ? mobileTimeIconSize : "clamp(12px, 3vw, 16px)"} viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{
              fontSize: isMobile ? mobileTimeLabelSize : 'clamp(0.75rem, 2.5vw, 1rem)',
              fontWeight: '700',
              fontFamily: isMobile ? UI_FONT : HANDWRITTEN_FONT,
              color: textColor,
              textShadow: isLightMode ? 'none' : `0 0 10px ${KENYAN_GREEN}60`,
              letterSpacing: isMobile ? '0.01em' : undefined,
            }}>
              {formatTime(audio?.currentTime)} / {formatTime(audio?.duration)}
            </span>
          </div>
          {/* File type indicator - Hidden on mobile */}
          {!isMobile && audio.file && (
            <div className="hide-on-mobile" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              {/* Audio file icon */}
              <svg width="clamp(10px, 2.5vw, 14px)" height="clamp(10px, 2.5vw, 14px)" viewBox="0 0 24 24" fill="none" stroke={KENYAN_RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
              <span style={{
                fontSize: 'clamp(0.65rem, 2vw, 0.85rem)',
                fontFamily: HANDWRITTEN_FONT,
                color: textColor,
                opacity: 0.7,
                background: `${KENYAN_RED}30`,
                padding: '0.1rem 0.3rem',
                borderRadius: '4px'
              }}>
                {getFileType(audio.file.name)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Playback Controls - Compact on mobile */}
      <div className="playback-transport-controls mx-auto flex flex-wrap justify-center items-center gap-1.5 px-2" style={{
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
        maxWidth: '100%',
        width: '100%',
        marginTop: isMobile ? '0' : 'clamp(0.15rem, 0.5vw, 0.25rem)',
        gap: isMobile ? mobileTransportGap : 'clamp(4px, 1.5vw, 6px)',
        padding: isMobile ? (isTinyMobile ? '0 1px' : isCompactMobile ? '0 2px' : '0 4px') : '0 clamp(4px, 1vw, 8px)',
        flex: isMobile ? '1 1 auto' : '0 0 auto',
        flexWrap: isTinyMobile ? 'nowrap' : undefined,
        justifyContent: isTinyMobile ? 'space-between' : undefined,
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? mobileTransportStackGap : 0,
          width: '100%',
          minWidth: 0,
        }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? mobileTransportGap : 'clamp(4px, 1.5vw, 6px)',
          width: isMobile ? '100%' : 'auto',
          minWidth: 0,
        }}>
        {/* Skip Backward -5s - Neumorphic */}
        <button
          onClick={handleSkipBackward}
          disabled={!isAudioLoaded}
          style={{
            ...glassButtonStyle(false, !isAudioLoaded),
            width: isMobile ? mobileSecondaryButtonSize : 'clamp(32px, 9vw, 40px)',
            height: isMobile ? mobileSecondaryButtonSize : 'clamp(32px, 9vw, 40px)',
            minWidth: isMobile ? mobileSecondaryButtonMinSize : '32px',
            minHeight: isMobile ? mobileSecondaryButtonMinSize : '32px',
          }}
          onMouseEnter={(e) => {
            if (isAudioLoaded) e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Skip -5 seconds"
        >
          <svg width={mobileSecondaryIconSize} height={mobileSecondaryIconSize} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
          </svg>
        </button>

        {isMobile ? (
          <>
            <button
              onClick={() => handleMarkerNavigation('previous')}
              disabled={!markerControlsEnabled}
              style={{
                ...glassButtonStyle(false, !markerControlsEnabled, KENYAN_GREEN),
                width: mobileSecondaryButtonSize,
                height: mobileSecondaryButtonSize,
                minWidth: mobileSecondaryButtonMinSize,
                minHeight: mobileSecondaryButtonMinSize,
              }}
              title={
                !hasMarkers
                  ? 'No markers available'
                  : 'Previous marker'
              }
            >
              <svg width={mobileSecondaryIconSize} height={mobileSecondaryIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>

            <button
              onClick={handlePlayPauseToggle}
              disabled={!isAudioLoaded}
              style={glassButtonStyle(isPlaying, !isAudioLoaded, KENYAN_GREEN)}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width={mobilePrimaryIconSize} height={mobilePrimaryIconSize} viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"/>
                  <rect x="14" y="4" width="4" height="16"/>
                </svg>
              ) : (
                <svg width={mobilePrimaryIconSize} height={mobilePrimaryIconSize} viewBox="0 0 24 24" fill={KENYAN_GREEN}>
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              )}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handlePlay}
              disabled={!isAudioLoaded || isPlaying}
              style={glassButtonStyle(false, !isAudioLoaded || isPlaying, KENYAN_GREEN)}
              onMouseEnter={(e) => {
                if (isAudioLoaded && !isPlaying) {
                  e.currentTarget.style.transform = 'scale(1.08)';
                  e.currentTarget.style.boxShadow = isLightMode
                    ? '8px 8px 16px rgba(163, 177, 198, 0.5), -8px -8px 16px rgba(255, 255, 255, 0.8), 0 0 20px rgba(0, 102, 68, 0.3)'
                    : '8px 8px 16px rgba(0, 0, 0, 0.4), -6px -6px 12px rgba(50, 50, 50, 0.3), 0 0 20px rgba(0, 102, 68, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = isLightMode
                  ? '6px 6px 12px rgba(163, 177, 198, 0.5), -6px -6px 12px rgba(255, 255, 255, 0.8)'
                  : '6px 6px 12px rgba(0, 0, 0, 0.4), -4px -4px 10px rgba(50, 50, 50, 0.2)';
              }}
              title="Play"
            >
              <svg width={isTinyMobile ? "18" : isCompactMobile ? "20" : "22"} height={isTinyMobile ? "18" : isCompactMobile ? "20" : "22"} viewBox="0 0 24 24" fill={KENYAN_GREEN}>
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </button>

            <button
              onClick={handlePause}
              disabled={!isAudioLoaded || !isPlaying}
              style={glassButtonStyle(isPlaying, !isAudioLoaded || !isPlaying, textColor)}
              onMouseEnter={(e) => {
                if (isAudioLoaded && isPlaying) {
                  e.currentTarget.style.transform = 'scale(1.08)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Pause"
            >
              <svg width={isTinyMobile ? "17" : isCompactMobile ? "19" : "21"} height={isTinyMobile ? "17" : isCompactMobile ? "19" : "21"} viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
          </>
        )}

        {/* Stop Button - Neumorphic */}
        <button
          onClick={handleStop}
          disabled={!isAudioLoaded}
          style={glassButtonStyle(false, !isAudioLoaded, KENYAN_RED)}
          onMouseEnter={(e) => {
            if (isAudioLoaded) {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.boxShadow = isLightMode
                ? '8px 8px 16px rgba(163, 177, 198, 0.5), -8px -8px 16px rgba(255, 255, 255, 0.8), 0 0 20px rgba(222, 41, 16, 0.3)'
                : '8px 8px 16px rgba(0, 0, 0, 0.4), -6px -6px 12px rgba(50, 50, 50, 0.3), 0 0 20px rgba(222, 41, 16, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = isLightMode
              ? '6px 6px 12px rgba(163, 177, 198, 0.5), -6px -6px 12px rgba(255, 255, 255, 0.8)'
              : '6px 6px 12px rgba(0, 0, 0, 0.4), -4px -4px 10px rgba(50, 50, 50, 0.2)';
          }}
          title="Stop"
        >
          <svg width={isMobile ? mobileSecondaryIconSize : "20"} height={isMobile ? mobileSecondaryIconSize : "20"} viewBox="0 0 24 24" fill={KENYAN_RED}>
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        </button>

        {isMobile && (
          <>
            <button
              onClick={() => handleMarkerNavigation('next')}
              disabled={!markerControlsEnabled}
              style={{
                ...glassButtonStyle(false, !markerControlsEnabled, KENYAN_GREEN),
                width: mobileSecondaryButtonSize,
                height: mobileSecondaryButtonSize,
                minWidth: mobileSecondaryButtonMinSize,
                minHeight: mobileSecondaryButtonMinSize,
              }}
              title={
                !hasMarkers
                  ? 'No markers available'
                  : 'Next marker'
              }
            >
              <svg width={mobileSecondaryIconSize} height={mobileSecondaryIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            <button
              onClick={handleToggleActiveMarkerLoop}
              disabled={!activeMarker}
              style={{
                ...glassButtonStyle(isActiveMarkerLooping, !activeMarker, markerLoopColor),
                width: mobileSecondaryButtonSize,
                height: mobileSecondaryButtonSize,
                minWidth: mobileSecondaryButtonMinSize,
                minHeight: mobileSecondaryButtonMinSize,
                border: `2px solid ${markerLoopColor}`,
              }}
              title={
                activeMarker
                  ? `${isActiveMarkerLooping ? 'Disable' : 'Enable'} loop for active marker`
                  : 'Select a marker to loop it'
              }
            >
              <svg width={mobileSecondaryIconSize} height={mobileSecondaryIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4"/>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <path d="M7 23l-4-4 4-4"/>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
            </button>
          </>
        )}

        {/* Skip Forward +5s - Neumorphic */}
        <button
          onClick={handleSkipForward}
          disabled={!isAudioLoaded}
          style={{
            ...glassButtonStyle(false, !isAudioLoaded),
            width: isMobile ? mobileSecondaryButtonSize : 'clamp(32px, 9vw, 40px)',
            height: isMobile ? mobileSecondaryButtonSize : 'clamp(32px, 9vw, 40px)',
            minWidth: isMobile ? mobileSecondaryButtonMinSize : '32px',
            minHeight: isMobile ? mobileSecondaryButtonMinSize : '32px',
          }}
          onMouseEnter={(e) => {
            if (isAudioLoaded) e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Skip +5 seconds"
        >
          <svg width={mobileSecondaryIconSize} height={mobileSecondaryIconSize} viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 6v12l8.5-6L13 6zM4 18l8.5-6L4 6v12z"/>
          </svg>
        </button>
        </div>

        {/* Speed Control + Mobile Marker Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            width: isMobile ? '100%' : 'auto',
            maxWidth: '100%',
            minWidth: 0,
            gap: isMobileOrTablet ? mobileUtilityGap : '10px',
            flexWrap: isMobileOrTablet ? 'nowrap' : 'wrap',
            marginTop: isMobileOrTablet ? '2px' : 0,
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0,
              gap: isMobileOrTablet ? mobileUtilityRailGap : undefined,
              padding: isMobileOrTablet ? mobileUtilityRailPadding : undefined,
              borderRadius: isMobileOrTablet ? '16px' : undefined,
              background: isMobileOrTablet
                ? (isLightMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.05)')
                : undefined,
              border: isMobileOrTablet ? `1px solid ${borderColor}` : undefined,
              boxShadow: isMobileOrTablet
                ? (isLightMode
                    ? 'inset 1px 1px 2px rgba(255,255,255,0.9), inset -1px -1px 2px rgba(166,180,200,0.22)'
                    : 'inset 1px 1px 2px rgba(255,255,255,0.04), inset -1px -1px 2px rgba(0,0,0,0.3)')
                : undefined,
            }}
          >
            <button
              onClick={() => setShowSpeedPopup(!showSpeedPopup)}
              disabled={!isAudioLoaded}
              style={{
                ...glassButtonStyle(playbackSpeed !== 1.0, !isAudioLoaded, playbackSpeed !== 1.0 ? '#f39c12' : textColor),
                width: isMobile ? mobileTertiaryButtonSize : 'clamp(28px, 8vw, 32px)',
                height: isMobile ? mobileTertiaryButtonSize : 'clamp(28px, 8vw, 32px)',
                minWidth: isMobile ? mobileTertiaryButtonMinSize : '28px',
                minHeight: isMobile ? mobileTertiaryButtonMinSize : '28px',
                border: playbackSpeed !== 1.0 ? `2px solid #f39c12` : undefined,
                boxShadow: playbackSpeed !== 1.0 ? `0 0 15px #f39c1260` : undefined,
              }}
              onMouseEnter={(e) => {
                if (isAudioLoaded) {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = 'var(--neu-pressed), 0 0 25px rgba(243, 156, 18, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = playbackSpeed !== 1.0 ? 'var(--neu-pressed), 0 0 15px rgba(243, 156, 18, 0.3)' : 'var(--neu-raised)';
              }}
              title={`Playback Speed: ${playbackSpeed.toFixed(2)}x`}
            >
              <svg width={isTinyMobile ? "16" : isCompactMobile ? "18" : "20"} height={isTinyMobile ? "16" : isCompactMobile ? "18" : "20"} viewBox="0 0 24 24" fill="none" stroke={playbackSpeed !== 1.0 ? '#f39c12' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" opacity="0.3"/>
                <circle cx="12" cy="12" r="9" fill="none"/>
                <line
                  x1="12"
                  y1="12"
                  x2={12 + 7 * Math.cos((playbackSpeed - 0.25) / 3.75 * Math.PI - Math.PI / 2)}
                  y2={12 + 7 * Math.sin((playbackSpeed - 0.25) / 3.75 * Math.PI - Math.PI / 2)}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="3" r="1.5" fill={playbackSpeed >= 3.0 ? '#f39c12' : 'currentColor'} opacity={playbackSpeed >= 3.0 ? 1 : 0.3}/>
                <circle cx="21" cy="12" r="1.5" fill={playbackSpeed >= 2.0 ? '#f39c12' : 'currentColor'} opacity={playbackSpeed >= 2.0 ? 1 : 0.3}/>
                <circle cx="12" cy="21" r="1.5" fill={playbackSpeed <= 0.5 ? '#f39c12' : 'currentColor'} opacity={playbackSpeed <= 0.5 ? 1 : 0.3}/>
              </svg>
            </button>

            {showSpeedPopup && (() => {
              const popupPadding = isMobile ? 20 : isTablet ? 18 : 14;
              const labelFontSize = isMobile ? '0.9rem' : isTablet ? '0.85rem' : '0.75rem';
              const valueFontSize = isMobile ? '1.25rem' : isTablet ? '1.1rem' : '1rem';
              const resetPadding = isMobile ? '10px 14px' : isTablet ? '8px 12px' : '3px 8px';
              const resetFontSize = isMobile ? '0.9rem' : isTablet ? '0.8rem' : '0.65rem';
              const sliderHeight = isMobileOrTablet ? 12 : 8;
              const popupWidth = isMobile ? Math.min(320, window.innerWidth - 32) : isTablet ? Math.min(300, window.innerWidth - 40) : 260;
              const popupContent = (
                <div
                  ref={speedPopupRef}
                  style={{
                    padding: popupPadding,
                    width: popupWidth,
                    maxWidth: 'calc(100vw - 24px)',
                    boxSizing: 'border-box',
                    background: isLightMode ? 'rgba(228, 235, 245, 0.98)' : 'rgba(26, 26, 26, 0.98)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: isLightMode ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: isMobile ? 16 : isTablet ? 14 : 12,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isMobile ? 16 : isTablet ? 14 : 10,
                    animation: 'fadeInScale 0.2s ease-out',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: isMobile ? 12 : 8, minWidth: 0, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: labelFontSize, fontWeight: '600', color: isLightMode ? '#666' : '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
                      Speed
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 8, flexShrink: 0 }}>
                      <span style={{ fontSize: valueFontSize, fontWeight: '700', color: isLightMode ? '#1a1a1a' : '#ffffff', fontFamily: isMobileOrTablet ? UI_FONT : HANDWRITTEN_FONT, minWidth: isMobile ? '4.5ch' : '3.5ch', textAlign: 'right' }}>
                        {playbackSpeed.toFixed(2)}x
                      </span>
                      <button
                        onClick={() => handleSpeedChange(1.0)}
                        disabled={!isAudioLoaded || playbackSpeed === 1.0}
                        style={{
                          padding: resetPadding,
                          fontSize: resetFontSize,
                          minHeight: isMobileOrTablet ? 44 : undefined,
                          background: playbackSpeed === 1.0 ? (isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)') : 'transparent',
                          border: `1px solid ${isLightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
                          borderRadius: isMobile ? 10 : 6,
                          color: isLightMode ? '#666' : '#aaa',
                          cursor: (!isAudioLoaded || playbackSpeed === 1.0) ? 'not-allowed' : 'pointer',
                          opacity: (!isAudioLoaded || playbackSpeed === 1.0) ? 0.4 : 1,
                          transition: 'all 0.2s ease',
                          touchAction: 'manipulation',
                        }}
                        title="Reset to 1.0x"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '0.85rem' : isTablet ? '0.8rem' : '0.7rem', color: isLightMode ? '#999' : '#666', fontWeight: '500' }}>
                    <span>0.25x</span>
                    <span>1.0x</span>
                    <span>2.0x</span>
                    <span>4.0x</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="4.0"
                    step="0.01"
                    value={playbackSpeed}
                    onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                    onInput={(e) => handleSpeedChange(parseFloat((e.target as HTMLInputElement).value))}
                    disabled={!isAudioLoaded}
                    style={{
                      width: '100%',
                      height: sliderHeight,
                      borderRadius: 4,
                      position: 'relative',
                      display: 'block',
                      background: isLightMode
                        ? `linear-gradient(to right, #ccc 0%, #ccc ${((playbackSpeed - 0.25) / 3.75) * 100}%, #e0e0e0 ${((playbackSpeed - 0.25) / 3.75) * 100}%, #e0e0e0 100%)`
                        : `linear-gradient(to right, #555 0%, #555 ${((playbackSpeed - 0.25) / 3.75) * 100}%, #333 ${((playbackSpeed - 0.25) / 3.75) * 100}%, #333 100%)`,
                      outline: 'none',
                      cursor: isAudioLoaded ? 'pointer' : 'not-allowed',
                      WebkitAppearance: 'none',
                      appearance: 'none',
                      opacity: isAudioLoaded ? 1 : 0.4,
                      transition: 'background 0.1s ease',
                    }}
                    className={`speed-popup-slider ${isMobileOrTablet ? 'speed-popup-slider-touch' : ''}`}
                  />
                </div>
              );
              if (isMobileOrTablet) {
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
                      zIndex: 10000,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                      boxSizing: 'border-box',
                    }}
                    onClick={() => setShowSpeedPopup(false)}
                  >
                    {popupContent}
                  </div>,
                  document.body
                );
              }
              return (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    right: 'auto',
                    transform: 'translateX(-50%)',
                    marginBottom: 8,
                    zIndex: 1000,
                  }}
                >
                  {popupContent}
                </div>
              );
            })()}
            {isMobileOrTablet && (
              <button
                onClick={handleClearActiveMarker}
                disabled={!activeMarker}
                style={{
                  ...glassButtonStyle(false, !activeMarker, KENYAN_RED),
                  width: isMobile ? mobileTertiaryButtonSize : 'clamp(28px, 8vw, 32px)',
                  height: isMobile ? mobileTertiaryButtonSize : 'clamp(28px, 8vw, 32px)',
                  minWidth: isMobile ? mobileTertiaryButtonMinSize : '28px',
                  minHeight: isMobile ? mobileTertiaryButtonMinSize : '28px',
                  border: `2px solid ${KENYAN_RED}`,
                }}
                title={
                  activeMarker
                    ? `Leave ${activeMarker.name} and return to normal playback`
                    : 'Select a marker to return to normal playback'
                }
              >
                <svg width={isTinyMobile ? "16" : isCompactMobile ? "18" : "20"} height={isTinyMobile ? "16" : isCompactMobile ? "18" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="7" width="10" height="10" rx="3" />
                  <path d="M14 12h6" />
                  <path d="M17 9l3 3-3 3" />
                </svg>
              </button>
            )}
          </div>

          {isMobileOrTablet && (
            <>
              <div
                style={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  display: 'grid',
                  gridTemplateColumns: '4px minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: isTinyMobile ? '6px' : '8px',
                  padding: isTinyMobile ? '8px 9px' : '9px 11px',
                  minHeight: isTinyMobile ? '44px' : '48px',
                  borderRadius: '16px',
                  background: isLightMode ? 'rgba(255,255,255,0.82)' : 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))',
                  border: `1px solid ${borderColor}`,
                  boxShadow: isLightMode
                    ? '0 8px 18px rgba(166,180,200,0.18), inset 1px 1px 2px rgba(255,255,255,0.92)'
                    : '0 10px 18px rgba(0,0,0,0.2), inset 1px 1px 2px rgba(255,255,255,0.04)',
                }}
              >
                <div
                  style={{
                    width: '4px',
                    borderRadius: '999px',
                    background: markerCardState === 'active'
                      ? (activeMarker?.color || KENYAN_GREEN)
                      : 'rgba(217, 119, 6, 0.75)',
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px' }}>
                  <div
                    style={{
                      color: textColor,
                      fontSize: isTinyMobile ? '0.66rem' : '0.74rem',
                      fontWeight: 600,
                      lineHeight: 1.15,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontFamily: UI_FONT,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {renderMarkerCardTitle()}
                  </div>
                  <div
                    style={{
                      color: textSecondary,
                      fontSize: isTinyMobile ? '0.56rem' : '0.62rem',
                      lineHeight: 1.25,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontFamily: UI_FONT,
                      letterSpacing: '0.01em',
                    }}
                    title={renderMarkerCardSubtitle()}
                  >
                    {renderMarkerCardSubtitle()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: isTinyMobile ? '4px' : '6px', flexShrink: 0 }}>
                  <button
                    onClick={openMarkerEditPopup}
                    disabled={!activeMarker}
                    style={{
                      ...glassButtonStyle(false, !activeMarker, KENYAN_GREEN),
                      width: mobileUtilityActionSize,
                      height: mobileUtilityActionSize,
                      minWidth: mobileUtilityActionSize,
                      minHeight: mobileUtilityActionSize,
                    }}
                    title={activeMarker ? `Edit ${activeMarker.name}` : 'Select an active marker first'}
                  >
                    <svg width={mobileUtilityActionIconSize} height={mobileUtilityActionIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    onClick={handleDeleteActiveMarker}
                    disabled={!activeMarker}
                    style={{
                      ...glassButtonStyle(false, !activeMarker, KENYAN_RED),
                      width: mobileUtilityActionSize,
                      height: mobileUtilityActionSize,
                      minWidth: mobileUtilityActionSize,
                      minHeight: mobileUtilityActionSize,
                    }}
                    title={activeMarker ? `Delete ${activeMarker.name}` : 'Select an active marker first'}
                  >
                    <svg width={mobileUtilityActionIconSize} height={mobileUtilityActionIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      {showMarkerEditPopup && markerEditDraft && activeMarker && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            boxSizing: 'border-box',
          }}
          onClick={closeMarkerEditPopup}
        >
          <div
            style={{
              width: Math.min(isMobile ? 340 : 380, window.innerWidth - 24),
              maxWidth: '100%',
              background: isLightMode ? 'rgba(244, 247, 251, 0.98)' : 'rgba(24, 24, 24, 0.98)',
              borderRadius: isMobile ? 18 : 16,
              border: `1px solid ${borderColor}`,
              boxShadow: '0 18px 40px rgba(0, 0, 0, 0.35)',
              padding: isMobile ? '18px 16px' : '20px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: textColor, fontSize: isMobile ? '1rem' : '1.05rem', fontWeight: 700 }}>
                  Edit Marker
                </div>
                <div style={{ color: textSecondary, fontSize: isMobile ? '0.78rem' : '0.82rem', marginTop: 2 }}>
                  Update the label, range, speed, or loop state for this marker.
                </div>
              </div>
              <button
                onClick={closeMarkerEditPopup}
                style={{
                  width: 36,
                  height: 36,
                  minWidth: 36,
                  minHeight: 36,
                  borderRadius: 12,
                  border: `1px solid ${borderColor}`,
                  background: glassBg,
                  color: textColor,
                  cursor: 'pointer',
                }}
                title="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: textSecondary, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Name
              </span>
              <input
                type="text"
                value={markerEditDraft.name}
                onChange={(e) => setMarkerEditDraft({ ...markerEditDraft, name: e.target.value })}
                placeholder="Marker name"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: `1px solid ${borderColor}`,
                  background: isLightMode ? '#ffffff' : 'rgba(255,255,255,0.04)',
                  color: textColor,
                  boxSizing: 'border-box',
                }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ color: textSecondary, fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Start (s)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={markerEditDraft.start}
                  onChange={(e) => setMarkerEditDraft({ ...markerEditDraft, start: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    background: isLightMode ? '#ffffff' : 'rgba(255,255,255,0.04)',
                    color: textColor,
                    boxSizing: 'border-box',
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ color: textSecondary, fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  End (s)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={markerEditDraft.end}
                  onChange={(e) => setMarkerEditDraft({ ...markerEditDraft, end: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    background: isLightMode ? '#ffffff' : 'rgba(255,255,255,0.04)',
                    color: textColor,
                    boxSizing: 'border-box',
                  }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ color: textSecondary, fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Speed
                </span>
                <input
                  type="number"
                  min="0.3"
                  max="4"
                  step="0.1"
                  value={markerEditDraft.speed}
                  onChange={(e) => setMarkerEditDraft({ ...markerEditDraft, speed: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    background: isLightMode ? '#ffffff' : 'rgba(255,255,255,0.04)',
                    color: textColor,
                    boxSizing: 'border-box',
                  }}
                />
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: `1px solid ${borderColor}`,
                  background: isLightMode ? '#ffffff' : 'rgba(255,255,255,0.04)',
                }}
              >
                <span style={{ color: textColor, fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Loop
                </span>
                <input
                  type="checkbox"
                  checked={markerEditDraft.loop}
                  onChange={(e) => setMarkerEditDraft({ ...markerEditDraft, loop: e.target.checked })}
                  style={{ width: 18, height: 18 }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={closeMarkerEditPopup}
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: `1px solid ${borderColor}`,
                  background: 'transparent',
                  color: textColor,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMarkerEdit}
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: KENYAN_GREEN,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: `0 10px 20px ${KENYAN_GREEN}33`,
                }}
              >
                Save Marker
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merienda:wght@300;400;500;600;700&display=swap');
        
        @keyframes backgroundPulse {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${KENYAN_GREEN};
          cursor: pointer;
          border: 2px solid ${KENYAN_WHITE};
          box-shadow: 0 0 10px ${KENYAN_GREEN}80;
          transition: all 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 15px ${KENYAN_GREEN};
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${KENYAN_GREEN};
          cursor: pointer;
          border: 2px solid ${KENYAN_WHITE};
          box-shadow: 0 0 10px ${KENYAN_GREEN}80;
        }
        .speed-popup-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${isLightMode ? '#ffffff' : '#e0e0e0'};
          cursor: pointer;
          border: 2px solid ${isLightMode ? '#999' : '#666'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5);
          transition: all 0.2s ease;
          margin-top: -6px;
        }
        .speed-popup-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          background: ${isLightMode ? '#f5f5f5' : '#f0f0f0'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.6);
        }
        .speed-popup-slider::-webkit-slider-thumb:active {
          transform: scale(1.1);
        }
        .speed-popup-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${isLightMode ? '#ffffff' : '#e0e0e0'};
          cursor: pointer;
          border: 2px solid ${isLightMode ? '#999' : '#666'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          margin-top: -6px;
        }
        /* Touch-friendly slider thumb on mobile/tablet */
        .speed-popup-slider-touch::-webkit-slider-thumb {
          width: 28px;
          height: 28px;
          margin-top: -8px;
        }
        .speed-popup-slider-touch::-moz-range-thumb {
          width: 28px;
          height: 28px;
          margin-top: -8px;
        }
      `}</style>
    </div>
  );
};

export default PlaybackPanel;
