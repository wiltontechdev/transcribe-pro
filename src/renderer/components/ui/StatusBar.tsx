// StatusBar.tsx - Status bar: file info, save status, markers count (time/zoom in playback & menu)
import React from 'react';
import { useAppStore } from '../../store/store';
import { useShallow } from 'zustand/react/shallow';

const KENYAN_GREEN = '#006644';
const KENYAN_RED = '#DE2910';
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

const StatusBar: React.FC = () => {
  const { theme, currentTime, duration, file, isLoaded, markersCount, projectLastChangeAt, lastAutoSaveAt, lastManualSaveAt } = useAppStore(
    useShallow((s) => ({
      theme: s.theme,
      currentTime: s.audio.currentTime,
      duration: s.audio.duration,
      file: s.audio.file,
      isLoaded: s.audio.isLoaded,
      markersCount: s.markers.length,
      projectLastChangeAt: s.projectLastChangeAt,
      lastAutoSaveAt: s.lastAutoSaveAt,
      lastManualSaveAt: s.lastManualSaveAt,
    }))
  );
  const isLightMode = theme === 'light';

  const textColor = isLightMode ? '#1a1a1a' : '#ffffff';
  const bgColor = isLightMode 
    ? 'rgba(255, 255, 255, 0.95)'
    : 'rgba(26, 26, 26, 0.95)';
  const borderColor = isLightMode 
    ? 'rgba(0, 0, 0, 0.1)'
    : 'rgba(255, 255, 255, 0.1)';

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const fileSize = file?.size || 0;
  const fileName = file?.name || 'No file loaded';

  // Check if mobile
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
  
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile: Show only essential info
  if (isMobile) {
    const isTinyMobile = typeof window !== 'undefined' && window.innerWidth <= 360;
    const hasUnsavedChanges = !!file && projectLastChangeAt > Math.max(lastAutoSaveAt, lastManualSaveAt);
    const statusColor = hasUnsavedChanges ? KENYAN_RED : KENYAN_GREEN;
    
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: isTinyMobile ? '20px' : '24px',
          background: bgColor,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isTinyMobile ? '0.5rem' : '1rem',
          padding: '0 0.5rem',
          fontSize: isTinyMobile ? '0.58rem' : '0.65rem',
          fontFamily: HANDWRITTEN_FONT,
          zIndex: 999998,
        }}
      >
        {/* Save status indicator */}
        {isLoaded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 6px ${statusColor}80`,
              }}
            />
            <span style={{ color: textColor, fontWeight: '500' }}>
              {hasUnsavedChanges ? 'Unsaved' : 'Saved'}
            </span>
          </div>
        )}
        
        {/* Time */}
        {!isTinyMobile && isLoaded && duration > 0 && (
          <span style={{ color: textColor }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        )}
        
        {/* Markers count */}
        <span style={{ color: KENYAN_GREEN, fontWeight: '600' }}>
          {markersCount} {markersCount === 1 ? 'marker' : 'markers'}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '28px',
        background: bgColor,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        fontSize: '0.75rem',
        fontFamily: HANDWRITTEN_FONT,
        zIndex: 999998,
        boxShadow: isLightMode
          ? '0 -2px 10px rgba(0, 0, 0, 0.05)'
          : '0 -2px 10px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Left side - File info only (time/zoom shown in playback panel and menu bar) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: textColor, opacity: 0.7 }}>📄</span>
          <span style={{ color: textColor, fontWeight: '500' }}>
            {fileName.length > 30 ? `${fileName.substring(0, 30)}...` : fileName}
          </span>
          {fileSize > 0 && (
            <span style={{ color: textColor, opacity: 0.6 }}>
              ({formatFileSize(fileSize)})
            </span>
          )}
        </div>
      </div>

      {/* Center - Save status */}
      {isLoaded && (() => {
        const hasUnsavedChanges = projectLastChangeAt > Math.max(lastAutoSaveAt, lastManualSaveAt);
        const statusColor = hasUnsavedChanges ? KENYAN_RED : KENYAN_GREEN;
        const statusText = hasUnsavedChanges ? 'Unsaved changes' : 'Saved';
        
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
          }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 8px ${statusColor}80`,
              }}
            />
            <span style={{ color: textColor, fontWeight: '500', fontSize: '0.75rem' }}>
              {statusText}
            </span>
          </div>
        );
      })()}

      {/* Right side: empty so save status stays centered (markers count shown in Markers panel) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', minWidth: '80px' }} />
    </div>
  );
};

export default StatusBar;
