// UpdateNotification.tsx - Auto-update notification UI for Electron
// Shows update availability, download progress, and install prompts

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/store';
import type { UpdateStatusEvent, UpdateInfo, DownloadProgress } from '../../../types/electron';

// Kenyan colors
const KENYAN_GREEN = '#006644';
const KENYAN_RED = '#DE2910';

interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'up-to-date';
  updateInfo: UpdateInfo | null;
  downloadProgress: DownloadProgress | null;
  error: string | null;
}

const UpdateNotification: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>({
    status: 'idle',
    updateInfo: null,
    downloadProgress: null,
    error: null,
  });
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  
  // Check if we're in Electron
  const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Subscribe to update events from main process
  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;

    const unsubscribe = window.electronAPI.onUpdateStatus((event: UpdateStatusEvent) => {
      switch (event.status) {
        case 'checking':
          setUpdateState(prev => ({ ...prev, status: 'checking', error: null }));
          break;
        case 'update-available':
          setUpdateState({
            status: 'available',
            updateInfo: event.data,
            downloadProgress: null,
            error: null,
          });
          setDismissed(false); // Show notification for new updates
          break;
        case 'update-not-available':
          setUpdateState(prev => ({ ...prev, status: 'up-to-date', error: null }));
          break;
        case 'download-progress':
          setUpdateState(prev => ({
            ...prev,
            status: 'downloading',
            downloadProgress: event.data,
          }));
          break;
        case 'update-downloaded':
          setUpdateState(prev => ({
            ...prev,
            status: 'downloaded',
            updateInfo: event.data,
            downloadProgress: null,
          }));
          break;
        case 'error':
          setUpdateState(prev => ({
            ...prev,
            status: 'error',
            error: event.data?.message || 'Update check failed',
          }));
          break;
        case 'dev-mode':
          // Silently ignore in dev mode
          break;
      }
    });

    return unsubscribe;
  }, [isElectron]);

  // Check for updates on mount (with delay)
  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;
    
    // Initial status check
    window.electronAPI.getUpdateStatus().then((status) => {
      if (status.updateAvailable && status.updateInfo) {
        setUpdateState({
          status: status.downloadedUpdate ? 'downloaded' : 'available',
          updateInfo: status.updateInfo,
          downloadProgress: status.downloadProgress,
          error: null,
        });
      }
    });
  }, [isElectron]);

  const handleCheckForUpdates = useCallback(async () => {
    if (!window.electronAPI) return;
    setUpdateState(prev => ({ ...prev, status: 'checking', error: null }));
    await window.electronAPI.checkForUpdates();
  }, []);

  const handleDownloadUpdate = useCallback(async () => {
    if (!window.electronAPI) return;
    setUpdateState(prev => ({ ...prev, status: 'downloading' }));
    const result = await window.electronAPI.downloadUpdate();
    if (!result.success) {
      setUpdateState(prev => ({ ...prev, status: 'error', error: result.error || 'Download failed' }));
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.installUpdate();
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Don't render if not Electron or dismissed
  if (!isElectron || !mounted) return null;
  
  // Only show notification banner for available/downloaded states (not dismissed)
  const showBanner = !dismissed && (updateState.status === 'available' || updateState.status === 'downloaded' || updateState.status === 'downloading');

  // Styles
  const bannerBg = isLightMode ? 'rgba(255, 255, 255, 0.98)' : 'rgba(30, 30, 30, 0.98)';
  const textColor = isLightMode ? '#1a1a1a' : '#ffffff';
  const subtextColor = isLightMode ? '#666' : 'rgba(255,255,255,0.7)';

  const notificationBanner = showBanner ? (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        maxWidth: '380px',
        background: bannerBg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        border: `1px solid ${isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
        padding: '16px',
        zIndex: 100000,
        animation: 'slideInUp 0.3s ease-out',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${KENYAN_GREEN}, ${KENYAN_GREEN}dd)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: textColor }}>
              {updateState.status === 'downloaded' ? 'Update Ready!' : 'Update Available'}
            </h3>
            {updateState.updateInfo && (
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: subtextColor }}>
                Version {updateState.updateInfo.version}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: subtextColor,
            opacity: 0.7,
          }}
          aria-label="Dismiss"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Download Progress */}
      {updateState.status === 'downloading' && updateState.downloadProgress && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: subtextColor }}>Downloading...</span>
            <span style={{ fontSize: '13px', color: subtextColor }}>
              {Math.round(updateState.downloadProgress.percent)}%
            </span>
          </div>
          <div style={{
            height: '6px',
            background: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${updateState.downloadProgress.percent}%`,
              background: KENYAN_GREEN,
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: subtextColor }}>
            {formatBytes(updateState.downloadProgress.transferred)} / {formatBytes(updateState.downloadProgress.total)}
            {' · '}
            {formatBytes(updateState.downloadProgress.bytesPerSecond)}/s
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {updateState.status === 'available' && (
          <>
            <button
              onClick={handleDownloadUpdate}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: KENYAN_GREEN,
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Download Update
            </button>
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: `1px solid ${isLightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '10px',
                color: textColor,
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Details
            </button>
          </>
        )}
        {updateState.status === 'downloaded' && (
          <button
            onClick={handleInstallUpdate}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: KENYAN_GREEN,
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Restart & Install
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  ) : null;

  // Update details modal
  const detailsModal = showModal && updateState.updateInfo ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100001,
        padding: '20px',
      }}
      onClick={() => setShowModal(false)}
    >
      <div
        style={{
          background: isLightMode ? '#fff' : '#1a1a1a',
          borderRadius: '20px',
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: textColor }}>
            Update Details
          </h2>
          <button
            onClick={() => setShowModal(false)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              color: subtextColor,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              padding: '8px 14px',
              background: `${KENYAN_GREEN}20`,
              borderRadius: '8px',
              color: KENYAN_GREEN,
              fontSize: '16px',
              fontWeight: 600,
            }}>
              v{updateState.updateInfo.version}
            </div>
            {updateState.updateInfo.releaseDate && (
              <span style={{ fontSize: '14px', color: subtextColor }}>
                {new Date(updateState.updateInfo.releaseDate).toLocaleDateString()}
              </span>
            )}
          </div>

          {updateState.updateInfo.releaseNotes && (
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: textColor }}>
                What's New
              </h4>
              <div
                style={{
                  padding: '12px',
                  background: isLightMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: subtextColor,
                  whiteSpace: 'pre-wrap',
                }}
                dangerouslySetInnerHTML={{ __html: updateState.updateInfo.releaseNotes }}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              handleDownloadUpdate();
              setShowModal(false);
            }}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: KENYAN_GREEN,
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Download Update
          </button>
          <button
            onClick={() => setShowModal(false)}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: `1px solid ${isLightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '12px',
              color: textColor,
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return createPortal(
    <>
      {notificationBanner}
      {detailsModal}
    </>,
    document.body
  );
};

export default UpdateNotification;

// Export hook for checking updates from other components (e.g., Settings)
export function useUpdateChecker() {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<'up-to-date' | 'available' | 'error' | null>(null);

  const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;
    
    window.electronAPI.getAppVersion().then((info) => {
      setCurrentVersion(info.version);
    });
  }, [isElectron]);

  const checkForUpdates = useCallback(async () => {
    if (!window.electronAPI) return;
    
    setIsChecking(true);
    setLastCheckResult(null);
    
    // Subscribe to result temporarily
    const unsubscribe = window.electronAPI.onUpdateStatus((event) => {
      if (event.status === 'update-available') {
        setLastCheckResult('available');
        setIsChecking(false);
      } else if (event.status === 'update-not-available') {
        setLastCheckResult('up-to-date');
        setIsChecking(false);
      } else if (event.status === 'error') {
        setLastCheckResult('error');
        setIsChecking(false);
      }
    });
    
    await window.electronAPI.checkForUpdates();
    
    // Clean up after timeout (in case no response)
    setTimeout(() => {
      unsubscribe();
      setIsChecking(false);
    }, 30000);
    
    return unsubscribe;
  }, []);

  return {
    currentVersion,
    isChecking,
    lastCheckResult,
    checkForUpdates,
    isElectron,
  };
}
