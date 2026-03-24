// PitchControl.tsx - Simple compact pitch control similar to zoom controls
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/store';
import { onPitchStatus } from '../audio/HowlerAudioEngine';

const PITCH_PRESETS = [-2, -1, 0, 1, 2] as const;
const PITCH_FINE_STEP = 0.1;

interface PitchControlProps {
  onPitchChange: (pitch: number) => void;
  isAudioLoaded: boolean;
}

export const PitchControl: React.FC<PitchControlProps> = ({ onPitchChange, isAudioLoaded }) => {
  const pitch = useAppStore((state) => state.globalControls.pitch);
  const isLightMode = useAppStore((state) => state.theme) === 'light';
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onPitchStatus((status) => {
      setIsProcessing(status.isProcessing);
      setProgress(status.progress);
    });
    return unsubscribe;
  }, []);

  const getPitchColor = (value: number): string => {
    if (value === 0) return isLightMode ? '#666' : '#aaa';
    if (value > 0) return '#006644';
    return '#de2910';
  };

  const pitchColor = getPitchColor(pitch);

  const handlePitchStep = (step: number) => {
    if (!isAudioLoaded || isProcessing) return;
    const newPitch = Math.max(-2, Math.min(2, Math.round((pitch + step) * 100) / 100));
    onPitchChange(newPitch);
  };

  const handlePitchReset = () => {
    if (!isAudioLoaded || isProcessing) return;
    onPitchChange(0);
  };

  const formatPitch = (value: number): string => {
    if (Math.abs(value) < 0.005) return '0 st';
    const formatted = Math.abs(value % 1) < 0.005 ? value.toFixed(0) : value.toFixed(1);
    const sign = value > 0 ? '+' : '';
    return `${sign}${formatted} st`;
  };

  const formatPitchPresetLabel = (value: number): string => {
    if (value === 0) return '0';
    return value > 0 ? `+${value}` : `${value}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(-2, Math.min(2, Math.round(numValue * 100) / 100));
      onPitchChange(clampedValue);
    }
    setInputValue('');
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
    setInputValue(`${Number(pitch.toFixed(2))}`);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handlePresetClick = (preset: number) => {
    if (!isAudioLoaded || isProcessing) return;
    onPitchChange(preset);
  };

  const fineControlWidth = 'min(100%, 280px)';
  const presetGridWidth = 'min(100%, 320px)';
  const fineButtonSize = '30px';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '8px',
        width: '100%',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          marginBottom: '4px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: isLightMode ? '#1a1a1a' : '#FFFFFF',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={pitchColor} strokeWidth="2" strokeLinecap="round">
            <path d="M12 3v18M9 6l3-3 3 3M9 18l3 3 3-3M3 12h18" />
          </svg>
          <span>Pitch Adjustment</span>
        </div>
        <span style={{ fontSize: '10px', fontWeight: 400, opacity: 0.7 }}>
          Jump to -2, -1, 0, +1, +2 st or fine tune by 0.1 st within +/-2 st
        </span>
      </div>

      <div
        style={{
          width: fineControlWidth,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: `${fineButtonSize} minmax(0, 1fr) ${fineButtonSize}`,
          gap: '8px',
          alignItems: 'center',
          background: isLightMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '6px',
          borderRadius: '12px',
          border: isLightMode ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: isLightMode
            ? '0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
            : '0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          transition: 'all 0.2s ease',
        }}
      >
        <button
          onClick={() => handlePitchStep(-PITCH_FINE_STEP)}
          disabled={!isAudioLoaded || isProcessing || pitch <= -2}
          style={{
            background: isLightMode ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            color: !isAudioLoaded || isProcessing || pitch <= -2 ? (isLightMode ? '#ccc' : '#666') : isLightMode ? '#1a1a1a' : '#FFFFFF',
            padding: 0,
            borderRadius: '8px',
            cursor: !isAudioLoaded || isProcessing || pitch <= -2 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            opacity: !isAudioLoaded || isProcessing || pitch <= -2 ? 0.3 : 1,
            width: fineButtonSize,
            height: fineButtonSize,
          }}
          onMouseEnter={(e) => {
            if (isAudioLoaded && !isProcessing && pitch > -2) {
              e.currentTarget.style.background = isLightMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isLightMode ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
          }}
          title="Decrease pitch by 0.1 st"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M7 12l5-5 5 5" />
          </svg>
        </button>

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            style={{
              width: '100%',
              minWidth: 0,
              height: fineButtonSize,
              padding: '0 6px',
              borderRadius: '8px',
              background: isLightMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.3)',
              border: `2px solid ${pitchColor}`,
              color: isLightMode ? '#1a1a1a' : '#FFFFFF',
              fontSize: '11px',
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
              width: '100%',
              minWidth: 0,
              height: fineButtonSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isAudioLoaded && !isProcessing ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              padding: '0 10px',
              borderRadius: '8px',
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
            title="Click to edit in semitones, double-click to reset to 0 st"
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                color: pitch === 0 ? (isLightMode ? '#666' : '#aaa') : pitchColor,
                fontFamily: 'monospace',
                lineHeight: '1',
                whiteSpace: 'nowrap',
              }}
            >
              {formatPitch(pitch)}
            </span>
          </div>
        )}

        <button
          onClick={() => handlePitchStep(PITCH_FINE_STEP)}
          disabled={!isAudioLoaded || isProcessing || pitch >= 2}
          style={{
            background: isLightMode ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            color: !isAudioLoaded || isProcessing || pitch >= 2 ? (isLightMode ? '#ccc' : '#666') : isLightMode ? '#1a1a1a' : '#FFFFFF',
            padding: 0,
            borderRadius: '8px',
            cursor: !isAudioLoaded || isProcessing || pitch >= 2 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            opacity: !isAudioLoaded || isProcessing || pitch >= 2 ? 0.3 : 1,
            width: fineButtonSize,
            height: fineButtonSize,
          }}
          onMouseEnter={(e) => {
            if (isAudioLoaded && !isProcessing && pitch < 2) {
              e.currentTarget.style.background = isLightMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isLightMode ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
          }}
          title="Increase pitch by 0.1 st"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 19V5M7 12l5 5 5-5" />
          </svg>
        </button>
      </div>

      <div
        style={{
          width: presetGridWidth,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(48px, 1fr))',
          gap: '6px',
        }}
      >
        {PITCH_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            disabled={!isAudioLoaded || isProcessing}
            style={{
              width: '100%',
              minWidth: 0,
              padding: '6px 0',
              borderRadius: '6px',
              background: Math.abs(pitch - preset) < 0.005
                ? isLightMode
                  ? `linear-gradient(135deg, ${pitchColor}20, ${pitchColor}15)`
                  : `linear-gradient(135deg, ${pitchColor}35, ${pitchColor}25)`
                : isLightMode
                  ? 'rgba(0, 0, 0, 0.05)'
                  : 'rgba(255, 255, 255, 0.1)',
              color: Math.abs(pitch - preset) < 0.005 ? pitchColor : isLightMode ? '#1a1a1a' : '#FFFFFF',
              fontSize: '11px',
              fontWeight: Math.abs(pitch - preset) < 0.005 ? 700 : 500,
              cursor: isAudioLoaded && !isProcessing ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              opacity: isAudioLoaded ? 1 : 0.5,
              border: Math.abs(pitch - preset) < 0.005
                ? `1px solid ${pitchColor}50`
                : isLightMode
                  ? '1px solid rgba(0, 0, 0, 0.1)'
                  : '1px solid rgba(255, 255, 255, 0.15)',
            }}
            onMouseEnter={(e) => {
              if (isAudioLoaded && !isProcessing && Math.abs(pitch - preset) >= 0.005) {
                e.currentTarget.style.background = isLightMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (Math.abs(pitch - preset) >= 0.005) {
                e.currentTarget.style.background = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)';
              }
            }}
            title={`Set pitch to ${formatPitch(preset)}`}
          >
            {formatPitchPresetLabel(preset)}
          </button>
        ))}
      </div>

      {isProcessing && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            padding: '8px',
            background: isLightMode
              ? `linear-gradient(135deg, ${pitchColor}08, ${pitchColor}05)`
              : `linear-gradient(135deg, ${pitchColor}20, ${pitchColor}15)`,
            borderRadius: '8px',
            border: `1px solid ${pitchColor}30`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              color: isLightMode ? '#1a1a1a' : '#FFFFFF',
              fontWeight: 500,
            }}
          >
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
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span>Processing pitch shift...</span>
          </div>

          <div
            style={{
              width: '100%',
              height: '4px',
              background: isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${pitchColor}, ${pitchColor}dd)`,
                borderRadius: '2px',
                transition: 'width 0.3s ease',
                boxShadow: `0 0 8px ${pitchColor}60`,
              }}
            />
          </div>

          <div
            style={{
              fontSize: '10px',
              color: isLightMode ? '#666' : '#aaa',
              textAlign: 'right',
            }}
          >
            {progress.toFixed(0)}%
          </div>
        </div>
      )}

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
