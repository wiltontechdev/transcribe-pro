import React, { useEffect, useState } from 'react';
import MenuBar from './components/ui/MenuBar';
import MobileMenu from './components/ui/MobileMenu';
import Waveform from './components/audio/Waveform';
import MarkerTimeline from './components/markers/MarkerTimeline';
import PlaybackPanel from './components/controls/PlaybackPanel';
import MarkerPanel from './components/controls/MarkerPanel';
import MobileControlsPanel from './components/controls/MobileControlsPanel';
import SettingsModal from './components/ui/SettingsModal';
import WelcomeScreen from './components/ui/WelcomeScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ToastContainer, { useToast } from './components/ui/Toast';
import StatusBar from './components/ui/StatusBar';
import CommandPalette from './components/ui/CommandPalette';
import ExportModal from './components/ui/ExportModal';
import PWAInstallBanner from './components/ui/PWAInstallBanner';
import RestoreSessionDialog from './components/ui/RestoreSessionDialog';
import UpdateNotification from './components/ui/UpdateNotification';
import { useAppStore } from './store/store';
import { useIsMobile } from './hooks/useIsMobile';
import { useAudioEngine } from './components/audio/useAudioEngine';
import { getProjectLoader } from './components/project/ProjectLoader';
import { getProjectSaver } from './components/project/ProjectSaver';

// Kenyan colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';

