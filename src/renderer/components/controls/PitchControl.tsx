// PitchControl.tsx - Simple compact pitch control similar to zoom controls
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/store';
import { onPitchStatus } from '../audio/HowlerAudioEngine';

interface PitchControlProps {
  onPitchChange: (pitch: number) => void;
  isAudioLoaded: boolean;
}

export const PitchControl: React.FC<PitchControlProps> = ({ onPitchChange, isAudioLoaded }) => {
  const pitch = useAppStore((state) => state.globalControls.pitch);
  const isLightMode = useAppStore((state) => state.theme) === 'light';
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [targetPitch, setTargetPitch] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to pitch processing status
  useEffect(() => {
    const unsubscribe = onPitchStatus((status) => {
      setIsProcessing(status.isProcessing);
      setProgress(status.progress);
      setTargetPitch(status.targetPitch);
    });
    return unsubscribe;
  }, []);

  // Get pitch color based on value
  const getPitchColor = (value: number): string => {
    if (value === 0) return isLightMode ? '#666' : '#aaa';
    if (value > 0) return '#006644'; // KENYAN_GREEN
    return '#de2910'; // KENYAN_RED
  };

  const pitchColor = getPitchColor(pitch);

  // Handle pitch step change (increment/decrement by 0.01 semitone = 1%)
  const handlePitchStep = (step: number) => {
    if (!isAudioLoaded || isProcessing) return;
    const newPitch = Math.max(-2, Math.min(2, Math.round((pitch + step) * 100) / 100));
    onPitchChange(newPitch);
  };

  // Handle pitch reset
  const handlePitchReset = () => {
    if (!isAudioLoaded || isProcessing) return;
    onPitchChange(0);
  };

  // Format pitch display: 100% = 1 semitone (for music that's off by a fraction of a semitone)
  const formatPitch = (value: number): string => {
    if (value === 0) return '0%';
    const pct = Math.round(value * 100);
    const sign = value > 0 ? '+' : '';
    return `${sign}${pct}%`;
  };

  // Handle direct input - user types percentage (e.g. 50 = 0.5 semitones, 100 = 1 semitone)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      // Input is percentage: 100 = 1 semitone, 50 = 0.5 semitones. Max ±200% = ±2 semitones
      const semitones = numValue / 100;
      const clampedValue = Math.max(-2, Math.min(2, Math.round(semitones * 100) / 100));
      onPitchChange(clampedValue);
      setInputValue('');
    } else {
      setInputValue('');
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue('');
    }
  };

  const handleValueClick = () => {
    if (!isAudioLoaded || isProcessing) return;
    setIsEditing(true);
    setInputValue((pitch * 100).toString()); // Show percentage for editing (100 = 1 semitone)
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Handle preset selection
  const handlePresetClick = (preset: number) => {
    if (!isAudioLoaded || isProcessing) return;
    onPitchChange(preset);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '8px',
    }}>
      {/* Label */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        marginBottom: '4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: isLightMode ? '#1a1a1a' : '#FFFFFF' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={pitchColor} strokeWidth="2" strokeLinecap="round">
            <path d="M12 3v18M9 6l3-3 3 3M9 18l3 3 3-3M3 12h18"/>
          </svg>
          <span>Pitch Adjustment</span>
        </div>
        <span style={{ fontSize: '10px', fontWeight: 400, opacity: 0.7 }}>100% = 1 semitone · max ±200%</span>
      </div>
      {/* Main pitch control - similar to zoom */}
      <div
        className="mx-auto flex items-center gap-0.5 flex-shrink-0"
        style={{
          marginLeft: 'auto',
          marginRight: 'auto',
          background: isLightMode
            ? 'rgba(255, 255, 255, 0.6)'
            : 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '4px 8px',
          borderRadius: '12px',
          border: isLightMode
            ? '1px solid rgba(0, 0, 0, 0.06)'
            : '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: isLightMode
            ? '0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
            : '0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          transition: 'all 0.2s ease',
          maxWidth: '100%',
          gap: '4px',
          height: '28px',
          alignItems: 'center',
        }}
      >
        {/* Pitch Down Button */}
        <button
          onClick={() => handlePitchStep(-0.01)}
          disabled={!isAudioLoaded || isProcessing || pitch <= -2}
          style={{
            background: 'transparent',
            border: 'none',
            color: (!isAudioLoaded || isProcessing || pitch <= -2)
              ? (isLightMode ? '#ccc' : '#666')
              : (isLightMode ? '#1a1a1a' : '#FFFFFF'),
            padding: '2px',
            borderRadius: '6px',
            cursor: (!isAudioLoaded || isProcessing || pitch <= -2) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            opacity: (!isAudioLoaded || isProcessing || pitch <= -2) ? 0.3 : 1,
            width: '20px',
            height: '20px',
          }}
          onMouseEnter={(e) => {
            if (isAudioLoaded && !isProcessing && pitch > -2) {
              e.currentTarget.style.background = isLightMode 
                ? 'rgba(0, 0, 0, 0.08)'
                : 'rgba(255, 255, 255, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title="Decrease pitch by 1% (0.01 semitone)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M7 12l5-5 5 5"/>
          </svg>
        </button>

        {/* Pitch Value Display - Clickable for direct input or double-click to reset */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            style={{
              minWidth: '48px',
              height: '20px',
              padding: '0 6px',
              borderRadius: '6px',
              background: isLightMode
                ? 'rgba(255, 255, 255, 0.9)'
                : 'rgba(0, 0, 0, 0.3)',
              border: `2px solid ${pitchColor}`,
              color: isLightMode ? '#1a1a1a' : '#FFFFFF',
              fontSize: '10px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              textAlign: 'center',
              outline: 'none',
            }}
            placeholder={formatPitch(pitch)}
          />
        ) : (
          <div
            onClick={handleValueClick}
            onDoubleClick={handlePitchReset}
            style={{
              minWidth: '48px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isAudioLoaded && !isProcessing ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              padding: '0 6px',
              borderRadius: '6px',
              background: isLightMode
                ? `linear-gradient(135deg, ${pitchColor}15, ${pitchColor}08)`
                : `linear-gradient(135deg, ${pitchColor}25, ${pitchColor}15)`,
              border: `1px solid ${pitchColor}30`,
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (isAudioLoaded && !isProcessing) {
                e.currentTarget.style.background = isLightMode
                  ? `linear-gradient(135deg, ${pitchColor}20, ${pitchColor}12)`
                  : `linear-gradient(135deg, ${pitchColor}35, ${pitchColor}25)`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isLightMode
                ? `linear-gradient(135deg, ${pitchColor}15, ${pitchColor}08)`
                : `linear-gradient(135deg, ${pitchColor}25, ${pitchColor}15)`;
            }}
            title="Click to edit, double-click to reset to 0%"
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: pitch === 0 
                  ? (isLightMode ? '#666' : '#aaa')
                  : pitchColor,
                fontFamily: 'monospace',
                lineHeight: '1',
              }}
            >
              {formatPitch(pitch)}
            </span>
          </div>
        )}

        {/* Pitch Up Button */}
        <button
          onClick={() => handlePitchStep(0.01)}
          disabled={!isAudioLoaded || isProcessing || pitch >= 2}
          style={{
            background: 'transparent',
            border: 'none',
            color: (!isAudioLoaded || isProcessing || pitch >= 2)
              ? (isLightMode ? '#ccc' : '#666')
              : (isLightMode ? '#1a1a1a' : '#FFFFFF'),
            padding: '2px',
            borderRadius: '6px',
            cursor: (!isAudioLoaded || isProcessing || pitch >= 2) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            opacity: (!isAudioLoaded || isProcessing || pitch >= 2) ? 0.3 : 1,
            width: '20px',
            height: '20px',
          }}
          onMouseEnter={(e) => {
            if (isAudioLoaded && !isProcessing && pitch < 2) {
              e.currentTarget.style.background = isLightMode 
                ? 'rgba(0, 0, 0, 0.08)'
                : 'rgba(255, 255, 255, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title="Increase pitch by 1% (0.01 semitone)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 19V5M7 12l5 5 5-5"/>
          </svg>
        </button>
      </div>

      {/* Preset Buttons */}
      <div style={{
        display: 'flex',
        gap: '4px',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {[-2, -1, 0, 1, 2].map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            disabled={!isAudioLoaded || isProcessing}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: Math.abs(pitch - preset) < 0.005
                ? (isLightMode
                    ? `linear-gradient(135deg, ${pitchColor}20, ${pitchColor}15)`
                    : `linear-gradient(135deg, ${pitchColor}35, ${pitchColor}25)`)
                : (isLightMode
                    ? 'rgba(0, 0, 0, 0.05)'
                    : 'rgba(255, 255, 255, 0.1)'),
              color: Math.abs(pitch - preset) < 0.005
                ? pitchColor
                : (isLightMode ? '#1a1a1a' : '#FFFFFF'),
              fontSize: '10px',
              fontWeight: Math.abs(pitch - preset) < 0.005 ? 700 : 500,
              cursor: isAudioLoaded && !isProcessing ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              opacity: isAudioLoaded ? 1 : 0.5,
              border: Math.abs(pitch - preset) < 0.005
                ? `1px solid ${pitchColor}50`
                : (isLightMode
                    ? '1px solid rgba(0, 0, 0, 0.1)'
                    : '1px solid rgba(255, 255, 255, 0.15)'),
            }}
            onMouseEnter={(e) => {
              if (isAudioLoaded && !isProcessing && Math.abs(pitch - preset) >= 0.005) {
                e.currentTarget.style.background = isLightMode
                  ? 'rgba(0, 0, 0, 0.08)'
                  : 'rgba(255, 255, 255, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (Math.abs(pitch - preset) >= 0.005) {
                e.currentTarget.style.background = isLightMode
                  ? 'rgba(0, 0, 0, 0.05)'
                  : 'rgba(255, 255, 255, 0.1)';
              }
            }}
            title={`Set pitch to ${preset > 0 ? '+' : ''}${preset * 100}% (${preset} semitone${Math.abs(preset) !== 1 ? 's' : ''})`}
          >
            {preset === 0 ? '0%' : (preset > 0 ? `+${preset * 100}%` : `${preset * 100}%`)}
          </button>
        ))}
      </div>

      {/* Processing Progress Bar */}
      {isProcessing && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '8px',
          background: isLightMode
            ? `linear-gradient(135deg, ${pitchColor}08, ${pitchColor}05)`
            : `linear-gradient(135deg, ${pitchColor}20, ${pitchColor}15)`,
          borderRadius: '8px',
          border: `1px solid ${pitchColor}30`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: isLightMode ? '#1a1a1a' : '#FFFFFF',
            fontWeight: 500,
          }}>
            {/* Processing icon with animation */}
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke={pitchColor} 
              strokeWidth="2" 
              strokeLinecap="round"
              style={{
                animation: 'spin 1s linear infinite',
              }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span>Processing pitch shift...</span>
          </div>
          
          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: '4px',
            background: isLightMode 
              ? 'rgba(0, 0, 0, 0.1)' 
              : 'rgba(255, 255, 255, 0.2)',
            borderRadius: '2px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${pitchColor}, ${pitchColor}dd)`,
              borderRadius: '2px',
              transition: 'width 0.3s ease',
              boxShadow: `0 0 8px ${pitchColor}60`,
            }} />
          </div>
          
          <div style={{
            fontSize: '10px',
            color: isLightMode ? '#666' : '#aaa',
            textAlign: 'right',
          }}>
            {progress.toFixed(0)}%
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PitchControl;
