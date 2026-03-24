// SettingsModal.tsx - Settings modal with glassmorphic and neumorphic design
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/store';
import { clearAutoSaveData, clearAllProjectsFromIndexedDB, getStorageUsageEstimate } from '../project/ProjectSaver';
import { useUpdateChecker } from './UpdateNotification';
import { getLocalStorageSizeKB, runQuickPerfCheck } from '../../utils/storagePerf';

// Kenyan colors
const KENYAN_GREEN = '#006644';

interface Settings {
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // in minutes
  language: string;
}

const DEFAULT_SETTINGS: Settings = {
  autoSaveEnabled: true,
  autoSaveInterval: 5,
  language: 'English',
};

const SettingsModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.ui.isSettingsModalOpen);
  const setIsSettingsModalOpen = useAppStore((state) => state.setIsSettingsModalOpen);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 390);
  const [availableHeight, setAvailableHeight] = useState(typeof window !== 'undefined' ? window.innerHeight - 64 - 40 : 600); // header (4rem) + margins
  const [mounted, setMounted] = useState(false);
  
  // Storage management state
  const [storageUsage, setStorageUsage] = useState<{ used: number; quota: number } | null>(null);
  const [localStorageKB, setLocalStorageKB] = useState<number>(0);
  const [perfCheckMs, setPerfCheckMs] = useState<number | null>(null);
  const [isClearingAutosave, setIsClearingAutosave] = useState(false);
  const [isClearingProjects, setIsClearingProjects] = useState(false);
  
  // Mount check for portal safety
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Update desktop state and available height on resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setIsDesktop(window.innerWidth >= 768);
      setIsMobile(window.innerWidth < 768);
      setAvailableHeight(window.innerHeight - (window.innerWidth < 768 ? 20 : 64) - 40);
    };
    
    // Set initial values
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (e) {
        }
      }
      getStorageUsageEstimate().then(setStorageUsage);
      setLocalStorageKB(getLocalStorageSizeKB());
      setPerfCheckMs(null);
    }
  }, [isOpen]);

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Clear autosave data handler
  const handleClearAutosave = async () => {
    if (!confirm('This will clear your auto-saved session data. Continue?')) return;
    setIsClearingAutosave(true);
    try {
      clearAutoSaveData();
      const usage = await getStorageUsageEstimate();
      setStorageUsage(usage);
      setLocalStorageKB(getLocalStorageSizeKB());
    } finally {
      setIsClearingAutosave(false);
    }
  };

  // Clear all stored projects handler
  const handleClearAllProjects = async () => {
    if (!confirm('This will permanently delete ALL stored projects. This action cannot be undone. Continue?')) return;
    setIsClearingProjects(true);
    try {
      await clearAllProjectsFromIndexedDB();
      // Also clear recent projects list
      localStorage.removeItem('transcribe-pro-recent-projects');
      // Refresh storage estimate
      const usage = await getStorageUsageEstimate();
      setStorageUsage(usage);
      setLocalStorageKB(getLocalStorageSizeKB());
    } finally {
      setIsClearingProjects(false);
    }
  };

  const handleRunPerfCheck = () => {
    setPerfCheckMs(runQuickPerfCheck());
  };

  const handleChange = (key: keyof Settings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    setHasChanges(false);
    setIsSettingsModalOpen(false);
  };

  const handleCancel = () => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
    }
    setHasChanges(false);
    setIsSettingsModalOpen(false);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem('appSettings');
      setHasChanges(true);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  if (!isOpen || !mounted) return null;

  const isCompactMobile = isMobile && windowWidth <= 430;
  const isTinyMobile = isMobile && windowWidth <= 360;
  const modalPadding = isTinyMobile ? '0.7rem' : isCompactMobile ? '0.85rem' : isMobile ? '1rem' : '1.5rem';
  const cardPadding = isTinyMobile ? '0.6rem' : isCompactMobile ? '0.7rem' : '0.75rem';
  const contentGap = isTinyMobile ? '0.9rem' : isMobile ? '1rem' : '1.25rem';
  const headerTitleSize = isTinyMobile ? '1.1rem' : isCompactMobile ? '1.2rem' : isMobile ? '1.35rem' : '1.75rem';
  const sectionTitleSize = isTinyMobile ? '0.88rem' : isMobile ? '0.92rem' : '0.95rem';
  const bodyFontSize = isTinyMobile ? '0.78rem' : isCompactMobile ? '0.82rem' : '0.85rem';
  const actionButtonMinHeight = isTinyMobile ? '42px' : '46px';
  const sectionSurface = {
    padding: cardPadding,
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: isTinyMobile ? '9px' : '10px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  } as const;
  const ghostButtonSurface = {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: isTinyMobile ? '9px' : '10px',
    color: '#ffffff',
    fontSize: bodyFontSize,
    fontWeight: '500',
    transition: 'all 0.2s ease',
  } as const;

  const modalContent = (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: isTinyMobile ? '6px' : isCompactMobile ? '10px' : isMobile ? '12px' : '20px',
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="modal-content"
        style={{
          background: 'rgba(26, 26, 26, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: isMobile ? (isTinyMobile ? '18px 18px 14px 14px' : '22px 22px 16px 16px') : '20px',
          padding: modalPadding,
          minWidth: isMobile ? 'auto' : '700px',
          maxWidth: isMobile ? 'min(100%, 560px)' : '900px',
          width: isMobile ? '100%' : '85vw',
          height: isMobile ? 'auto' : `${availableHeight}px`,
          maxHeight: isMobile ? `min(calc(100dvh - ${isTinyMobile ? 8 : 12}px), 760px)` : `${availableHeight}px`,
          overflowY: 'auto',
          zIndex: 1000000,
          overflowX: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: isMobile ? `calc(${modalPadding} + env(safe-area-inset-bottom, 0px))` : modalPadding,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleCancel}
          style={{
            position: 'absolute',
            top: isTinyMobile ? '0.7rem' : '0.85rem',
            right: isTinyMobile ? '0.7rem' : '0.85rem',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: isTinyMobile ? '34px' : '36px',
            height: isTinyMobile ? '34px' : '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#ffffff',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ×
        </button>

        {/* Scrollable Content Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: isMobile ? 0 : '0.5rem',
          minHeight: 0,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: isMobile ? '0.9rem' : '1rem', paddingBottom: '0.75rem', paddingRight: isMobile ? '2.4rem' : '2.8rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <h2
              style={{
                color: '#ffffff',
                fontSize: headerTitleSize,
                fontWeight: '600',
                margin: 0,
                fontFamily: "'Merienda', 'Caveat', cursive",
                lineHeight: 1.1,
              }}
            >
              ⚙️ Settings
            </h2>
          </div>

          {/* Main Content Grid - Horizontal Layout for Desktop */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
            gap: isMobile ? contentGap : '1.5rem',
            marginBottom: isMobile ? '1rem' : '1.5rem',
          }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: contentGap }}>
            {/* Theme (Light / Dark) */}
            <div>
              <h3
                style={{
                  color: '#ffffff',
                  fontSize: sectionTitleSize,
                  fontWeight: '500',
                  marginBottom: isMobile ? '0.6rem' : '0.75rem',
                  fontFamily: "'Merienda', 'Caveat', cursive",
                }}
              >
                Theme
              </h3>
              <div
                style={{
                  display: 'flex',
                  flexDirection: isTinyMobile ? 'column' : 'row',
                  alignItems: 'stretch',
                  gap: isTinyMobile ? '0.55rem' : '0.75rem',
                  ...sectionSurface,
                }}
              >
                <button
                  onClick={() => setTheme('light')}
                  style={{
                    flex: 1,
                    minHeight: actionButtonMinHeight,
                    padding: isTinyMobile ? '0.55rem 0.7rem' : '0.65rem 0.8rem',
                    borderRadius: '8px',
                    border: theme === 'light' ? '2px solid #006644' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: theme === 'light' ? 'rgba(0, 102, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: bodyFontSize,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  ☀️ Light
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  style={{
                    flex: 1,
                    minHeight: actionButtonMinHeight,
                    padding: isTinyMobile ? '0.55rem 0.7rem' : '0.65rem 0.8rem',
                    borderRadius: '8px',
                    border: theme === 'dark' ? '2px solid #006644' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: theme === 'dark' ? 'rgba(0, 102, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: bodyFontSize,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  🌙 Dark
                </button>
              </div>
            </div>

            {/* Auto-Save Settings */}
            <div>
              <h3
                style={{
                  color: '#ffffff',
                  fontSize: sectionTitleSize,
                  fontWeight: '500',
                  marginBottom: isMobile ? '0.6rem' : '0.75rem',
                  fontFamily: "'Merienda', 'Caveat', cursive",
                }}
              >
                Auto-Save
              </h3>
              
              {/* Enable/Disable Toggle */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: isTinyMobile ? 'column' : 'row',
                  alignItems: isTinyMobile ? 'stretch' : 'center',
                  justifyContent: 'space-between',
                  gap: isTinyMobile ? '0.65rem' : '0.75rem',
                  marginBottom: isMobile ? '0.6rem' : '0.75rem',
                  ...sectionSurface,
                }}
              >
                <label
                  style={{
                    color: '#ffffff',
                    fontSize: bodyFontSize,
                    cursor: 'pointer',
                  }}
                >
                  Enable Auto-Save
                </label>
                <button
                  onClick={() => handleChange('autoSaveEnabled', !settings.autoSaveEnabled)}
                  style={{
                    width: '48px',
                    height: '24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: settings.autoSaveEnabled ? '#006644' : 'rgba(255, 255, 255, 0.2)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: settings.autoSaveEnabled
                      ? 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.05)'
                      : 'inset -2px -2px 4px rgba(0, 0, 0, 0.3), inset 2px 2px 4px rgba(255, 255, 255, 0.05)',
                    alignSelf: isTinyMobile ? 'flex-end' : 'center',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      position: 'absolute',
                      top: '2px',
                      left: settings.autoSaveEnabled ? '26px' : '2px',
                      transition: 'left 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    }}
                  />
                </button>
              </div>

              {/* Interval Input */}
              {settings.autoSaveEnabled && (
                <div
                  style={{
                    ...sectionSurface,
                  }}
                >
                  <label
                    style={{
                      display: 'block',
                      color: '#ffffff',
                      fontSize: bodyFontSize,
                      marginBottom: '0.4rem',
                    }}
                  >
                    Auto-Save Interval (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.autoSaveInterval}
                    onChange={(e) => handleChange('autoSaveInterval', parseInt(e.target.value) || 1)}
                    style={{
                      width: '100%',
                      minHeight: actionButtonMinHeight,
                      padding: isTinyMobile ? '0.55rem 0.65rem' : '0.6rem 0.7rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: bodyFontSize,
                      boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.02)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Language Settings */}
            <div>
              <h3
                style={{
                  color: '#ffffff',
                  fontSize: sectionTitleSize,
                  fontWeight: '500',
                  marginBottom: isMobile ? '0.6rem' : '0.75rem',
                  fontFamily: "'Merienda', 'Caveat', cursive",
                }}
              >
                Language
              </h3>
              <select
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value)}
                style={{
                  width: '100%',
                  minHeight: actionButtonMinHeight,
                  padding: isTinyMobile ? '0.55rem 0.65rem' : '0.65rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: bodyFontSize,
                  cursor: 'pointer',
                  boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.02)',
                  boxSizing: 'border-box',
                }}
              >
                <option value="English">English</option>
              </select>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: contentGap }}>
            {/* Keyboard Shortcuts - Hidden on mobile/tablet devices */}
            {isDesktop && (
            <div>
              <h3
                style={{
                  color: '#ffffff',
                  fontSize: sectionTitleSize,
                  fontWeight: '500',
                  marginBottom: isMobile ? '0.6rem' : '0.75rem',
                  fontFamily: "'Merienda', 'Caveat', cursive",
                }}
              >
                Keyboard Shortcuts
              </h3>
              <div
                style={{
                  ...sectionSurface,
                }}
              >
            {[
              { key: 'Space', desc: 'Play/Pause' },
              { key: 'N', desc: 'Add Marker' },
              { key: 'M', desc: 'Mute / Unmute' },
              { key: 'L', desc: 'Toggle active marker loop' },
              { key: 'Ctrl+Z', desc: 'Undo' },
              { key: 'Ctrl+Y', desc: 'Redo' },
              { key: 'Ctrl+S', desc: 'Save Project' },
              { key: 'Ctrl+O', desc: 'Open Project' },
              { key: 'Left/Right or A/D', desc: 'Navigate markers' },
              { key: '↑/↓', desc: 'Volume' },
            ].map((shortcut, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.4rem 0',
                  borderBottom: idx < 9 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                }}
              >
                <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
                  {shortcut.desc}
                </span>
                <kbd
                  style={{
                    padding: '0.2rem 0.4rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontFamily: 'monospace',
                    boxShadow: 'inset 1px 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {shortcut.key}
                </kbd>
              </div>
            ))}
              </div>
            </div>
            )}

            {/* About & Updates Section */}
            <AboutAndUpdates isMobile={isMobile} isCompactMobile={isCompactMobile} isTinyMobile={isTinyMobile} sectionTitleSize={sectionTitleSize} bodyFontSize={bodyFontSize} cardPadding={cardPadding} actionButtonMinHeight={actionButtonMinHeight} />

            {/* Storage Section */}
            <div>
              <h3
                style={{
                  color: '#ffffff',
                  fontSize: sectionTitleSize,
                  fontWeight: '500',
                  marginBottom: isMobile ? '0.6rem' : '0.75rem',
                  fontFamily: "'Merienda', 'Caveat', cursive",
                }}
              >
                Storage
              </h3>
              <div
                style={{
                  ...sectionSurface,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isMobile ? '0.65rem' : '0.75rem',
                }}
              >
                {/* localStorage size */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: bodyFontSize }}>localStorage:</span>
                  <span style={{ color: '#ffffff', fontSize: bodyFontSize, fontWeight: '500' }}>{localStorageKB} KB</span>
                </div>

                {/* Storage Usage (quota/usage when available) */}
                {storageUsage && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: bodyFontSize }}>Used:</span>
                      <span style={{ color: '#ffffff', fontSize: bodyFontSize, fontWeight: '500' }}>
                        {formatBytes(storageUsage.used)} / {formatBytes(storageUsage.quota)}
                      </span>
                    </div>
                    <div style={{
                      height: '6px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min((storageUsage.used / storageUsage.quota) * 100, 100)}%`,
                        background: storageUsage.used / storageUsage.quota > 0.8 ? '#DE2910' : '#006644',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                )}

                {/* Performance check (quick feedback after optimizations) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleRunPerfCheck}
                    style={{
                      minHeight: actionButtonMinHeight,
                      padding: isTinyMobile ? '0.45rem 0.6rem' : '0.5rem 0.7rem',
                      ...ghostButtonSurface,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      width: isTinyMobile ? '100%' : 'auto',
                    }}
                  >
                    Run quick performance check
                  </button>
                  {perfCheckMs !== null && (
                    <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: bodyFontSize }}>
                      Result: {perfCheckMs} ms (lower is better)
                    </span>
                  )}
                </div>

                {/* Clear Auto-save Button */}
                <button
                  onClick={handleClearAutosave}
                  disabled={isClearingAutosave}
                  style={{
                    width: '100%',
                    minHeight: actionButtonMinHeight,
                    padding: isTinyMobile ? '0.55rem 0.65rem' : '0.6rem 0.75rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: bodyFontSize,
                    fontWeight: '500',
                    cursor: isClearingAutosave ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isClearingAutosave ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                  onMouseEnter={(e) => {
                    if (!isClearingAutosave) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                  {isClearingAutosave ? 'Clearing...' : 'Clear Auto-save Data'}
                </button>

                {/* Clear All Projects Button */}
                <button
                  onClick={handleClearAllProjects}
                  disabled={isClearingProjects}
                  style={{
                    width: '100%',
                    minHeight: actionButtonMinHeight,
                    padding: isTinyMobile ? '0.55rem 0.65rem' : '0.6rem 0.75rem',
                    background: 'rgba(220, 53, 69, 0.15)',
                    border: '1px solid rgba(220, 53, 69, 0.25)',
                    borderRadius: '8px',
                    color: '#ff6b7a',
                    fontSize: bodyFontSize,
                    fontWeight: '500',
                    cursor: isClearingProjects ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isClearingProjects ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                  onMouseEnter={(e) => {
                    if (!isClearingProjects) {
                      e.currentTarget.style.background = 'rgba(220, 53, 69, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(220, 53, 69, 0.15)';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                  </svg>
                  {isClearingProjects ? 'Clearing...' : 'Clear All Stored Projects'}
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Reset Button */}
        <div style={{ marginBottom: isMobile ? '0.85rem' : '1rem', flexShrink: 0 }}>
          <button
            onClick={handleReset}
            style={{
              width: '100%',
              minHeight: actionButtonMinHeight,
              padding: isTinyMobile ? '0.55rem 0.65rem' : '0.65rem 0.75rem',
              background: 'rgba(220, 53, 69, 0.2)',
              border: '1px solid rgba(220, 53, 69, 0.3)',
              borderRadius: '10px',
              color: '#ff6b7a',
              fontSize: bodyFontSize,
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(220, 53, 69, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(220, 53, 69, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Reset All Settings
          </button>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isTinyMobile ? '1fr' : isMobile ? 'repeat(2, minmax(0, 1fr))' : 'auto auto',
            gap: '0.75rem',
            justifyContent: isMobile ? 'stretch' : 'flex-end',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              minHeight: actionButtonMinHeight,
              padding: isTinyMobile ? '0.55rem 0.75rem' : '0.65rem 1rem',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: bodyFontSize,
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            style={{
              minHeight: actionButtonMinHeight,
              padding: isTinyMobile ? '0.55rem 0.75rem' : '0.65rem 1rem',
              background: hasChanges ? '#006644' : 'rgba(0, 102, 68, 0.3)',
              border: '1px solid rgba(0, 102, 68, 0.5)',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: bodyFontSize,
              fontWeight: '500',
              cursor: hasChanges ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              opacity: hasChanges ? 1 : 0.5,
              boxShadow: hasChanges ? '0 2px 8px rgba(0, 102, 68, 0.3)' : 'none',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              if (hasChanges) {
                e.currentTarget.style.background = '#008855';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (hasChanges) {
                e.currentTarget.style.background = '#006644';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// Separate component for About & Updates to use hooks
const AboutAndUpdates: React.FC<{
  isMobile: boolean;
  isCompactMobile: boolean;
  isTinyMobile: boolean;
  sectionTitleSize: string;
  bodyFontSize: string;
  cardPadding: string;
  actionButtonMinHeight: string;
}> = ({ isMobile, isCompactMobile, isTinyMobile, sectionTitleSize, bodyFontSize, cardPadding, actionButtonMinHeight }) => {
  const { currentVersion, isChecking, lastCheckResult, checkForUpdates, isElectron } = useUpdateChecker();
  const [appVersion, setAppVersion] = useState('1.0.0');

  // Get version from Electron if available, otherwise use package.json version
  useEffect(() => {
    if (isElectron && currentVersion) {
      setAppVersion(currentVersion);
    }
  }, [isElectron, currentVersion]);

  return (
    <div>
      <h3
        style={{
          color: '#ffffff',
          fontSize: sectionTitleSize,
          fontWeight: '500',
          marginBottom: isMobile ? '0.6rem' : '0.75rem',
          fontFamily: "'Merienda', 'Caveat', cursive",
        }}
      >
        About
      </h3>
      <div
        style={{
          padding: cardPadding,
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: isTinyMobile ? '9px' : '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '0.65rem' : '0.75rem',
        }}
      >
        {/* Version Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isTinyMobile ? 'flex-start' : 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: bodyFontSize }}>Version: </span>
            <span style={{ color: '#ffffff', fontSize: bodyFontSize, fontWeight: '500' }}>
              {appVersion}
            </span>
          </div>
          {lastCheckResult === 'up-to-date' && (
            <span style={{ fontSize: isCompactMobile ? '0.72rem' : '0.75rem', color: KENYAN_GREEN }}>
              Up to date
            </span>
          )}
          {lastCheckResult === 'available' && (
            <span style={{ fontSize: isCompactMobile ? '0.72rem' : '0.75rem', color: '#f59e0b' }}>
              Update available!
            </span>
          )}
        </div>

        {/* Check for Updates Button (Electron only) */}
        {isElectron && (
          <button
            onClick={checkForUpdates}
            disabled={isChecking}
            style={{
              width: '100%',
              minHeight: actionButtonMinHeight,
              padding: isTinyMobile ? '0.55rem 0.65rem' : '0.6rem 0.75rem',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: bodyFontSize,
              fontWeight: '500',
              cursor: isChecking ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isChecking ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
            onMouseEnter={(e) => {
              if (!isChecking) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            {isChecking ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                Checking...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Check for Updates
              </>
            )}
          </button>
        )}

        {/* Web version notice */}
        {!isElectron && (
          <p style={{ margin: 0, fontSize: isCompactMobile ? '0.72rem' : '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
            Web version always uses the latest release.
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SettingsModal;
