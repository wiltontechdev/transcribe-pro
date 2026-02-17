// AutoSaveIndicator.tsx - Visual indicator for auto-save status
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/store';

const KENYAN_GREEN = '#006644';
const KENYAN_RED = '#DE2910';
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

const AutoSaveIndicator: React.FC = () => {
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  const projectLastChangeAt = useAppStore((state) => state.projectLastChangeAt);
  const lastAutoSaveAt = useAppStore((state) => state.lastAutoSaveAt);
  const lastManualSaveAt = useAppStore((state) => state.lastManualSaveAt);
  const audio = useAppStore((state) => state.audio);
  
  const [status, setStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (!audio.isLoaded) {
      setShowIndicator(false);
      return;
    }

    const hasUnsavedChanges = projectLastChangeAt > Math.max(lastAutoSaveAt, lastManualSaveAt);
    
    if (hasUnsavedChanges) {
      setStatus('unsaved');
      setShowIndicator(true);
    } else if (lastAutoSaveAt > 0 || lastManualSaveAt > 0) {
      setStatus('saved');
      setShowIndicator(true);
      // Hide after 3 seconds
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [projectLastChangeAt, lastAutoSaveAt, lastManualSaveAt, audio.isLoaded]);

  if (!showIndicator) return null;

  const textColor = isLightMode ? '#1a1a1a' : '#ffffff';
  const bgColor = isLightMode 
    ? 'rgba(255, 255, 255, 0.9)'
    : 'rgba(26, 26, 26, 0.9)';
  const statusColor = status === 'saved' ? KENYAN_GREEN : status === 'saving' ? '#f39c12' : KENYAN_RED;
  const statusText = status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving...' : 'Unsaved changes';

  return (
    <div
      style={{
        position: 'fixed',
        top: '4rem',
        right: '1rem',
        padding: '0.5rem 1rem',
        background: bgColor,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${statusColor}40`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.85rem',
        fontFamily: HANDWRITTEN_FONT,
        zIndex: 999997,
        boxShadow: `0 4px 12px ${statusColor}30`,
        animation: status === 'saving' ? 'pulse 1.5s ease-in-out infinite' : 'fadeIn 0.3s ease',
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: statusColor,
          boxShadow: `0 0 8px ${statusColor}80`,
          animation: status === 'saving' ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}
      />
      <span style={{ color: textColor, fontWeight: '500' }}>
        {statusText}
      </span>
    </div>
  );
};

export default AutoSaveIndicator;
