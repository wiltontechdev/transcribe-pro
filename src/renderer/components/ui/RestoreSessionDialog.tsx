// RestoreSessionDialog - Modal dialog for restoring previous session on page reload
// Shows project preview and offers Restore/Start Fresh options

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/store';

const KENYAN_GREEN = '#006644';
const KENYAN_RED = '#DE2910';

interface ProjectPreview {
  name: string;
  lastModified: string;
  markerCount: number;
  duration: number;
}

interface RestoreSessionDialogProps {
  isOpen: boolean;
  onRestore: () => void;
  onStartFresh: () => void;
}

// Format duration as mm:ss or hh:mm:ss
const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Format date as relative time or date string
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Unknown';
  }
};

// Parse autosave data to get preview
const getProjectPreview = (): ProjectPreview | null => {
  try {
    const autosaveData = localStorage.getItem('transcribe-pro-web-autosave');
    if (!autosaveData) return null;

    const data = JSON.parse(autosaveData);
    return {
      name: data.audioFileName || data.name || 'Untitled Project',
      lastModified: data.updatedAt || data.createdAt || new Date().toISOString(),
      markerCount: data.markers?.length || 0,
      duration: data.duration || 0,
    };
  } catch {
    return null;
  }
};

export const RestoreSessionDialog: React.FC<RestoreSessionDialogProps> = ({
  isOpen,
  onRestore,
  onStartFresh,
}) => {
  const theme = useAppStore((s) => s.theme);
  const isLightMode = theme === 'light';
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 500);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPreview(getProjectPreview());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const bg = isLightMode ? '#f7fafc' : '#1a1a1a';
  const cardBg = isLightMode ? '#ffffff' : '#252525';
  const textColor = isLightMode ? '#2d3748' : '#ffffff';
  const mutedColor = isLightMode ? '#718096' : 'rgba(255,255,255,0.6)';
  const borderColor = isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10003,
        padding: isMobile ? 16 : 24,
        animation: 'restoreDialogFadeIn 0.25s ease-out',
      }}
    >
      <div
        style={{
          background: bg,
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          maxWidth: 420,
          width: '100%',
          overflow: 'hidden',
          animation: 'restoreDialogSlide 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${KENYAN_GREEN}, #008855)`,
            padding: isMobile ? '20px 16px' : '24px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              animation: 'restoreIconPulse 2s ease-in-out infinite',
            }}
          >
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </div>
          <h2 style={{ margin: 0, color: 'white', fontSize: isMobile ? 18 : 20, fontWeight: 700 }}>
            Welcome Back!
          </h2>
          <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
            Would you like to restore your previous session?
          </p>
        </div>

        {/* Project Preview */}
        {preview && (
          <div style={{ padding: isMobile ? '16px' : '20px 24px' }}>
            <div
              style={{
                background: cardBg,
                borderRadius: 14,
                padding: isMobile ? '14px' : '16px',
                border: `1px solid ${borderColor}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${KENYAN_GREEN}20, ${KENYAN_RED}20)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: 15,
                      color: textColor,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {preview.name}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: mutedColor }}>
                    {formatDate(preview.lastModified)}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: `1px solid ${borderColor}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={mutedColor} strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span style={{ fontSize: 13, color: mutedColor }}>
                    {formatDuration(preview.duration)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={mutedColor} strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                  <span style={{ fontSize: 13, color: mutedColor }}>
                    {preview.markerCount} marker{preview.markerCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div
          style={{
            padding: isMobile ? '0 16px 20px' : '0 24px 24px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onStartFresh}
            style={{
              flex: 1,
              padding: '14px 20px',
              minHeight: 48,
              background: 'transparent',
              border: `2px solid ${borderColor}`,
              borderRadius: 12,
              color: textColor,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              order: isMobile ? 2 : 1,
            }}
          >
            Start Fresh
          </button>
          <button
            type="button"
            onClick={onRestore}
            style={{
              flex: 1,
              padding: '14px 20px',
              minHeight: 48,
              background: `linear-gradient(135deg, ${KENYAN_GREEN}, #008855)`,
              border: 'none',
              borderRadius: 12,
              color: 'white',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,102,68,0.4)',
              transition: 'all 0.2s ease',
              order: isMobile ? 1 : 2,
            }}
          >
            Restore Session
          </button>
        </div>
      </div>

      <style>{`
        @keyframes restoreDialogFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes restoreDialogSlide {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes restoreIconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default RestoreSessionDialog;
