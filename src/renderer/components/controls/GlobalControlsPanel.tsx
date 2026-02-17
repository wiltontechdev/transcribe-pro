// GlobalControlsPanel.tsx - Wilton - Week 2
// Global controls panel (Pitch/Volume) with Kenyan-themed styling

import React, { useState, useEffect } from 'react';
import { useAudioEngine } from '../audio/useAudioEngine';
import { useAppStore } from '../../store/store';

// Kenyan flag colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';
const KENYAN_WHITE = '#FFFFFF';

// Handwritten font family - Merienda from Google Fonts
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', 'Patrick Hand', cursive";

// Pitch icon SVG component
const PitchIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

// Up arrow icon
const ArrowUpIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
  </svg>
);

// Down arrow icon
const ArrowDownIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" />
    <path d="M19 12l-7 7-7-7" />
  </svg>
);

// Reset icon
const ResetIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);


const GlobalControlsPanel: React.FC = () => {
  const { setPitch, getPitch } = useAudioEngine();
  
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  const isAudioLoaded = useAppStore((state) => state.audio.isLoaded);
  
  // Get pitch from store for reactivity
  const storedPitch = useAppStore((state) => state.globalControls.pitch);
  const storePitch = useAppStore((state) => state.setPitch);
  
  const [pitch, setPitchState] = useState(storedPitch || 0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {}, []);
  
  // Sync pitch with store on mount and when store changes
  useEffect(() => {
    if (storedPitch !== undefined && storedPitch !== pitch) {
      setPitchState(storedPitch);
    }
  }, [storedPitch]);
  
  // Theme-aware colors
  const textColor = isLightMode ? '#1a1a1a' : '#FFFFFF';
  const bgPrimary = isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'linear-gradient(145deg, rgba(15, 15, 15, 0.95), rgba(26, 26, 26, 0.9))';
  const glassBg = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.3)';
  const borderColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
  const buttonBg = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)';

  // Handle pitch change
  const handlePitchChange = (newPitch: number) => {
    if (!isAudioLoaded) {
      return;
    }
    
    // Clamp to ±2 semitones
    const clampedPitch = Math.max(-2, Math.min(2, newPitch));
    setPitchState(clampedPitch);
    
    // Apply pitch to audio engine
    try {
      setPitch(clampedPitch);
    } catch (error) {
    }
    
    // Update store
    storePitch(clampedPitch);
    
    // Trigger animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  // Handle pitch step buttons
  const handlePitchStep = (step: number) => {
    handlePitchChange(pitch + step);
  };

  // Reset pitch to 0
  const handleResetPitch = () => {
    handlePitchChange(0);
  };

  // Get pitch display text (percentage: 100% = 1 semitone)
  const getPitchDisplayText = (value: number): string => {
    if (value === 0) return 'Original';
    const pct = Math.round(value * 100);
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct}%`;
  };

  // Get pitch color based on value
  const getPitchColor = (value: number): string => {
    if (value === 0) return textColor;
    if (value > 0) return KENYAN_GREEN;
    return KENYAN_RED;
  };

  // Glassmorphism button style
  const glassButtonStyle = (isActive: boolean, isDisabled: boolean) => ({
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: isActive 
      ? `linear-gradient(135deg, ${KENYAN_GREEN}40, ${KENYAN_RED}40)`
      : buttonBg,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `2px solid ${isActive ? KENYAN_GREEN : borderColor}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: isActive 
      ? `0 0 20px ${KENYAN_GREEN}60, 0 4px 15px rgba(0, 0, 0, 0.3)`
      : '0 4px 15px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.4 : 1,
    transform: 'scale(1)',
  });

  // Preset button style
  const presetButtonStyle = (isActive: boolean, isDisabled: boolean, color: string) => ({
    padding: '0.4rem 0.8rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    fontFamily: HANDWRITTEN_FONT,
    background: isActive 
      ? `linear-gradient(135deg, ${color}, ${color}CC)`
      : buttonBg,
    border: `1px solid ${isActive ? color : borderColor}`,
    borderRadius: '8px',
    color: isActive ? '#FFFFFF' : textColor,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.4 : 1,
    transition: 'all 0.2s ease',
    transform: isActive ? 'scale(1.05)' : 'scale(1)',
    boxShadow: isActive ? `0 0 12px ${color}60` : 'none',
  });

  return (
    <div className="global-controls-panel" style={{ 
      width: '100%', 
      height: '100%',
      minHeight: '200px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      gap: '0.75rem',
      padding: '0.8rem',
      background: bgPrimary,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 'var(--radius-md)',
      border: `2px solid ${isLightMode ? 'rgba(0, 102, 68, 0.4)' : 'rgba(0, 102, 68, 0.3)'}`,
      boxShadow: isLightMode 
        ? '0 4px 20px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)' 
        : '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      transition: 'all 0.3s ease',
      overflowY: 'auto',
      overflowX: 'hidden',
      position: 'relative',
      fontFamily: HANDWRITTEN_FONT
    }}>
      {/* Animated background gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isLightMode 
          ? `radial-gradient(ellipse at 30% 30%, ${KENYAN_GREEN}08 0%, transparent 50%),
             radial-gradient(ellipse at 70% 70%, ${KENYAN_RED}08 0%, transparent 50%)`
          : `radial-gradient(ellipse at 30% 30%, ${KENYAN_GREEN}12 0%, transparent 50%),
             radial-gradient(ellipse at 70% 70%, ${KENYAN_RED}12 0%, transparent 50%)`,
        pointerEvents: 'none',
        animation: 'backgroundPulse 4s ease-in-out infinite alternate'
      }} />

      {/* Title */}
      <div style={{ 
        color: textColor, 
        fontSize: '1.1rem', 
        fontWeight: '700',
        textAlign: 'center',
        flexShrink: 0,
        letterSpacing: '0.05em',
        textShadow: isLightMode ? 'none' : `0 0 10px ${KENYAN_GREEN}60`,
        position: 'relative',
        zIndex: 1,
        fontFamily: HANDWRITTEN_FONT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem'
      }}>
        <span>🎵</span>
        <span>Global Controls</span>
        {!isAudioLoaded && (
          <span style={{ fontSize: '0.7rem', opacity: 0.6, fontStyle: 'italic' }}>
            (Load audio to use)
          </span>
        )}
      </div>

      {/* Pitch Control Section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        position: 'relative',
        zIndex: 1,
        background: glassBg,
        borderRadius: '12px',
        padding: '0.8rem',
        border: `1px solid ${borderColor}`
      }}>
        {/* Pitch Header with Icon */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              animation: isAnimating ? 'pitchPulse 0.3s ease-out' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PitchIcon color={getPitchColor(pitch)} size={22} />
            </div>
            <span style={{
              fontSize: '0.95rem',
              fontWeight: '600',
              color: textColor,
              fontFamily: HANDWRITTEN_FONT
            }}>
              Pitch Shift
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '0.25rem' }}>(100% = 1 semitone, ±200% max)</span>
          </div>
          
          {/* Reset Button */}
          <button
            onClick={handleResetPitch}
            disabled={!isAudioLoaded || pitch === 0}
            style={{
              ...glassButtonStyle(false, !isAudioLoaded || pitch === 0),
              width: '32px',
              height: '32px',
            }}
            onMouseEnter={(e) => {
              if (isAudioLoaded && pitch !== 0) {
                e.currentTarget.style.transform = 'scale(1.1) rotate(-10deg)';
                e.currentTarget.style.boxShadow = `0 0 15px ${KENYAN_GREEN}60`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
            }}
            title="Reset to original pitch"
          >
            <ResetIcon color={textColor} size={14} />
          </button>
        </div>

        {/* Pitch Display Value */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.5rem',
          background: isLightMode ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: `1px solid ${pitch !== 0 ? getPitchColor(pitch) + '40' : borderColor}`,
          transition: 'all 0.3s ease'
        }}>
          <span style={{
            fontSize: '1.3rem',
            fontWeight: '700',
            color: getPitchColor(pitch),
            fontFamily: HANDWRITTEN_FONT,
            textShadow: pitch !== 0 ? `0 0 10px ${getPitchColor(pitch)}40` : 'none',
            animation: isAnimating ? 'valueChange 0.3s ease-out' : 'none'
          }}>
            {getPitchDisplayText(pitch)}
          </span>
        </div>

        {/* Pitch Slider with Up/Down Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          {/* Down Button - 0.1 semitone (10%) per click for fine tuning */}
          <button
            onClick={() => handlePitchStep(-0.1)}
            disabled={!isAudioLoaded || pitch <= -2}
            style={glassButtonStyle(false, !isAudioLoaded || pitch <= -2)}
            onMouseEnter={(e) => {
              if (isAudioLoaded && pitch > -2) {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = `0 0 15px ${KENYAN_RED}60`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
            }}
            title="Lower pitch by 10% (0.1 semitone)"
          >
            <ArrowDownIcon color={KENYAN_RED} />
          </button>

          {/* Slider */}
          <input
            type="range"
            min="-2"
            max="2"
            step="0.1"
            value={pitch}
            onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
            disabled={!isAudioLoaded}
            style={{
              flex: 1,
              height: '6px',
              borderRadius: '3px',
              background: `linear-gradient(to right, 
                ${KENYAN_RED} 0%, 
                ${KENYAN_RED} ${((pitch + 2) / 4) * 100 - 5}%, 
                ${isLightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'} ${((pitch + 2) / 4) * 100}%, 
                ${KENYAN_GREEN} ${((pitch + 2) / 4) * 100 + 5}%, 
                ${KENYAN_GREEN} 100%)`,
              outline: 'none',
              cursor: isAudioLoaded ? 'pointer' : 'not-allowed',
              WebkitAppearance: 'none',
              appearance: 'none',
              opacity: isAudioLoaded ? 1 : 0.4
            }}
          />

          {/* Up Button - 0.1 semitone (10%) per click for fine tuning */}
          <button
            onClick={() => handlePitchStep(0.1)}
            disabled={!isAudioLoaded || pitch >= 2}
            style={glassButtonStyle(false, !isAudioLoaded || pitch >= 2)}
            onMouseEnter={(e) => {
              if (isAudioLoaded && pitch < 2) {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = `0 0 15px ${KENYAN_GREEN}60`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
            }}
            title="Raise pitch by 10% (0.1 semitone)"
          >
            <ArrowUpIcon color={KENYAN_GREEN} />
          </button>
        </div>

        {/* Preset Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.3rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {[-2, -1, 0, 1, 2].map((value) => (
            <button
              key={value}
              onClick={() => handlePitchChange(value)}
              disabled={!isAudioLoaded}
              style={presetButtonStyle(
                pitch === value, 
                !isAudioLoaded, 
                value === 0 ? textColor : (value > 0 ? KENYAN_GREEN : KENYAN_RED)
              )}
              onMouseEnter={(e) => {
                if (isAudioLoaded && pitch !== value) {
                  e.currentTarget.style.background = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (isAudioLoaded && pitch !== value) {
                  e.currentTarget.style.background = buttonBg;
                }
              }}
            >
              {value === 0 ? '0%' : (value > 0 ? `+${value * 100}%` : `${value * 100}%`)}
            </button>
          ))}
        </div>
      </div>



      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merienda:wght@300;400;500;600;700&display=swap');
        
        @keyframes backgroundPulse {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        @keyframes pitchPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        @keyframes valueChange {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        .global-controls-panel input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${KENYAN_GREEN}, ${KENYAN_GREEN}CC);
          cursor: pointer;
          border: 2px solid ${KENYAN_WHITE};
          box-shadow: 0 0 10px ${KENYAN_GREEN}80, 0 2px 6px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        }
        
        .global-controls-panel input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 0 15px ${KENYAN_GREEN}, 0 2px 8px rgba(0,0,0,0.4);
        }
        
        .global-controls-panel input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${KENYAN_GREEN}, ${KENYAN_GREEN}CC);
          cursor: pointer;
          border: 2px solid ${KENYAN_WHITE};
          box-shadow: 0 0 10px ${KENYAN_GREEN}80, 0 2px 6px rgba(0,0,0,0.3);
        }
        
        .global-controls-panel input[type="range"]:disabled::-webkit-slider-thumb {
          background: ${isLightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};
          box-shadow: none;
        }
        
        .global-controls-panel input[type="range"]:disabled::-moz-range-thumb {
          background: ${isLightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};
          box-shadow: none;
        }
      `}</style>
    </div>
  );
};

export default GlobalControlsPanel;
