// MobileMenu.tsx - Collapsible Neumorphic Mobile Menu
// Simplified rod-shaped menu with essential quick actions

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/store';
import { useAudioEngine } from '../audio/useAudioEngine';
import { pickAudioFile, validateAudioFile } from '../audio/audioFilePicker';
import { getProjectSaver, StoredProject } from '../project/ProjectSaver';
import { getProjectLoader } from '../project/ProjectLoader';
import { showToast } from './Toast';
import { useSmoothViewport } from '../../hooks/useSmoothViewport';
import { onPitchStatus } from '../audio/HowlerAudioEngine';
import { MOBILE_MIN_ZOOM, getDefaultZoomLevel, getMaxZoomLevel } from '../../utils/defaultZoom';
import { isIOSDevice } from '../../utils/platform';

// Kenyan colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';
const PITCH_PRESETS = [-2, -1, 0, 1, 2] as const;
const PITCH_FINE_STEP = 0.1;

// PWA install prompt interface
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const MobileMenu: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 390);
  const [isIOS] = useState(() => isIOSDevice());
  const menuRef = useRef<HTMLDivElement>(null);

  // PWA Install state (for "Install App" menu item; global banner is in App)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  const isAudioLoaded = useAppStore((state) => state.audio.isLoaded);
  const zoomLevel = useAppStore((state) => state.ui.zoomLevel) ?? getDefaultZoomLevel();
  const duration = useAppStore((state) => state.audio.duration) || 0;
  const currentTime = useAppStore((state) => state.audio.currentTime) || 0;
  const undo = useAppStore((state) => state.undo);
  const redo = useAppStore((state) => state.redo);
  const canUndo = useAppStore((state) => state.undoHistory.length > 0);
  const canRedo = useAppStore((state) => state.redoHistory.length > 0);
  const setIsSettingsModalOpen = useAppStore((state) => state.setIsSettingsModalOpen);

  // Pitch and playback rate
  const pitch = useAppStore((state) => state.globalControls.pitch) || 0;
  const playbackRate = useAppStore((state) => state.globalControls.playbackRate) || 1;
  const isMuted = useAppStore((state) => state.globalControls.isMuted) || false;
  const toggleMute = useAppStore((state) => state.toggleMute);
  const volume = useAppStore((state) => state.globalControls.volume) ?? 6;
  const setVolumeStore = useAppStore((state) => state.setVolume);

  // Use audio engine's pitch and volume methods (same as desktop)
  const { loadFile, resumeAudioContext, setPitch: setAudioPitch, setVolume: setAudioVolume } = useAudioEngine();
  const { animateZoom } = useSmoothViewport();

  // Pitch processing status
  const [isPitchProcessing, setIsPitchProcessing] = useState(false);

  // My Projects (saved on device / IndexedDB)
  const [showMyProjectsModal, setShowMyProjectsModal] = useState(false);
  const [storedProjectsList, setStoredProjectsList] = useState<StoredProject[]>([]);
  const [loadingStoredId, setLoadingStoredId] = useState<string | null>(null);

  // Save to device modal (project name + option to download .tsproj file)
  const [showSaveToDeviceModal, setShowSaveToDeviceModal] = useState(false);
  const [saveToDeviceProjectName, setSaveToDeviceProjectName] = useState('');
  const [saveToDeviceBusy, setSaveToDeviceBusy] = useState(false);
  const [saveAsMode, setSaveAsMode] = useState(false); // true = Save As (new project), false = first-time save

  // Subscribe to pitch processing status (same as desktop)
  useEffect(() => {
    const unsubscribe = onPitchStatus((status) => {
      setIsPitchProcessing(status.isProcessing);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Neumorphic colors based on theme
  const neuBg = isLightMode ? '#e4ebf5' : '#1e1e1e';
  const shadowDark = isLightMode ? 'rgba(163, 177, 198, 0.6)' : 'rgba(0, 0, 0, 0.5)';
  const shadowLight = isLightMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(50, 50, 50, 0.3)';
  const textColor = isLightMode ? '#2d3748' : '#ffffff';

  const neuRaised = `3px 3px 6px ${shadowDark}, -2px -2px 4px ${shadowLight}`;
  const neuPressed = `inset 2px 2px 4px ${shadowDark}, inset -1px -1px 2px ${shadowLight}`;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isExpanded]);

  // PWA: keep prompt for "Install App" menu item only; global banner is in App (PWAInstallBanner)
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsAppInstalled(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      showToast('App installed successfully!', 'success');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Handle PWA install (used by "Install App" menu item)
  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      showToast('Install not available - try from browser menu', 'info');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        showToast('Installing app...', 'success');
      }

      setDeferredPrompt(null);
    } catch (err) {
      showToast('Install failed', 'error');
    }
  };

  // Zoom handlers - minimum zoom is 5 (1/5 = 20% view)
  const MIN_ZOOM = MOBILE_MIN_ZOOM; // Shows 1/5 (20%) of the audio at minimum
  const MAX_ZOOM = getMaxZoomLevel(windowWidth);

  const handleZoomIn = () => {
    if (!isAudioLoaded || !duration) return;
    const currentZoom = typeof zoomLevel === 'number' && !isNaN(zoomLevel) ? zoomLevel : MIN_ZOOM;
    const newZoom = Math.min(currentZoom * 1.5, MAX_ZOOM);
    animateZoom(newZoom, currentTime, { duration: 300, easing: 'easeOutCubic' });
  };

  const handleZoomOut = () => {
    if (!isAudioLoaded || !duration) return;
    const currentZoom = typeof zoomLevel === 'number' && !isNaN(zoomLevel) ? zoomLevel : MIN_ZOOM;
    const newZoom = Math.max(currentZoom / 1.5, MIN_ZOOM);
    animateZoom(newZoom, currentTime, { duration: 300, easing: 'easeOutCubic' });
  };

  const handleZoomReset = () => {
    if (!isAudioLoaded || !duration) return;
    animateZoom(MIN_ZOOM, undefined, { duration: 300, easing: 'easeOutCubic' });
  };

  // Pitch handlers - direct semitone jumps for faster mobile access
  const handlePitchPreset = (targetPitch: number) => {
    if (!isAudioLoaded || isPitchProcessing) return;
    const clampedPitch = Math.max(-2, Math.min(2, Math.round(targetPitch * 100) / 100));
    setAudioPitch(clampedPitch);
  };

  const handlePitchStep = (delta: number) => {
    if (!isAudioLoaded || isPitchProcessing) return;
    const nextPitch = Math.max(-2, Math.min(2, Math.round((pitch + delta) * 100) / 100));
    setAudioPitch(nextPitch);
  };

  // Mute toggle handler
  const handleToggleMute = () => {
    if (!isAudioLoaded) return;
    toggleMute();
  };

  // Volume: -60 to +6 dB. Slider 0-100 maps to -60..6
  const volumePercent = Math.round(((volume + 60) / 66) * 100);
  const handleVolumeChange = (newDb: number) => {
    const clamped = Math.max(-60, Math.min(6, newDb));
    setVolumeStore(clamped);
    setAudioVolume?.(clamped);
  };
  const handleVolumeSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = Number(e.target.value);
    const db = (pct / 100) * 66 - 60;
    handleVolumeChange(db);
  };
  const handleVolumeStep = (step: number) => {
    handleVolumeChange(volume + step);
  };

  const formatPitchDisplay = (value: number): string => {
    if (Math.abs(value) < 0.005) return '0 st';
    const formatted = Math.abs(value % 1) < 0.005 ? value.toFixed(0) : value.toFixed(1);
    const sign = value > 0 ? '+' : '';
    return `${sign}${formatted} st`;
  };

  const formatPitchPresetLabel = (value: number): string => {
    if (value === 0) return '0';
    return value > 0 ? `+${value}` : `${value}`;
  };

  const handleNewProject = async () => {
    try {
      const store = useAppStore.getState();
      store.resetProject();
      store.setPitch(0);
      store.setVolume(6);
      store.setPlaybackRate(1);
      if (store.globalControls.isMuted) store.toggleMute();
      // Start with default zoom for current device class
      store.setZoomLevel(getDefaultZoomLevel());
      getProjectSaver().setCurrentProjectId(null);

      const file = await pickAudioFile();
      if (!file) return;

      const validation = validateAudioFile(file);
      if (!validation.valid) {
        showToast(validation.error || 'Invalid file', 'error');
        return;
      }

      await resumeAudioContext();
      await loadFile(file);
      setIsExpanded(false);
      showToast('Audio loaded', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load', 'error');
    }
  };

  const handleLoadProject = async () => {
    try {
      if (isIOS) {
        setIsExpanded(false);
        showToast('Use My Projects on iPhone and iPad to open saved work.', 'info');
        return;
      }

      await resumeAudioContext();
      const loader = getProjectLoader();
      // On phones: hint to select .tsproj (picker cannot open Downloads by default on web)
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        showToast('Select a .tsproj file (e.g. from Downloads or Files)', 'info', 4000);
      }
      const loaded = await loader.loadProject(loadFile);
      if (loaded) {
        setIsExpanded(false);
        showToast('Project loaded', 'success');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load', 'error');
    }
  };

  const handleOpenSaveToDeviceModal = (asSaveAs: boolean = false) => {
    const saver = getProjectSaver();
    const current = saver.getCurrentProjectName();
    setSaveToDeviceProjectName(current === 'Untitled Project' ? '' : current);
    setSaveAsMode(asSaveAs);
    setShowSaveToDeviceModal(true);
  };

  const sanitizeFileName = (name: string): string => {
    return name.replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() || 'project';
  };

  const handleSaveToAppStorage = async () => {
    const name = saveToDeviceProjectName.trim() || 'Untitled Project';
    setSaveToDeviceBusy(true);
    try {
      const saver = getProjectSaver();
      if (saveAsMode) {
        saver.setCurrentProjectId(null);
      }
      const result = await saver.saveToDevice(name);
      if (result.success) {
        showToast(saveAsMode ? 'Saved as new project' : 'Saved! Open from Menu â†’ My Projects', 'success');
        setShowSaveToDeviceModal(false);
        setSaveAsMode(false);
        setIsExpanded(false);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaveToDeviceBusy(false);
    }
  };

  const handleDownloadTsprojFile = async () => {
    const baseName = saveToDeviceProjectName.trim() || 'Untitled Project';
    const fileName = `${sanitizeFileName(baseName)}.tsproj`;
    setSaveToDeviceBusy(true);
    try {
      const saver = getProjectSaver();
      const success = await saver.exportProject(fileName);
      if (success) {
        showToast('File saved. Check Downloads or shared location.', 'success');
        setShowSaveToDeviceModal(false);
        setIsExpanded(false);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to download', 'error');
    } finally {
      setSaveToDeviceBusy(false);
    }
  };

  /** Save: update current project in place if already saved; else open modal (first time) */
  const handleSave = async () => {
    const saver = getProjectSaver();
    if (saver.getCurrentProjectId()) {
      try {
        const result = await saver.saveToDevice();
        if (result.success) {
          showToast('Project saved', 'success');
          setIsExpanded(false);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
      }
      return;
    }
    handleOpenSaveToDeviceModal();
  };

  /** Save As: always open modal to save with a new name or as file */
  const handleSaveAs = () => {
    handleOpenSaveToDeviceModal(true);
  };

  const handleOpenMyProjects = async () => {
    try {
      const saver = getProjectSaver();
      const list = await saver.getStoredProjects();
      setStoredProjectsList(list);
      setShowMyProjectsModal(true);
    } catch (err) {
      showToast('Could not load saved projects', 'error');
    }
  };

  const handleLoadStoredProject = async (project: StoredProject) => {
    if (loadingStoredId) return;
    try {
      setLoadingStoredId(project.id);
      await resumeAudioContext();
      const saver = getProjectSaver();
      const loader = getProjectLoader();
      saver.setCurrentProjectId(project.id);
      saver.setCurrentProjectName(project.name);
      const ok = await loader.loadFromStoredProject(project.projectData, loadFile);
      setShowMyProjectsModal(false);
      setIsExpanded(false);
      if (ok) showToast('Project loaded', 'success');
      else showToast('Failed to load project', 'error');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load', 'error');
    } finally {
      setLoadingStoredId(null);
    }
  };

  const formatStoredDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const handleExportProject = async () => {
    try {
      const saver = getProjectSaver();
      const success = await saver.exportProject();
      if (success) {
        setIsExpanded(false);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to export', 'error');
    }
  };

  // Get safe zoom display value - show as multiplier (e.g., "5x" means 5x zoom, showing 20% of audio)
  const safeZoom = typeof zoomLevel === 'number' && !isNaN(zoomLevel) && isFinite(zoomLevel) ? zoomLevel : MIN_ZOOM;
  // Format as multiplier for clarity (matches desktop behavior)
  const zoomDisplay = safeZoom >= 10 ? `${Math.round(safeZoom)}x` : `${safeZoom.toFixed(1)}x`;

  const isCompactMobile = windowWidth <= 420;
  const edgeInset = isCompactMobile ? '4px' : '6px';
  const safeMenuTop = `calc(env(safe-area-inset-top, 0px) + ${edgeInset})`;
  const safeMenuLeft = `calc(env(safe-area-inset-left, 0px) + ${edgeInset})`;
  const safeMenuRight = `calc(env(safe-area-inset-right, 0px) + ${edgeInset})`;
  const menuGap = isCompactMobile ? '4px' : '8px';
  const menuButtonSize = isCompactMobile ? '38px' : '42px';
  const menuButtonMinSize = isCompactMobile ? '36px' : '38px';
  const menuIconSize = isCompactMobile ? 18 : 20;
  const hamburgerButtonSize = isCompactMobile ? '42px' : '46px';
  const menuBarPadding = isCompactMobile ? '8px 8px' : '10px 12px';
  const menuBarMinHeight = isCompactMobile ? '56px' : '62px';
  const expandedPanelPadding = isCompactMobile ? '12px' : '16px';
  const expandedPanelMaxHeight = isCompactMobile
    ? 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 74px)'
    : 'min(72vh, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 78px))';
  const sectionLabelFontSize = isCompactMobile ? '11px' : '12px';
  const controlRowPadding = isCompactMobile ? '8px 10px' : '10px 14px';
  const controlLabelFontSize = isCompactMobile ? '0.82rem' : '0.9rem';
  const controlValueFontSize = isCompactMobile ? '0.76rem' : '0.84rem';

  // Compact button style sized to fit narrow phone screens without clipping the menu bar.
  const btnStyle = (isActive: boolean = false, isDisabled: boolean = false) => ({
    width: menuButtonSize,
    height: menuButtonSize,
    minWidth: menuButtonMinSize,
    minHeight: menuButtonMinSize,
    borderRadius: '9px',
    border: 'none',
    background: neuBg,
    boxShadow: isActive ? neuPressed : neuRaised,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.4 : 1,
    color: textColor,
    touchAction: 'manipulation' as const,
    padding: 0,
  });

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: safeMenuTop,
        left: safeMenuLeft,
        right: safeMenuRight,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: menuGap,
      }}
    >
      {/* Main Menu Bar - Taller with Zoom + Save; Settings/Theme in dropdown/Settings modal */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: menuGap,
        padding: menuBarPadding,
        background: neuBg,
        borderRadius: '12px',
        boxShadow: neuRaised,
        minHeight: menuBarMinHeight,
      }}>
        {/* Left: Hamburger */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            ...btnStyle(isExpanded),
            width: hamburgerButtonSize,
            height: hamburgerButtonSize,
            minWidth: hamburgerButtonSize,
            minHeight: hamburgerButtonSize,
          }}
        >
          <svg width={menuIconSize} height={menuIconSize} viewBox="0 0 24 24" fill="none" stroke={isExpanded ? KENYAN_GREEN : textColor} strokeWidth="2.5" strokeLinecap="round">
            {isExpanded ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </>
            )}
          </svg>
        </button>

        {/* Center: Undo, Redo, Zoom, Save */}
        <div style={{ display: 'flex', gap: menuGap, alignItems: 'center', flex: 1, justifyContent: 'space-between', minWidth: 0 }}>
          {/* Undo */}
          <button
            onClick={() => canUndo && undo()}
            disabled={!canUndo}
            style={btnStyle(false, !canUndo)}
            title="Undo"
          >
            <svg width={menuIconSize} height={menuIconSize} viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/>
            </svg>
          </button>

          {/* Redo */}
          <button
            onClick={() => canRedo && redo()}
            disabled={!canRedo}
            style={btnStyle(false, !canRedo)}
            title="Redo"
          >
            <svg width={menuIconSize} height={menuIconSize} viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966a.25.25 0 0 1 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
          </button>

          {/* Zoom out */}
          <button
            onClick={handleZoomOut}
            disabled={!isAudioLoaded || zoomLevel <= MIN_ZOOM}
            style={btnStyle(false, !isAudioLoaded || zoomLevel <= MIN_ZOOM)}
            title="Zoom out"
          >
            <svg width={menuIconSize} height={menuIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Zoom display - tappable to reset */}
          <button
            onClick={handleZoomReset}
            disabled={!isAudioLoaded}
            style={{
              ...btnStyle(false, !isAudioLoaded),
              minWidth: 'clamp(44px, 12vw, 52px)',
              fontSize: 'clamp(11px, 3.2vw, 13px)',
              fontWeight: 700,
              color: KENYAN_GREEN,
            }}
            title="Reset zoom"
          >
            {zoomDisplay}
          </button>

          {/* Zoom in */}
          <button
            onClick={handleZoomIn}
            disabled={!isAudioLoaded || zoomLevel >= MAX_ZOOM}
            style={btnStyle(false, !isAudioLoaded || zoomLevel >= MAX_ZOOM)}
            title="Zoom in"
          >
            <svg width={menuIconSize} height={menuIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!isAudioLoaded}
            style={btnStyle(false, !isAudioLoaded)}
            title="Save project"
          >
            <svg width={menuIconSize} height={menuIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Menu Panel */}
      {isExpanded && (
        <div style={{
          background: neuBg,
          borderRadius: '12px',
          boxShadow: neuRaised,
          padding: expandedPanelPadding,
          maxHeight: expandedPanelMaxHeight,
          overflowY: 'auto',
          overflowX: 'hidden',
          animation: 'slideDown 0.15s ease-out',
        }}>
          {/* File Section */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: sectionLabelFontSize,
              fontWeight: 700,
              color: KENYAN_GREEN,
              padding: '4px 12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              File
            </div>

            <MenuItem icon={<NewFileIcon />} label="New Project" onClick={handleNewProject} color={KENYAN_GREEN} />
            {!isIOS && <MenuItem icon={<FolderIcon />} label="Load Project" onClick={handleLoadProject} color={KENYAN_RED} />}
            <MenuItem icon={<FolderIcon />} label="My Projects" onClick={handleOpenMyProjects} color={KENYAN_GREEN} subtitle="Saved on this device" />
            <MenuItem icon={<SaveIcon />} label="Save As" onClick={handleSaveAs} disabled={!isAudioLoaded} color={KENYAN_GREEN} subtitle="New name or download file" />
            <MenuItem icon={<ExportIcon />} label="Export/Share" onClick={handleExportProject} disabled={!isAudioLoaded} subtitle="Download .tsproj file" />
          </div>

          {/* Settings Section */}
          <Divider isLightMode={isLightMode} />
          <div style={{ marginBottom: '4px' }}>
            <MenuItem icon={<SettingsGearIcon />} label="Settings" onClick={() => { setIsSettingsModalOpen(true); setIsExpanded(false); }} color={KENYAN_GREEN} subtitle="Theme, storage & more" />
          </div>

          {/* Audio Controls - Pitch, Volume, Mute */}
          <Divider isLightMode={isLightMode} />
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: sectionLabelFontSize,
              fontWeight: 700,
              color: KENYAN_GREEN,
              padding: '4px 12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Audio
            </div>

            {/* Pitch Control - responsive fine adjust row plus preset grid */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              padding: controlRowPadding,
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: controlLabelFontSize, color: textColor, fontWeight: 500 }}>Pitch</span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `${menuButtonSize} minmax(0, 1fr) ${menuButtonSize}`,
                gap: '8px',
                alignItems: 'center',
                width: '100%',
              }}>
                <button
                  onClick={() => handlePitchStep(-PITCH_FINE_STEP)}
                  disabled={!isAudioLoaded || isPitchProcessing || pitch <= -2}
                  style={{
                    ...btnStyle(false, !isAudioLoaded || isPitchProcessing || pitch <= -2),
                    width: menuButtonSize,
                    minWidth: menuButtonMinSize,
                    color: KENYAN_RED,
                    border: `1px solid ${KENYAN_RED}33`,
                  }}
                  title="Decrease pitch by 0.1 st"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14" />
                    <path d="M19 12l-7 7-7-7" />
                  </svg>
                </button>
                <div style={{
                  minWidth: 0,
                  minHeight: menuButtonSize,
                  borderRadius: '10px',
                  background: isLightMode
                    ? `linear-gradient(135deg, ${pitch !== 0 ? (pitch > 0 ? KENYAN_GREEN : KENYAN_RED) : '#1a1a1a'}15, rgba(255, 255, 255, 0.65))`
                    : `linear-gradient(135deg, ${pitch !== 0 ? (pitch > 0 ? KENYAN_GREEN : KENYAN_RED) : '#ffffff'}18, rgba(255, 255, 255, 0.05))`,
                  border: `1px solid ${pitch !== 0 ? (pitch > 0 ? `${KENYAN_GREEN}33` : `${KENYAN_RED}33`) : (isLightMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)')}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 10px',
                }}>
                  <span style={{
                    fontSize: controlLabelFontSize,
                    fontWeight: 700,
                    color: pitch !== 0 ? (pitch > 0 ? KENYAN_GREEN : KENYAN_RED) : textColor,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}>
                    {isPitchProcessing ? '...' : formatPitchDisplay(pitch)}
                  </span>
                </div>
                <button
                  onClick={() => handlePitchStep(PITCH_FINE_STEP)}
                  disabled={!isAudioLoaded || isPitchProcessing || pitch >= 2}
                  style={{
                    ...btnStyle(false, !isAudioLoaded || isPitchProcessing || pitch >= 2),
                    width: menuButtonSize,
                    minWidth: menuButtonMinSize,
                    color: KENYAN_GREEN,
                    border: `1px solid ${KENYAN_GREEN}33`,
                  }}
                  title="Increase pitch by 0.1 st"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5" />
                    <path d="M5 12l7-7 7 7" />
                  </svg>
                </button>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(44px, 1fr))',
                gap: '6px',
                width: '100%',
              }}>
                {PITCH_PRESETS.map((preset) => {
                  const isActivePreset = Math.abs(pitch - preset) < 0.005;
                  const presetColor = preset === 0 ? textColor : preset > 0 ? KENYAN_GREEN : KENYAN_RED;
                  return (
                    <button
                      key={preset}
                      onClick={() => handlePitchPreset(preset)}
                      disabled={!isAudioLoaded || isPitchProcessing}
                      style={{
                        ...btnStyle(isActivePreset, !isAudioLoaded || isPitchProcessing),
                        width: '100%',
                        minWidth: 0,
                        padding: 0,
                        fontSize: controlValueFontSize,
                        fontWeight: 700,
                        color: isActivePreset ? '#FFFFFF' : presetColor,
                        background: isActivePreset ? presetColor : neuBg,
                        border: `1px solid ${isActivePreset ? presetColor : `${presetColor}33`}`,
                      }}
                      title={`Set pitch to ${formatPitchDisplay(preset)}`}
                    >
                      {formatPitchPresetLabel(preset)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Volume Control - Slider + Up/Down */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: controlRowPadding,
              gap: '10px',
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: controlLabelFontSize, color: textColor, fontWeight: 500 }}>Volume</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                <button
                  type="button"
                  onClick={() => handleVolumeStep(-7)}
                  disabled={!isAudioLoaded || volume <= -60}
                  style={btnStyle(false, !isAudioLoaded || volume <= -60)}
                  title="Decrease volume"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14" /><path d="M19 12l-7 7-7-7" />
                  </svg>
                </button>
                <input
                  type="range"
                  className="volume-slider"
                  min={0}
                  max={100}
                  value={volumePercent}
                  onChange={handleVolumeSlider}
                  disabled={!isAudioLoaded}
                  style={{
                    flex: 1,
                    minWidth: 80,
                    height: '8px',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    background: 'transparent',
                    cursor: isAudioLoaded ? 'pointer' : 'not-allowed',
                    opacity: isAudioLoaded ? 1 : 0.5,
                    '--volume-percent': `${volumePercent}%`,
                    '--volume-filled': KENYAN_GREEN,
                    '--volume-track': isLightMode ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)',
                  } as React.CSSProperties}
                />
                <button
                  type="button"
                  onClick={() => handleVolumeStep(7)}
                  disabled={!isAudioLoaded || volume >= 6}
                  style={btnStyle(false, !isAudioLoaded || volume >= 6)}
                  title="Increase volume"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 19V5" /><path d="M5 12l7-7 7 7" />
                  </svg>
                </button>
                <span style={{ fontSize: controlValueFontSize, fontWeight: 600, minWidth: 36, color: textColor }}>
                  {volumePercent}%
                </span>
              </div>
            </div>

            {/* Mute/Unmute Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: controlRowPadding,
              gap: '10px',
            }}>
              <span style={{ fontSize: controlLabelFontSize, color: textColor, fontWeight: 500 }}>Sound</span>
              <button
                onClick={handleToggleMute}
                disabled={!isAudioLoaded}
                style={{
                  ...btnStyle(isMuted, !isAudioLoaded),
                  width: 'auto',
                  padding: '0 12px',
                  height: menuButtonSize,
                  background: isMuted ? KENYAN_RED : neuBg,
                  color: isMuted ? 'white' : textColor,
                  minWidth: '78px',
                  gap: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isMuted ? (
                  <>
                    <svg width={menuIconSize} height={menuIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <line x1="23" y1="9" x2="17" y2="15"/>
                      <line x1="17" y1="9" x2="23" y2="15"/>
                    </svg>
                    <span style={{ fontSize: controlValueFontSize, fontWeight: 600 }}>Muted</span>
                  </>
                ) : (
                  <>
                    <svg width={menuIconSize} height={menuIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    </svg>
                    <span style={{ fontSize: controlValueFontSize, fontWeight: 600 }}>On</span>
                  </>
                )}
              </button>
            </div>

            {/* Speed Display */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: controlRowPadding,
              gap: '10px',
            }}>
              <span style={{ fontSize: controlLabelFontSize, color: textColor, fontWeight: 500 }}>Speed</span>
              <span style={{
                fontSize: controlValueFontSize,
                fontWeight: 600,
                color: playbackRate !== 1 ? KENYAN_RED : textColor,
              }}>
                {playbackRate.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* Install App - Only show if installable and not already installed */}
          {!isAppInstalled && deferredPrompt && (
            <>
              <Divider isLightMode={isLightMode} />
              <MenuItem
                icon={<InstallIcon />}
                label="Install App"
                onClick={handleInstallApp}
                color={KENYAN_GREEN}
                subtitle="Add to home screen"
              />
            </>
          )}

          {/* About */}
          <Divider isLightMode={isLightMode} />
          <MenuItem
            icon={<InfoIcon />}
            label="About"
            onClick={() => {
              showToast('Transcription Pro v1.0 - Made in Kenya ðŸ‡°ðŸ‡ª', 'success');
              setIsExpanded(false);
            }}
          />

          {/* Close/Exit App - for PWA and mobile web */}
          <Divider isLightMode={isLightMode} />
          <MenuItem
            icon={<CloseIcon />}
            label="Close App"
            onClick={() => {
              // Try to close the window/tab
              if (window.close) {
                window.close();
              }
              // If window.close doesn't work (PWA), show instructions
              showToast('Swipe up from bottom or use your device\'s back button to close', 'info');
              setIsExpanded(false);
            }}
            color={KENYAN_RED}
            subtitle="Exit application"
          />
        </div>
      )}

      {/* My Projects modal - saved on device (IndexedDB) */}
      {showMyProjectsModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => !loadingStoredId && setShowMyProjectsModal(false)}
        >
          <div
            style={{
              background: neuBg,
              borderRadius: '16px',
              boxShadow: neuRaised,
              padding: '16px',
              width: '100%',
              maxWidth: '400px',
              maxHeight: '70vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '18px', fontWeight: 600, color: textColor }}>My Projects</span>
              <button
                onClick={() => !loadingStoredId && setShowMyProjectsModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '8px',
                  cursor: loadingStoredId ? 'wait' : 'pointer',
                  color: textColor,
                  opacity: 0.8,
                }}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {storedProjectsList.length === 0 ? (
                <p style={{ color: textColor, opacity: 0.7, fontSize: '14px', margin: '16px 0', textAlign: 'center' }}>
                  No projects saved on this device. Save a project with &quot;Save to Device&quot; to see it here.
                </p>
              ) : (
                storedProjectsList.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleLoadStoredProject(project)}
                    disabled={loadingStoredId !== null}
                    style={{
                      width: '100%',
                      padding: '12px',
                      marginBottom: '8px',
                      background: loadingStoredId === project.id ? (isLightMode ? 'rgba(0,102,68,0.12)' : 'rgba(0,102,68,0.2)') : 'transparent',
                      border: `1px solid ${isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: loadingStoredId ? 'wait' : 'pointer',
                      opacity: loadingStoredId && loadingStoredId !== project.id ? 0.5 : 1,
                      color: textColor,
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: project.thumbnailColor || KENYAN_GREEN,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {loadingStoredId === project.id ? (
                        <div style={{
                          width: '18px',
                          height: '18px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }} />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                          <path d="M9 18V5l12-2v13"/>
                          <circle cx="6" cy="18" r="3"/>
                          <circle cx="18" cy="16" r="3"/>
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.name}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>
                        {formatStoredDate(project.updatedAt)}
                        {project.audioFileName && ` Â· ${project.audioFileName.length > 18 ? project.audioFileName.slice(0, 18) + 'â€¦' : project.audioFileName}`}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save to device modal: project name + save to app / download .tsproj */}
      {showSaveToDeviceModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => !saveToDeviceBusy && setShowSaveToDeviceModal(false)}
        >
          <div
            style={{
              background: neuBg,
              borderRadius: '16px',
              boxShadow: neuRaised,
              padding: '20px',
              width: '100%',
              maxWidth: '360px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '18px', fontWeight: 600, color: textColor }}>Save project</span>
              <button
                onClick={() => !saveToDeviceBusy && setShowSaveToDeviceModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '8px',
                  cursor: saveToDeviceBusy ? 'wait' : 'pointer',
                  color: textColor,
                  opacity: 0.8,
                }}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>
                Project name
              </label>
              <input
                type="text"
                value={saveToDeviceProjectName}
                onChange={(e) => setSaveToDeviceProjectName(e.target.value)}
                placeholder="Untitled Project"
                disabled={saveToDeviceBusy}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '16px',
                  border: `1px solid ${isLightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: '10px',
                  background: isLightMode ? '#fff' : 'rgba(255,255,255,0.08)',
                  color: textColor,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleSaveToAppStorage}
                disabled={saveToDeviceBusy || !isAudioLoaded}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#fff',
                  background: KENYAN_GREEN,
                  border: 'none',
                  borderRadius: '12px',
                  cursor: saveToDeviceBusy || !isAudioLoaded ? 'not-allowed' : 'pointer',
                  opacity: saveToDeviceBusy || !isAudioLoaded ? 0.6 : 1,
                  touchAction: 'manipulation',
                }}
              >
                {saveToDeviceBusy ? 'Savingâ€¦' : 'Save to app storage'}
              </button>
              <button
                onClick={handleDownloadTsprojFile}
                disabled={saveToDeviceBusy || !isAudioLoaded}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: KENYAN_GREEN,
                  background: 'transparent',
                  border: `2px solid ${KENYAN_GREEN}`,
                  borderRadius: '12px',
                  cursor: saveToDeviceBusy || !isAudioLoaded ? 'not-allowed' : 'pointer',
                  opacity: saveToDeviceBusy || !isAudioLoaded ? 0.6 : 1,
                  touchAction: 'manipulation',
                }}
              >
                {saveToDeviceBusy ? 'Preparingâ€¦' : 'Download .tsproj file'}
              </button>
              <p style={{ fontSize: '12px', color: isLightMode ? '#666' : 'rgba(255,255,255,0.6)', margin: 0 }}>
                Download saves the file to your device (e.g. Downloads). You can then move or share it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PWA install is shown by App-level PWAInstallBanner (on every load, all browsers) */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Volume Slider - Track & Thumb */
        .volume-slider::-webkit-slider-runnable-track {
          height: 10px;
          border-radius: 5px;
          background: linear-gradient(to right, var(--volume-filled) 0%, var(--volume-filled) var(--volume-percent), var(--volume-track) var(--volume-percent), var(--volume-track) 100%);
          transition: background 0.15s ease;
        }
        .volume-slider::-moz-range-track {
          height: 10px;
          border-radius: 5px;
          background: linear-gradient(to right, var(--volume-filled) 0%, var(--volume-filled) var(--volume-percent), var(--volume-track) var(--volume-percent), var(--volume-track) 100%);
          transition: background 0.15s ease;
        }
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${KENYAN_GREEN}, ${KENYAN_GREEN}CC);
          cursor: pointer;
          border: 2px solid ${isLightMode ? '#FFFFFF' : '#1a1a1a'};
          box-shadow: 0 0 10px ${KENYAN_GREEN}80, 0 2px 6px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
          margin-top: -6px;
        }
        .volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.12);
          box-shadow: 0 0 15px ${KENYAN_GREEN}, 0 2px 8px rgba(0,0,0,0.4);
        }
        .volume-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${KENYAN_GREEN}, ${KENYAN_GREEN}CC);
          cursor: pointer;
          border: 2px solid ${isLightMode ? '#FFFFFF' : '#1a1a1a'};
          box-shadow: 0 0 10px ${KENYAN_GREEN}80, 0 2px 6px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        }
        .volume-slider:disabled::-webkit-slider-thumb {
          background: ${isLightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};
          box-shadow: none;
        }
        .volume-slider:disabled::-moz-range-thumb {
          background: ${isLightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};
          box-shadow: none;
        }
      `}</style>
    </div>
  );
};

// Helper Components
const MenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
  subtitle?: string;
}> = ({ icon, label, onClick, disabled, color, subtitle }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 14px',
      background: 'transparent',
      border: 'none',
      borderRadius: '10px',
      width: '100%',
      color: color || 'inherit',
      fontSize: 'clamp(0.88rem, 3.8vw, 1rem)',
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      touchAction: 'manipulation',
      textAlign: 'left',
      minHeight: '48px',
    }}
  >
    {icon}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <span>{label}</span>
      {subtitle && (
        <span style={{
          fontSize: 'clamp(0.72rem, 3vw, 0.82rem)',
          opacity: 0.6,
          fontWeight: 400,
          marginTop: '2px',
        }}>
          {subtitle}
        </span>
      )}
    </div>
  </button>
);

const Divider: React.FC<{ isLightMode: boolean }> = ({ isLightMode }) => (
  <div style={{
    height: '1px',
    background: isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
    margin: '4px 8px',
  }} />
);

// Icons sized to keep the dropdown compact on narrow phone screens.
const NewFileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
);

const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const SaveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

const ExportIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const InstallIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

/** Gear/cog icon for Settings in dropdown */
const SettingsGearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

export default MobileMenu;
