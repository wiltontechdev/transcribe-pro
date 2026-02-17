// AudioEffectsPanel.tsx - Audio Effects with Normalization, Fade, Key Detection
import React, { useState, useCallback } from 'react';
import { useAppStore } from '../../store/store';

// Kenyan colors
const KENYAN_GREEN = '#006644';
const KENYAN_WHITE = '#FFFFFF';
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

interface AudioEffectsPanelProps {
  audioFilePath: string | null;
  onEffectApplied?: (newFilePath: string) => void;
}

interface KeyInfo {
  key: string;
  mode: string;
  confidence: number;
  camelot: string;
}

const AudioEffectsPanel: React.FC<AudioEffectsPanelProps> = ({ audioFilePath, onEffectApplied }) => {
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  
  // State for each effect
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [isDetectingKey, setIsDetectingKey] = useState(false);
  
  const [fadeIn, setFadeIn] = useState(2);
  const [fadeOut, setFadeOut] = useState(2);
  const [targetLoudness, setTargetLoudness] = useState(-14);
  
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Neumorphic styles
  const neuBg = isLightMode ? '#e4ebf5' : '#1e1e1e';
  const shadowDark = isLightMode ? 'rgba(163, 177, 198, 0.6)' : 'rgba(0, 0, 0, 0.5)';
  const shadowLight = isLightMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(50, 50, 50, 0.3)';
  const neuRaised = `6px 6px 12px ${shadowDark}, -4px -4px 10px ${shadowLight}`;
  const neuPressed = `inset 3px 3px 6px ${shadowDark}, inset -3px -3px 6px ${shadowLight}`;
  const textColor = isLightMode ? '#2d3748' : KENYAN_WHITE;

  const showMessage = useCallback((msg: string, isError: boolean) => {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 4000);
  }, []);

  // Audio Normalization
  const handleNormalize = useCallback(async () => {
    if (!audioFilePath || !window.electronAPI) return;
    
    setIsNormalizing(true);
    setError(null);
    try {
      const result = await window.electronAPI.normalizeAudio(audioFilePath, targetLoudness);
      showMessage('Audio normalized successfully!', false);
      onEffectApplied?.(result);
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Normalization failed', true);
    } finally {
      setIsNormalizing(false);
    }
  }, [audioFilePath, targetLoudness, onEffectApplied, showMessage]);

  // Apply Fade
  const handleFade = useCallback(async () => {
    if (!audioFilePath || !window.electronAPI) return;
    
    setIsFading(true);
    setError(null);
    try {
      const result = await window.electronAPI.applyFade(audioFilePath, fadeIn, fadeOut);
      showMessage('Fade applied successfully!', false);
      onEffectApplied?.(result);
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Fade failed', true);
    } finally {
      setIsFading(false);
    }
  }, [audioFilePath, fadeIn, fadeOut, onEffectApplied, showMessage]);

  // Detect Key
  const handleDetectKey = useCallback(async () => {
    if (!audioFilePath || !window.electronAPI) return;
    
    setIsDetectingKey(true);
    setError(null);
    setKeyInfo(null);
    try {
      const result = await window.electronAPI.detectKey(audioFilePath);
      setKeyInfo(result);
      showMessage(`Key detected: ${result.key} ${result.mode}`, false);
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Key detection failed', true);
    } finally {
      setIsDetectingKey(false);
    }
  }, [audioFilePath, showMessage]);

  // Button component
  const EffectButton: React.FC<{
    onClick: () => void;
    disabled: boolean;
    loading: boolean;
    icon: React.ReactNode;
    label: string;
    color: string;
  }> = ({ onClick, disabled, loading, icon, label, color }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 18px',
        background: neuBg,
        border: 'none',
        borderRadius: '14px',
        boxShadow: loading ? neuPressed : neuRaised,
        color: disabled ? `${textColor}60` : color,
        fontFamily: HANDWRITTEN_FONT,
        fontSize: '0.9rem',
        fontWeight: '500',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.25s ease',
        opacity: disabled ? 0.6 : 1,
        transform: loading ? 'scale(0.98)' : 'scale(1)',
      }}
    >
      {loading ? (
        <div style={{
          width: '18px',
          height: '18px',
          border: `2px solid ${color}30`,
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      ) : (
        icon
      )}
      {label}
    </button>
  );

  const isDisabled = !audioFilePath || !window.electronAPI;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      padding: '1.5rem',
      background: neuBg,
      borderRadius: '20px',
      boxShadow: neuRaised,
      fontFamily: HANDWRITTEN_FONT,
    }}>
      <h3 style={{ 
        margin: 0, 
        color: textColor, 
        fontSize: '1.1rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
        Audio Effects
      </h3>

      {/* Messages */}
      {error && (
        <div style={{
          padding: '10px 14px',
          background: neuBg,
          borderRadius: '10px',
          boxShadow: neuPressed,
          color: KENYAN_RED,
          fontSize: '0.85rem'
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          padding: '10px 14px',
          background: neuBg,
          borderRadius: '10px',
          boxShadow: neuPressed,
          color: KENYAN_GREEN,
          fontSize: '0.85rem'
        }}>
          {success}
        </div>
      )}

      {/* Normalization Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ color: textColor, fontSize: '0.9rem', fontWeight: '500' }}>
          🎚️ Audio Normalization
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: neuBg,
            borderRadius: '10px',
            boxShadow: neuPressed,
          }}>
            <span style={{ color: textColor, fontSize: '0.8rem' }}>Target:</span>
            <input
              type="number"
              value={targetLoudness}
              onChange={(e) => setTargetLoudness(Number(e.target.value))}
              min={-30}
              max={0}
              style={{
                width: '50px',
                background: 'transparent',
                border: 'none',
                color: textColor,
                fontFamily: HANDWRITTEN_FONT,
                fontSize: '0.9rem',
                textAlign: 'center',
                outline: 'none'
              }}
            />
            <span style={{ color: `${textColor}80`, fontSize: '0.75rem' }}>LUFS</span>
          </div>
          <EffectButton
            onClick={handleNormalize}
            disabled={isDisabled}
            loading={isNormalizing}
            color={KENYAN_GREEN}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12h2l2-5 4 10 4-8 2 3h6"/>
            </svg>}
            label="Normalize"
          />
        </div>
      </div>

      {/* Fade Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ color: textColor, fontSize: '0.9rem', fontWeight: '500' }}>
          🌊 Fade In/Out
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: neuBg,
            borderRadius: '10px',
            boxShadow: neuPressed,
          }}>
            <span style={{ color: textColor, fontSize: '0.8rem' }}>In:</span>
            <input
              type="number"
              value={fadeIn}
              onChange={(e) => setFadeIn(Number(e.target.value))}
              min={0}
              max={30}
              step={0.5}
              style={{
                width: '40px',
                background: 'transparent',
                border: 'none',
                color: textColor,
                fontFamily: HANDWRITTEN_FONT,
                fontSize: '0.9rem',
                textAlign: 'center',
                outline: 'none'
              }}
            />
            <span style={{ color: `${textColor}80`, fontSize: '0.75rem' }}>s</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: neuBg,
            borderRadius: '10px',
            boxShadow: neuPressed,
          }}>
            <span style={{ color: textColor, fontSize: '0.8rem' }}>Out:</span>
            <input
              type="number"
              value={fadeOut}
              onChange={(e) => setFadeOut(Number(e.target.value))}
              min={0}
              max={30}
              step={0.5}
              style={{
                width: '40px',
                background: 'transparent',
                border: 'none',
                color: textColor,
                fontFamily: HANDWRITTEN_FONT,
                fontSize: '0.9rem',
                textAlign: 'center',
                outline: 'none'
              }}
            />
            <span style={{ color: `${textColor}80`, fontSize: '0.75rem' }}>s</span>
          </div>
          <EffectButton
            onClick={handleFade}
            disabled={isDisabled}
            loading={isFading}
            color={KENYAN_GREEN}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>}
            label="Apply Fade"
          />
        </div>
      </div>

      {/* Key Detection Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ color: textColor, fontSize: '0.9rem', fontWeight: '500' }}>
          🎵 Key Detection
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <EffectButton
            onClick={handleDetectKey}
            disabled={isDisabled}
            loading={isDetectingKey}
            color={KENYAN_GREEN}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>}
            label="Detect Key"
          />
          {keyInfo && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              background: neuBg,
              borderRadius: '12px',
              boxShadow: neuPressed,
            }}>
              <span style={{ 
                color: KENYAN_GREEN, 
                fontSize: '1.2rem', 
                fontWeight: '700' 
              }}>
                {keyInfo.key} {keyInfo.mode}
              </span>
              <span style={{ 
                color: `${textColor}80`, 
                fontSize: '0.8rem',
                padding: '2px 8px',
                background: `${KENYAN_GREEN}20`,
                borderRadius: '6px'
              }}>
                Camelot: {keyInfo.camelot}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AudioEffectsPanel;