const App: React.FC = () => {
  const theme = useAppStore((state) => state.theme);
  const isAudioLoaded = useAppStore((state) => state.audio.isLoaded);
  const isLoading = useAppStore((state) => state.audio.isLoading); // Use global store
  const [showWelcome, setShowWelcome] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const isMobile = useIsMobile();
  const restoreAttemptedRef = React.useRef(false);
  const { toasts, closeToast } = useToast();
  
  // Get export modal state from store
  const isExportModalOpen = useAppStore((state) => state.ui.isExportModalOpen);
  const setIsExportModalOpen = useAppStore((state) => state.setIsExportModalOpen);
  
  // Initialize audio engine (but don't use its local loading state)
  // This hook should not cause re-renders
  const { play, pause, stop, seek, getCurrentTime, setVolume, loadFile, resumeAudioContext } = useAudioEngine();
  
  // Track if project has been manually saved (auto-save only starts after first manual save)
  const lastManualSaveAt = useAppStore((state) => (state as any).lastManualSaveAt || 0);
  
  // Start auto-save when audio is loaded AND project has been saved at least once
  // Works on ALL platforms (web, mobile, electron)
  useEffect(() => {
    if (isAudioLoaded && lastManualSaveAt > 0) {
      // Start auto-save timer when project has been saved at least once
      const projectSaver = getProjectSaver();
      projectSaver.startAutoSave();
      return () => {
        projectSaver.stopAutoSave();
      };
    }
  }, [isAudioLoaded, lastManualSaveAt]);
  
  // Get store values for keyboard shortcuts
  const isPlaying = useAppStore((state) => state.audio.isPlaying);
  const currentTime = useAppStore((state) => state.audio.currentTime);
  const duration = useAppStore((state) => state.audio.duration);
  const currentVolume = useAppStore((state) => state.globalControls.volume);
  const isMuted = useAppStore((state) => state.globalControls.isMuted);
  const setVolumeStore = useAppStore((state) => state.setVolume);
  
  // Sync volume/mute changes with audio engine
  // This ensures mute toggle works correctly
  useEffect(() => {
    if (isAudioLoaded) {
      // Apply volume from store to audio engine
      // When muted, volume is -60 dB (effectively silent)
      setVolume(currentVolume);
    }
  }, [currentVolume, isMuted, isAudioLoaded, setVolume]);
  
  // Track if we've already triggered auto-replay to prevent loops
  const autoReplayTriggeredRef = React.useRef(false);
  
  // Reset the auto-replay flag when playback starts
  useEffect(() => {
    if (isPlaying) {
      autoReplayTriggeredRef.current = false;
    }
  }, [isPlaying]);
  
  // Auto-replay when audio ends
  useEffect(() => {
    // Check if audio just ended (not playing, time is at or near end, audio is loaded)
    // Also ensure we haven't already triggered replay for this end event
    if (isAudioLoaded && !isPlaying && duration > 0 && currentTime >= duration - 0.1 && !autoReplayTriggeredRef.current) {
      autoReplayTriggeredRef.current = true; // Prevent multiple triggers
      
      // Small delay before replay to ensure clean state
      const replayTimeout = setTimeout(async () => {
        try {
          await seek(0); // Reset to beginning
          await play();  // Start playing again
        } catch {
          autoReplayTriggeredRef.current = false; // Allow retry on error
        }
      }, 300); // Slightly longer delay for stability
      
      return () => clearTimeout(replayTimeout);
    }
  }, [isPlaying, currentTime, duration, isAudioLoaded, seek, play]);

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);


  // Track if auto-restore is pending (failed due to audio context)
  const [pendingRestore, setPendingRestore] = React.useState(false);
  
  // Show restore dialog instead of auto-restoring
  const [showRestoreDialog, setShowRestoreDialog] = React.useState(false);
  const [hasAutosaveData, setHasAutosaveData] = React.useState(false);
  
  // Web-only: check for auto-saved project and show restore dialog
  useEffect(() => {
    const isElectron = !!(window as any).electronAPI || 
      (typeof process !== 'undefined' && (process as any).versions && (process as any).versions.electron);
    if (isElectron) return;
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;

    // Only check if nothing is loaded and we're not currently loading
    const store = useAppStore.getState();
    if (store.audio.isLoaded || store.audio.isLoading) return;

    // Check if there's an auto-saved project
    const autosaveData = localStorage.getItem('transcribe-pro-web-autosave');
    if (!autosaveData) return;

    setHasAutosaveData(true);
    setShowRestoreDialog(true);
  }, []);
  
  // Handle restore from dialog
  const handleRestoreFromDialog = React.useCallback(async () => {
    setShowRestoreDialog(false);
    
    try {
      // Try to resume audio context - this may fail on mobile without user interaction
      try {
        await resumeAudioContext();
      } catch {
        setPendingRestore(true);
        return;
      }
      
      const loader = getProjectLoader();
      const restored = await loader.loadAutoSavedProject(loadFile);
      if (restored) {
        setShowWelcome(false);
        setPendingRestore(false);
        setHasAutosaveData(false);
        // Mark autosave timestamp so exit warnings don't fire immediately
        try {
          (useAppStore.getState() as any).setLastAutoSaveAt?.(Date.now());
        } catch (_) {}
      }
    } catch {
      // Check if it's a mobile audio context issue
      if (localStorage.getItem('transcribe-pro-web-autosave')) {
        setPendingRestore(true);
      }
    }
  }, [resumeAudioContext, loadFile]);
  
  // Handle start fresh from dialog
  const handleStartFresh = React.useCallback(() => {
    setShowRestoreDialog(false);
    setHasAutosaveData(false);
    // Clear autosave data so user truly starts fresh
    try {
      localStorage.removeItem('transcribe-pro-web-autosave');
      localStorage.removeItem('transcribe-pro-web-autosave-partial');
    } catch (_) {}
  }, []);
  
  // Handle user interaction to restore pending session (mobile fix)
  const handleRestorePendingSession = React.useCallback(async () => {
    if (!pendingRestore) return;
    
    try {
      await resumeAudioContext();
      const loader = getProjectLoader();
      const restored = await loader.loadAutoSavedProject(loadFile);
      if (restored) {
        setShowWelcome(false);
        setPendingRestore(false);
        setHasAutosaveData(false);
      }
    } catch {
      setPendingRestore(false);
    }
  }, [pendingRestore, resumeAudioContext, loadFile]);

  // Web-only: auto-save immediately before unload and warn if needed
  useEffect(() => {
    const isElectron = !!(window as any).electronAPI || 
      (typeof process !== 'undefined' && (process as any).versions && (process as any).versions.electron);
    if (isElectron) return;

    const handler = (e: BeforeUnloadEvent) => {
      const store = useAppStore.getState() as any;
      const hasProject = !!store.audio?.file && !!store.audio?.isLoaded;
      if (!hasProject) return;

      // Attempt immediate auto-save before unload
      try {
        const projectSaver = getProjectSaver();
        // Trigger immediate auto-save (synchronous localStorage write)
        const projectData = {
          version: '1.0.0',
          markers: store.markers || [],
          globalControls: store.globalControls || {},
          uiState: {
            zoomLevel: store.ui?.zoomLevel || 1,
            viewportStart: store.ui?.viewportStart || 0,
            viewportEnd: store.ui?.viewportEnd || 0,
          },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: '1.0.0',
          },
        };
        // Note: We can't save audio file synchronously, but markers/settings are saved
        localStorage.setItem('transcribe-pro-web-autosave-partial', JSON.stringify(projectData));
      } catch (_) {}

      // Respect settings (auto-save on/off)
      let autoSaveEnabled = true;
      try {
        const raw = localStorage.getItem('appSettings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.autoSaveEnabled === 'boolean') autoSaveEnabled = parsed.autoSaveEnabled;
        }
      } catch (_) {}

      const lastChangeAt = store.projectLastChangeAt || 0;
      const lastAutoSaveAt = store.lastAutoSaveAt || 0;
      const lastManualSaveAt = store.lastManualSaveAt || 0;
      const lastSaveAt = Math.max(lastAutoSaveAt, lastManualSaveAt);

      const hasUnsaved = lastChangeAt > 0 && lastSaveAt < lastChangeAt;
      if (!hasUnsaved) return;

      // If autosave is enabled, we still warn if it hasn't run since the last change
      // If autosave is disabled, always warn.
      if (!autoSaveEnabled || lastAutoSaveAt < lastChangeAt) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Command Palette commands
  const commandPaletteCommands = React.useMemo(() => {
    const projectSaver = getProjectSaver();
    const projectLoader = getProjectLoader();
    const store = useAppStore.getState();
    
    return [
      // File commands
      { id: 'new-project', label: 'Start New Project', category: 'File', shortcut: 'Ctrl+O', icon: '📄', action: () => { /* handled in MenuBar */ } },
      { id: 'load-project', label: 'Load Project', category: 'File', shortcut: 'Ctrl+L', icon: '📂', action: () => { /* handled in MenuBar */ } },
      { id: 'save-project', label: 'Save Project', category: 'File', shortcut: 'Ctrl+S', icon: '💾', action: () => { /* handled in MenuBar */ } },
      { id: 'save-as', label: 'Save Project As...', category: 'File', shortcut: 'Ctrl+Shift+S', icon: '💾', action: () => { /* handled in MenuBar */ } },
      
      // View commands
      { id: 'zoom-in', label: 'Zoom In', category: 'View', shortcut: 'Ctrl++', icon: '🔍', action: () => { /* handled in MenuBar */ } },
      { id: 'zoom-out', label: 'Zoom Out', category: 'View', shortcut: 'Ctrl+-', icon: '🔍', action: () => { /* handled in MenuBar */ } },
      { id: 'zoom-reset', label: 'Reset Zoom', category: 'View', shortcut: 'Ctrl+0', icon: '🔍', action: () => { /* handled in MenuBar */ } },
      { id: 'settings', label: 'Settings', category: 'View', shortcut: 'Ctrl+,', icon: '⚙️', action: () => { useAppStore.getState().setIsSettingsModalOpen(true); } },
      
      // Playback commands
      { id: 'play-pause', label: 'Play/Pause', category: 'Playback', shortcut: 'Space', icon: '▶️', action: () => { /* handled globally */ } },
      { id: 'stop', label: 'Stop', category: 'Playback', shortcut: 'S', icon: '⏹️', action: () => { /* handled globally */ } },
      
      // Edit commands
      { id: 'undo', label: 'Undo', category: 'Edit', shortcut: 'Ctrl+Z', icon: '↶', action: () => { store.undo(); } },
      { id: 'redo', label: 'Redo', category: 'Edit', shortcut: 'Ctrl+Y', icon: '↷', action: () => { store.redo(); } },
    ];
  }, []);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette (Ctrl+Shift+P)
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setShowCommandPalette(true);
        return;
      }
      // Don't trigger shortcuts if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      const isInputFocused = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('input, textarea, [contenteditable="true"]');

      // Command Palette (Ctrl+Shift+P) - works everywhere
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setShowCommandPalette(true);
        return;
      }

      // Handle undo/redo shortcuts even when audio is not loaded (they work on markers)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) {
        e.preventDefault();
        const { undo, redo, canUndo, canRedo } = useAppStore.getState();
        if (e.key === 'z' && !e.shiftKey) {
          // Ctrl+Z: Undo
          if (canUndo()) {
            undo();
          }
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          // Ctrl+Y or Ctrl+Shift+Z: Redo
          if (canRedo()) {
            redo();
          }
        }
        return;
      }

      // Only handle other shortcuts when audio is loaded and not typing
      if (!isAudioLoaded || isInputFocused) {
        return;
      }

      switch (e.key) {
        case ' ': // Space - Play/Pause
          e.preventDefault(); // Prevent page scroll
          if (isPlaying) {
            pause();
          } else {
            play();
          }
          break;

        case 'Escape': // Escape - Stop
          e.preventDefault();
          stop();
          break;

        case 'm': // M key - Create marker at current position
        case 'M':
          e.preventDefault();
          try {
            const store = useAppStore.getState();
            const currentTimeForMarker = store.audio.currentTime || 0;
            const audioDuration = store.audio.duration || 0;
            if (audioDuration > 0) {
              // Import MarkerManager dynamically to avoid circular deps
              const { MarkerManager } = require('./components/markers/MarkerManager');
              const start = currentTimeForMarker;
              const end = Math.min(currentTimeForMarker + 5, audioDuration);
              if (end - start >= 0.5) {
                MarkerManager.createQuickMarker(start, end);
              } else {
                const altStart = Math.max(0, currentTimeForMarker - 5);
                if (currentTimeForMarker - altStart >= 0.5) {
                  MarkerManager.createQuickMarker(altStart, currentTimeForMarker);
                }
              }
            }
          } catch (_) {}
          break;

        case 'ArrowLeft': // Left Arrow - Skip backward 5 seconds
          e.preventDefault();
          const currentTimeVal = getCurrentTime();
          const newTimeBack = Math.max(0, currentTimeVal - 5);
          seek(newTimeBack);
          break;

        case 'ArrowRight': // Right Arrow - Skip forward 5 seconds
          e.preventDefault();
          const currentTimeForward = getCurrentTime();
          const audioDur = useAppStore.getState().audio.duration;
          const newTimeForward = Math.min(audioDur, currentTimeForward + 5);
          seek(newTimeForward);
          break;

        case 'ArrowUp': // Up Arrow - Volume +10%
          e.preventDefault();
          // Volume range is -60 to +6 dB (66 dB total), 10% = 6.6 dB ≈ 7 dB
          const volumeUp = Math.min(6, currentVolume + 7);
          setVolume(volumeUp);
          setVolumeStore(volumeUp);
          break;

        case 'ArrowDown': // Down Arrow - Volume -10%
          e.preventDefault();
          // Volume range is -60 to +6 dB (66 dB total), 10% = 6.6 dB ≈ 7 dB
          const volumeDown = Math.max(-60, currentVolume - 7);
          setVolume(volumeDown);
          setVolumeStore(volumeDown);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAudioLoaded, isPlaying, currentVolume, play, pause, stop, seek, getCurrentTime, setVolume, setVolumeStore, setShowCommandPalette]);
  
  // Show/hide welcome screen based on audio loaded state
  // Don't show welcome when loading (user should see loading animation instead)
  useEffect(() => {
    if (isAudioLoaded) {
      setShowWelcome(false);
    } else if (!isLoading) {
      // Only show welcome screen when audio is TRULY unloaded (not loading)
      // e.g., after Close Audio, NOT when loading a new audio
      setShowWelcome(true);
    }
    // When isLoading is true, don't change showWelcome - let render logic handle it
  }, [isAudioLoaded, isLoading]);
  
  const handleAudioLoaded = () => {
    setShowWelcome(false);
  };

  const handleProjectLoaded = () => {
    setShowWelcome(false);
  };
  
  // Loading overlay component with blur background
  const LoadingOverlay = ({ withBlur = false }: { withBlur?: boolean }) => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: withBlur 
        ? 'rgba(10, 10, 10, 0.85)' 
        : 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0d1f0d 100%)',
      backdropFilter: withBlur ? 'blur(8px)' : 'none',
      WebkitBackdropFilter: withBlur ? 'blur(8px)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.3s ease-out',
    }}>
      {/* Animated spinner with pulse */}
      <div style={{
        position: 'relative',
        width: '100px',
        height: '100px',
        marginBottom: '32px',
      }}>
        {/* Outer glow */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${KENYAN_GREEN}30 0%, transparent 70%)`,
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        
        {/* Spinner ring */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100px',
          height: '100px',
          border: `4px solid rgba(255,255,255,0.1)`,
          borderTop: `4px solid ${KENYAN_GREEN}`,
          borderRight: `4px solid ${KENYAN_RED}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        
        {/* Inner circle */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Wave icon */}
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2">
            <path d="M2 12h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-8a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-4a2 2 0 0 1 2-2h2"/>
          </svg>
        </div>
      </div>
      
      {/* Loading text */}
      <div style={{
        fontFamily: "'Merienda', cursive",
        fontSize: '1.6rem',
        color: '#ffffff',
        marginBottom: '12px',
        textShadow: `0 0 20px ${KENYAN_GREEN}40`,
      }}>
        {withBlur ? 'Loading New Audio...' : 'Loading Audio...'}
      </div>
      
      <div style={{
        fontFamily: "'Merienda', cursive",
        fontSize: '1rem',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: '24px',
      }}>
        Preparing waveform visualization
      </div>
      
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: KENYAN_GREEN,
              animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-12px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
  
  // Priority 1: Show loading overlay when loading (whether from welcome screen or main app)
  if (isLoading) {
    // If audio was already loaded before this load started, show blur
    // Otherwise show full-screen loading without blur
    return (
      <ErrorBoundary>
        <LoadingOverlay withBlur={false} />
      </ErrorBoundary>
    );
  }
  
  // Priority 2: Show restore dialog if autosave exists
  if (showRestoreDialog) {
    return (
      <ErrorBoundary>
        <RestoreSessionDialog
          isOpen={showRestoreDialog}
          onRestore={handleRestoreFromDialog}
          onStartFresh={handleStartFresh}
        />
      </ErrorBoundary>
    );
  }
  
  // Priority 3: Show welcome screen if no audio loaded
  if (showWelcome && !isAudioLoaded) {
    return (
      <ErrorBoundary>
        <WelcomeScreen 
          onAudioLoaded={handleAudioLoaded}
          onProjectLoaded={handleProjectLoaded}
          pendingRestore={pendingRestore}
          onRestorePendingSession={handleRestorePendingSession}
          hasAutosaveData={hasAutosaveData}
          onRestoreAutosave={handleRestoreFromDialog}
        />
      </ErrorBoundary>
    );
  }
  
  // Mobile Layout
  if (isMobile) {
    return (
      <ErrorBoundary>
        <div className="app-container mobile-layout">
          {/* Mobile Menu */}
          <MobileMenu />

          {/* Main Content Area - Stacked vertically, order: Waveform → Timeline → Playback → Markers */}
          {/* Controls Panel (zoom/pitch) moved to MobileMenu dropdown */}
          <div className="main-content mobile-content">
            {/* Waveform Section - scrollable */}
            <div className="mobile-panel waveform-mobile-section">
              <ErrorBoundary>
                <Waveform />
              </ErrorBoundary>
            </div>

            {/* Marker Timeline Section - takes most space for stacked markers */}
            <div className="mobile-panel timeline-mobile-section">
              <ErrorBoundary>
                <MarkerTimeline />
              </ErrorBoundary>
            </div>

            {/* Playback Panel - Before marker panel */}
            <div className="mobile-panel playback-section">
              <ErrorBoundary>
                <PlaybackPanel />
              </ErrorBoundary>
            </div>

            {/* Marker Panel - fixed height, shows 2.5 markers, scrollable */}
            <div className="mobile-panel marker-panel-section">
              <ErrorBoundary>
                <MarkerPanel />
              </ErrorBoundary>
            </div>
          </div>

          {/* Modals */}
          <SettingsModal />
          <CommandPalette 
            isOpen={showCommandPalette} 
            onClose={() => setShowCommandPalette(false)}
            commands={commandPaletteCommands}
          />
          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
          />
          
          {/* Status Components */}
          <StatusBar />
          
          {/* Toast Notifications */}
          <ToastContainer toasts={toasts} onClose={closeToast} />
          {/* PWA install banner – shown on every load, works in Safari/Firefox/Edge/Chrome */}
          <PWAInstallBanner />
          {/* Electron auto-update notification */}
          <UpdateNotification />
        </div>
      </ErrorBoundary>
    );
  }

  // Desktop Layout
  return (
    <ErrorBoundary>
      <div className="app-container">
        {/* Menu Bar */}
        <div className="menu-bar-container">
          <MenuBar />
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {/* Waveform + Marker Timeline Section (50% of screen) */}
          <div className="waveform-section adinkra-pattern panel-pattern">
            <ErrorBoundary>
              <Waveform />
            </ErrorBoundary>
            <ErrorBoundary>
              <MarkerTimeline />
            </ErrorBoundary>
          </div>

          {/* Two Panels Section */}
          <div className="panels-section">
            <div className="panel panel-pattern">
              <ErrorBoundary>
                <PlaybackPanel />
              </ErrorBoundary>
            </div>
            <div className="panel panel-pattern">
              <ErrorBoundary>
                <MarkerPanel />
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Modals */}
        <SettingsModal />
        <CommandPalette 
          isOpen={showCommandPalette} 
          onClose={() => setShowCommandPalette(false)}
          commands={commandPaletteCommands}
        />
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
        
        {/* Status Components */}
        <StatusBar />
        
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onClose={closeToast} />
        {/* PWA install banner – shown on every load, works in Safari/Firefox/Edge/Chrome */}
        <PWAInstallBanner />
        {/* Electron auto-update notification */}
        <UpdateNotification />
      </div>
    </ErrorBoundary>
  );
};

export default App;

