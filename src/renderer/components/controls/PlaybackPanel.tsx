// PlaybackPanel.tsx - Julius - Week 1-2
// Playback controls panel with Kenyan-themed styling, glassmorphism, and animations

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAudioEngine } from '../audio/useAudioEngine';
import { useAppStore } from '../../store/store';
import { MarkerManager } from '../markers/MarkerManager';

// Kenyan flag colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';
const KENYAN_WHITE = '#FFFFFF';

// Handwritten font family - Merienda from Google Fonts
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', 'Patrick Hand', cursive";

const PlaybackPanel: React.FC = () => {
  const { 
    play, 
    pause, 
    stop, 
    seek,
    setSpeed,
    getSpeed
  } = useAudioEngine();
  
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  
  // Mobile and tablet detection for responsive speed popup
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth <= 1024;
  const isMobileOrTablet = isMobile || isTablet;
  
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
  
  const storedSpeed = useAppStore((state) => state.globalControls.playbackRate);
  const [playbackSpeed, setPlaybackSpeed] = useState(storedSpeed || 1.0);
  const [showSpeedPopup, setShowSpeedPopup] = useState(false);
  const speedPopupRef = useRef<HTMLDivElement>(null);
  
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
  const bgPrimary = isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'linear-gradient(145deg, rgba(15, 15, 15, 0.95), rgba(26, 26, 26, 0.9))';
  const glassBg = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.3)';
  const borderColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
  const buttonBg = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)';

  useEffect(() => {
    return () => {};
  }, []);

  const handlePlay = async () => {
    try {
      if (!isAudioLoaded) return;
      // CRITICAL: play() must run before any await - browsers block audio if user gesture is lost.
      // Awaiting seek/resume before play() loses the gesture, so first play would be silent.
      const store = useAppStore.getState();
      const selectedMarkerId = store.ui.selectedMarkerId;
      if (selectedMarkerId) {
        const marker = MarkerManager.getMarker(selectedMarkerId);
        if (marker) seek(marker.start); // Fire seek (sync internally) - don't await
      }
      await play(); // play() runs howl.play() synchronously before its first await
    } catch (err) {
    }
  };

  const handlePause = () => {
    try {
      pause();
    } catch (err) {
    }
  };

  const handleStop = () => {
    try {
      stop();
    } catch (err) {
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

  // Neumorphic button style - responsive size for good UX
  // Larger buttons on mobile for better touch targets (44-52px)
  const glassButtonStyle = (isActive: boolean, isDisabled: boolean, color: string = textColor) => ({
    width: isMobile ? '48px' : 'clamp(36px, 10vw, 48px)',
    height: isMobile ? '48px' : 'clamp(36px, 10vw, 48px)',
    minWidth: isMobile ? '44px' : '36px',
    minHeight: isMobile ? '44px' : '36px',
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
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'space-around' : 'center',
      gap: isMobile ? '2px' : 'clamp(0.25rem, 1vw, 0.4rem)',
      padding: isMobile ? '4px 6px' : 'clamp(0.35rem, 1.5vw, 0.5rem) clamp(0.5rem, 2vw, 0.75rem)',
      background: isLightMode ? '#e4ebf5' : '#1a1a1a',
      borderRadius: isMobile ? '8px' : 'clamp(12px, 3vw, 16px)',
      border: 'none',
      boxShadow: isLightMode
        ? '6px 6px 12px rgba(166, 180, 200, 0.5), -4px -4px 10px rgba(255, 255, 255, 0.9)'
        : '6px 6px 12px rgba(0, 0, 0, 0.5), -4px -4px 10px rgba(255, 255, 255, 0.05)',
      transition: 'transform 0.08s ease, box-shadow 0.12s ease',
      overflowY: 'visible',
      overflowX: 'hidden',
      position: 'relative',
      fontFamily: HANDWRITTEN_FONT,
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
      {isMobile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '2px 8px',
          marginBottom: '2px',
        }}>
          {/* Clock/Music icon */}
          <svg 
            width="14" 
            height="14" 
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
            fontSize: '0.7rem',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '200px',
            fontFamily: HANDWRITTEN_FONT,
          }}>
            {audio.file?.name?.replace(/\.[^/.]+$/, '') || 'No audio'}
          </span>
        </div>
      )}

        {/* Time Progress Display - Compact on mobile */}
      <div className="mx-auto w-full max-w-full px-1" style={{
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        alignItems: isMobile ? 'center' : 'stretch',
        justifyContent: isMobile ? 'center' : 'flex-start',
        gap: isMobile ? '8px' : '0.25rem',
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
            gap: isMobile ? '4px' : 'clamp(0.25rem, 1vw, 0.5rem)'
          }}>
            {/* Clock icon - smaller on mobile */}
            <svg width={isMobile ? "12" : "clamp(12px, 3vw, 16px)"} height={isMobile ? "12" : "clamp(12px, 3vw, 16px)"} viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{
              fontSize: isMobile ? '0.7rem' : 'clamp(0.75rem, 2.5vw, 1rem)',
              fontWeight: '700',
              fontFamily: HANDWRITTEN_FONT,
              color: textColor,
              textShadow: isLightMode ? 'none' : `0 0 10px ${KENYAN_GREEN}60`
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
      <div className="mx-auto flex flex-wrap justify-center items-center gap-1.5 px-2" style={{
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
        maxWidth: '100%',
        width: '100%',
        marginTop: isMobile ? '0' : 'clamp(0.15rem, 0.5vw, 0.25rem)',
        gap: isMobile ? '6px' : 'clamp(4px, 1.5vw, 6px)',
        padding: isMobile ? '0 4px' : '0 clamp(4px, 1vw, 8px)',
        flex: isMobile ? '1 1 auto' : '0 0 auto',
      }}>
        {/* Skip Backward -5s - Neumorphic */}
        <button
          onClick={handleSkipBackward}
          disabled={!isAudioLoaded}
          style={{
            ...glassButtonStyle(false, !isAudioLoaded),
            width: isMobile ? '44px' : 'clamp(32px, 9vw, 40px)',
            height: isMobile ? '44px' : 'clamp(32px, 9vw, 40px)',
            minWidth: isMobile ? '40px' : '32px',
            minHeight: isMobile ? '40px' : '32px',
          }}
          onMouseEnter={(e) => {
            if (isAudioLoaded) e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Skip -5 seconds"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
          </svg>
        </button>

        {/* Play Button - Neumorphic */}
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill={KENYAN_GREEN}>
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </button>
        
        {/* Pause Button - Neumorphic */}
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        </button>
        
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill={KENYAN_RED}>
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        </button>

        {/* Skip Forward +5s - Neumorphic */}
        <button
          onClick={handleSkipForward}
          disabled={!isAudioLoaded}
          style={{
            ...glassButtonStyle(false, !isAudioLoaded),
            width: isMobile ? '44px' : 'clamp(32px, 9vw, 40px)',
            height: isMobile ? '44px' : 'clamp(32px, 9vw, 40px)',
            minWidth: isMobile ? '40px' : '32px',
            minHeight: isMobile ? '40px' : '32px',
          }}
          onMouseEnter={(e) => {
            if (isAudioLoaded) e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Skip +5 seconds"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 6v12l8.5-6L13 6zM4 18l8.5-6L4 6v12z"/>
          </svg>
        </button>

        {/* Speed Control Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSpeedPopup(!showSpeedPopup)}
            disabled={!isAudioLoaded}
            style={{
              ...glassButtonStyle(playbackSpeed !== 1.0, !isAudioLoaded, playbackSpeed !== 1.0 ? '#f39c12' : textColor),
              width: isMobile ? '40px' : 'clamp(28px, 8vw, 32px)',
              height: isMobile ? '40px' : 'clamp(28px, 8vw, 32px)',
              minWidth: isMobile ? '36px' : '28px',
              minHeight: isMobile ? '36px' : '28px',
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
            {/* Speed Gauge Icon - More Descriptive */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={playbackSpeed !== 1.0 ? '#f39c12' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {/* Speedometer/Gauge */}
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" opacity="0.3"/>
              <circle cx="12" cy="12" r="9" fill="none"/>
              {/* Needle pointing based on speed */}
              <line 
                x1="12" 
                y1="12" 
                x2={12 + 7 * Math.cos((playbackSpeed - 0.25) / 3.75 * Math.PI - Math.PI / 2)} 
                y2={12 + 7 * Math.sin((playbackSpeed - 0.25) / 3.75 * Math.PI - Math.PI / 2)}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Speed indicator dots */}
              <circle cx="12" cy="3" r="1.5" fill={playbackSpeed >= 3.0 ? '#f39c12' : 'currentColor'} opacity={playbackSpeed >= 3.0 ? 1 : 0.3}/>
              <circle cx="21" cy="12" r="1.5" fill={playbackSpeed >= 2.0 ? '#f39c12' : 'currentColor'} opacity={playbackSpeed >= 2.0 ? 1 : 0.3}/>
              <circle cx="12" cy="21" r="1.5" fill={playbackSpeed <= 0.5 ? '#f39c12' : 'currentColor'} opacity={playbackSpeed <= 0.5 ? 1 : 0.3}/>
            </svg>
          </button>

          {/* Speed Popup Slider - responsive: portal overlay on mobile/tablet, centered absolute on desktop */}
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
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: isMobile ? 12 : 8,
                  minWidth: 0,
                  flexWrap: 'wrap',
                }}>
                  <span style={{
                    fontSize: labelFontSize,
                    fontWeight: '600',
                    color: isLightMode ? '#666' : '#aaa',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    flexShrink: 0,
                  }}>
                    Speed
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 8, flexShrink: 0 }}>
                    <span style={{
                      fontSize: valueFontSize,
                      fontWeight: '700',
                      color: isLightMode ? '#1a1a1a' : '#ffffff',
                      fontFamily: HANDWRITTEN_FONT,
                      minWidth: isMobile ? '4.5ch' : '3.5ch',
                      textAlign: 'right',
                    }}>
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
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: isMobile ? '0.85rem' : isTablet ? '0.8rem' : '0.7rem',
                  color: isLightMode ? '#999' : '#666',
                  fontWeight: '500',
                }}>
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
        </div>
      </div>

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
