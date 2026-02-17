// MobileControlsPanel.tsx - Compact zoom and pitch controls for mobile
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/store';
import { useSmoothViewport } from '../../hooks/useSmoothViewport';
import { useAudioEngine } from '../audio/useAudioEngine';
import { onPitchStatus } from '../audio/HowlerAudioEngine';

const KENYAN_GREEN = '#006644';
const KENYAN_RED = '#DE2910';

const MobileControlsPanel: React.FC = () => {
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  const isAudioLoaded = useAppStore((state) => state.audio.isLoaded);
  const duration = useAppStore((state) => state.audio.duration) || 0;
  const currentTime = useAppStore((state) => state.audio.currentTime || 0);
  const rawZoomLevel = useAppStore((state) => state.ui.zoomLevel);
  const pitch = useAppStore((state) => state.globalControls.pitch);
  
  // Use audio engine's pitch method (same as desktop)
  const { setPitch: setAudioPitch } = useAudioEngine();
  const { animateZoom } = useSmoothViewport();
  
  // Pitch processing status
  const [isPitchProcessing, setIsPitchProcessing] = useState(false);
  
  // Subscribe to pitch processing status (same as desktop)
  useEffect(() => {
    const unsubscribe = onPitchStatus((status) => {
      setIsPitchProcessing(status.isProcessing);
    });
    return unsubscribe;
  }, []);
  
  // Zoom limits - same as mobile menu (5 = 20% view, 50 = 2% view)
  const MIN_ZOOM = 5;
  const MAX_ZOOM = 50;
  
  // Safe zoom level - same source as Waveform/MarkerTimeline (ui.zoomLevel)
  const zoomLevel = (typeof rawZoomLevel === 'number' && !isNaN(rawZoomLevel) && isFinite(rawZoomLevel))
    ? rawZoomLevel : MIN_ZOOM;
  
  // Neumorphic colors
  const neuBg = isLightMode ? '#e4ebf5' : '#1e1e1e';
  const shadowDark = isLightMode ? 'rgba(163, 177, 198, 0.6)' : 'rgba(0, 0, 0, 0.5)';
  const shadowLight = isLightMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(50, 50, 50, 0.3)';
  const textColor = isLightMode ? '#2d3748' : '#ffffff';
  
  const neuRaised = `2px 2px 4px ${shadowDark}, -1px -1px 2px ${shadowLight}`;
  const neuPressed = `inset 1px 1px 2px ${shadowDark}, inset -1px -1px 2px ${shadowLight}`;
  
  // Zoom handlers - matching desktop: animateZoom updates ui.zoomLevel and viewport
  
  const handleZoomIn = () => {
    if (duration <= 0 || !isAudioLoaded) return;
    const newZoom = Math.min(zoomLevel * 1.5, MAX_ZOOM);
    animateZoom(newZoom, currentTime, { duration: 250, easing: 'easeOutCubic' });
  };
  
  const handleZoomOut = () => {
    if (duration <= 0 || !isAudioLoaded) return;
    const newZoom = Math.max(zoomLevel / 1.5, MIN_ZOOM);
    animateZoom(newZoom, undefined, { duration: 250, easing: 'easeOutCubic' });
  };
  
  const handleZoomReset = () => {
    if (duration > 0 && isAudioLoaded) {
      // Reset to default 20% view (zoom level 5)
      animateZoom(MIN_ZOOM, undefined, { duration: 300, easing: 'easeOutCubic' });
    }
  };
  
  // Pitch handlers - use audio engine (same as desktop)
  const handlePitchUp = () => {
    if (!isAudioLoaded || isPitchProcessing) return;
    const newPitch = Math.min(Math.round((pitch + 0.1) * 10) / 10, 2);
    setAudioPitch(newPitch);
  };
  
  const handlePitchDown = () => {
    if (!isAudioLoaded || isPitchProcessing) return;
    const newPitch = Math.max(Math.round((pitch - 0.1) * 10) / 10, -2);
    setAudioPitch(newPitch);
  };
  
  const handlePitchReset = () => {
    if (!isAudioLoaded || isPitchProcessing) return;
    setAudioPitch(0);
  };
  
  // Format zoom as multiplier (e.g., "5.0x") instead of misleading percentage
  const zoomDisplay = zoomLevel >= 10 ? `${Math.round(zoomLevel)}x` : `${zoomLevel.toFixed(1)}x`;
  const pitchDisplay = isPitchProcessing ? '...' : (pitch > 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1));
  
  const btnStyle = (disabled: boolean = false) => ({
    width: '36px',
    height: '36px',
    minWidth: '36px',
    borderRadius: '8px',
    border: 'none',
    background: neuBg,
    boxShadow: neuRaised,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    color: textColor,
    touchAction: 'manipulation' as const,
    padding: 0,
    fontSize: '16px',
    fontWeight: 600 as const,
  });
  
  const valueStyle = {
    fontSize: '14px',
    fontWeight: 600 as const,
    minWidth: '44px',
    textAlign: 'center' as const,
    color: KENYAN_GREEN,
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      height: '100%',
      width: '100%',
      padding: '6px 8px',
      boxSizing: 'border-box',
    }}>
      {/* Zoom Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: neuBg,
        borderRadius: '10px',
        padding: '6px 10px',
        boxShadow: neuPressed,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '14px', marginRight: '2px' }}>🔍</span>
        <button
          onClick={handleZoomOut}
          disabled={!isAudioLoaded || zoomLevel <= MIN_ZOOM}
          style={btnStyle(!isAudioLoaded || zoomLevel <= MIN_ZOOM)}
          title="Zoom Out"
        >
          −
        </button>
        <span style={valueStyle}>{zoomDisplay}</span>
        <button
          onClick={handleZoomIn}
          disabled={!isAudioLoaded || zoomLevel >= MAX_ZOOM}
          style={btnStyle(!isAudioLoaded || zoomLevel >= MAX_ZOOM)}
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomReset}
          disabled={!isAudioLoaded || Math.abs(zoomLevel - MIN_ZOOM) < 0.1}
          style={{ ...btnStyle(!isAudioLoaded || Math.abs(zoomLevel - MIN_ZOOM) < 0.1), fontSize: '12px', fontWeight: 700 }}
          title="Reset to 1/5 view"
        >
          1/5
        </button>
      </div>
      
      {/* Pitch Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: neuBg,
        borderRadius: '10px',
        padding: '6px 10px',
        boxShadow: neuPressed,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '14px', marginRight: '2px' }}>🎵</span>
        <button
          onClick={handlePitchDown}
          disabled={!isAudioLoaded || isPitchProcessing || pitch <= -2}
          style={btnStyle(!isAudioLoaded || isPitchProcessing || pitch <= -2)}
          title="Lower Pitch"
        >
          ↓
        </button>
        <span style={{ ...valueStyle, color: pitch !== 0 ? KENYAN_RED : KENYAN_GREEN }}>
          {pitchDisplay}
        </span>
        <button
          onClick={handlePitchUp}
          disabled={!isAudioLoaded || isPitchProcessing || pitch >= 2}
          style={btnStyle(!isAudioLoaded || isPitchProcessing || pitch >= 2)}
          title="Raise Pitch"
        >
          ↑
        </button>
        <button
          onClick={handlePitchReset}
          disabled={!isAudioLoaded || isPitchProcessing || pitch === 0}
          style={{ ...btnStyle(!isAudioLoaded || isPitchProcessing || pitch === 0), fontSize: '12px', fontWeight: 700 }}
          title="Reset"
        >
          0
        </button>
      </div>
    </div>
  );
};

export default MobileControlsPanel;
