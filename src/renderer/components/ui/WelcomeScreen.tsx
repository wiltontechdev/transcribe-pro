// WelcomeScreen.tsx - Neumorphic Welcome Screen
// Features Kenyan-themed neumorphic design with smooth animations
// Enhanced for iOS/Android PWA with stored projects section

import React, { useState, useEffect } from 'react';
import { useAudioEngine } from '../audio/useAudioEngine';
import { pickAudioFile, validateAudioFile } from '../audio/audioFilePicker';
import { getProjectLoader } from '../project/ProjectLoader';
import { getProjectSaver, StoredProject, deleteProjectFromIndexedDB } from '../project/ProjectSaver';
import { useAppStore } from '../../store/store';
import { getDefaultZoomLevel } from '../../utils/defaultZoom';
import { isIOSDevice } from '../../utils/platform';
import QuickStartGuide from './QuickStartGuide';
import { showToast } from './Toast';

// Kenyan flag colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';
const KENYAN_BLACK = '#0F0F0F';
const KENYAN_WHITE = '#FFFFFF';

// Handwritten font family
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

interface WelcomeScreenProps {
  onAudioLoaded: () => void;
  onProjectLoaded?: () => void;
  pendingRestore?: boolean;
  onRestorePendingSession?: () => void;
  hasAutosaveData?: boolean;
  onRestoreAutosave?: () => void;
}

// SVG Icons
const MusicIcon: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
  </svg>
);

const FolderIcon: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={KENYAN_RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const WaveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12h2l2-5 4 10 4-8 2 3h6"/>
  </svg>
);

const MarkerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const SpeedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const HeartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={KENYAN_RED} stroke="none">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onAudioLoaded, onProjectLoaded, pendingRestore, onRestorePendingSession, hasAutosaveData, onRestoreAutosave }) => {
  const { loadFile, isLoading, resumeAudioContext } = useAudioEngine();
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  // Mobile/PWA stored projects
  const [storedProjects, setStoredProjects] = useState<StoredProject[]>([]);
  const [showStoredProjects, setShowStoredProjects] = useState(false);
  const [loadingStoredId, setLoadingStoredId] = useState<string | null>(null);

  // Responsive detection - reactive to window resize
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 768);
  const isMobile = windowWidth <= 768;
  const isSmallMobile = windowWidth <= 400;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // iOS file tips
  const [isIOS] = useState(() => isIOSDevice());
  const [showIOSTips, setShowIOSTips] = useState(false); // Always start collapsed

  const theme = useAppStore((state) => state.theme);

  // Handle restoring pending session (mobile audio context fix)
  const handleRestoreSession = async () => {
    if (!onRestorePendingSession) return;
    setIsRestoringSession(true);
    try {
      await onRestorePendingSession();
    } finally {
      setIsRestoringSession(false);
    }
  };
  const isLightMode = theme === 'light';

  // Neumorphic colors based on theme
  const neuBg = isLightMode ? '#e4ebf5' : '#1e1e1e';
  const shadowDark = isLightMode ? 'rgba(163, 177, 198, 0.6)' : 'rgba(0, 0, 0, 0.5)';
  const shadowLight = isLightMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(50, 50, 50, 0.3)';

  const neuRaised = `8px 8px 16px ${shadowDark}, -6px -6px 14px ${shadowLight}`;
  const neuPressed = `inset 4px 4px 8px ${shadowDark}, inset -4px -4px 8px ${shadowLight}`;
  const isTinyPhone = windowWidth <= 360;
  const isCompactPhone = windowWidth <= 480;
  const pagePadding = isTinyPhone
    ? '10px 10px 42px'
    : isCompactPhone
      ? '14px 14px 48px'
      : isMobile
        ? '16px 14px 56px'
        : '24px 20px 80px';
  const heroLogoSize = isTinyPhone ? 46 : isCompactPhone ? 52 : isMobile ? 60 : 80;
  const heroLogoIconSize = isTinyPhone ? 22 : isCompactPhone ? 24 : isMobile ? 28 : 38;
  const heroTitleSize = isTinyPhone ? '1rem' : isCompactPhone ? '1.08rem' : isMobile ? '1.2rem' : '2rem';
  const heroSubtitleSize = isTinyPhone ? '0.68rem' : isCompactPhone ? '0.72rem' : isMobile ? '0.78rem' : '1rem';
  const heroCardPadding = isTinyPhone ? '0.9rem' : isCompactPhone ? '1rem' : isMobile ? '1.15rem' : '2rem 2.5rem';
  const heroCardRadius = isTinyPhone ? 16 : isCompactPhone ? 18 : isMobile ? 20 : 24;
  const heroGap = isTinyPhone ? '0.75rem' : isCompactPhone ? '0.9rem' : isMobile ? '1rem' : '2.5rem';
  const actionButtonPadding = isTinyPhone
    ? '0.55rem 0.7rem'
    : isCompactPhone
      ? '0.65rem 0.85rem'
      : isMobile
        ? '0.75rem 1rem'
        : '0.9rem 1.25rem';
  const actionButtonMinHeight = isTinyPhone ? 48 : isCompactPhone ? 52 : isMobile ? 56 : 64;
  const actionButtonRadius = isTinyPhone ? 12 : isCompactPhone ? 13 : 14;
  const actionIconBoxSize = isTinyPhone ? 30 : isCompactPhone ? 34 : isMobile ? 38 : 48;
  const actionIconSize = isTinyPhone ? 18 : isCompactPhone ? 20 : isMobile ? 22 : 32;
  const actionTitleSize = isTinyPhone ? '0.78rem' : isCompactPhone ? '0.84rem' : isMobile ? '0.92rem' : '1.05rem';
  const actionSubtitleSize = isTinyPhone ? '0.62rem' : isCompactPhone ? '0.68rem' : isMobile ? '0.72rem' : '0.8rem';
  const sectionMutedSize = isTinyPhone ? '0.64rem' : isCompactPhone ? '0.7rem' : isMobile ? '0.75rem' : '0.85rem';

  const [projectLoader] = useState(() => getProjectLoader(
    (message: string, type: 'success' | 'error') => {
      if (type === 'error') setError(message);
    }
  ));

  const [projectSaver] = useState(() => getProjectSaver(
    (message: string, type: 'success' | 'error') => {
      if (type === 'error') setError(message);
    }
  ));

  // Load stored projects on mount and when My Projects section is opened (for mobile PWA)
  const refreshStoredProjects = React.useCallback(async () => {
    try {
      const projects = await projectSaver.getStoredProjects();
      setStoredProjects(projects);
      // Auto-show stored projects section if there are any on mobile
      if (projects.length > 0 && isMobile) {
        setShowStoredProjects(true);
      }
    } catch (err) {
    }
  }, [projectSaver, isMobile]);

  useEffect(() => {
    refreshStoredProjects();
  }, [refreshStoredProjects]);

  // When user expands My Projects, refetch so list is up to date (e.g. after saving elsewhere)
  useEffect(() => {
    if (showStoredProjects) {
      projectSaver.getStoredProjects().then(setStoredProjects).catch(() => {});
    }
  }, [showStoredProjects, projectSaver]);

  // Handle loading a stored project from IndexedDB
  const handleLoadStoredProject = async (project: StoredProject) => {
    try {
      setError(null);
      setLoadingStoredId(project.id);
      await resumeAudioContext();

      // Set the current project ID in the saver
      projectSaver.setCurrentProjectId(project.id);

      // Load the project data
      const success = await projectLoader.loadFromStoredProject(project.projectData, loadFile);

      if (success) {
        onProjectLoaded ? onProjectLoaded() : onAudioLoaded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoadingStoredId(null);
    }
  };

  // Handle deleting a stored project
  const handleDeleteStoredProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('Delete this project? This cannot be undone.')) {
      try {
        await deleteProjectFromIndexedDB(projectId);
        setStoredProjects(prev => prev.filter(p => p.id !== projectId));
      } catch (err) {
        setError('Failed to delete project');
      }
    }
  };

  const handleStoredProjectKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    project: StoredProject
  ) => {
    if (loadingStoredId !== null) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    void handleLoadStoredProject(project);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleStartNewProject = async () => {
    try {
      setError(null);
      const store = useAppStore.getState();
      store.resetProject();
      store.setPitch(0);
      store.setVolume(6);
      store.setPlaybackRate(1);
      if (store.globalControls.isMuted) store.toggleMute();
      // Start with default zoom for current device class
      store.setZoomLevel(getDefaultZoomLevel());

      const file = await pickAudioFile();
      if (!file) return;

      const validation = validateAudioFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      await resumeAudioContext();
      await loadFile(file);
      // Audio engine will set the 20% (1/5) initial viewport

      onAudioLoaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start new project');
    }
  };

  const handleLoadProject = async () => {
    try {
      if (isIOS) {
        setShowStoredProjects(true);
        showToast('On iPhone and iPad, open saved work from My Projects.', 'info', 3200);
        return;
      }

      setError(null);
      setIsLoadingProject(true);
      await resumeAudioContext();
      // On phones: hint to select .tsproj (picker cannot open Downloads by default on web)
      if (isMobile) {
        showToast('Select a .tsproj file (e.g. from Downloads or Files)', 'info', 4000);
      }
      const loaded = await projectLoader.loadProject(loadFile);
      if (loaded) {
        onProjectLoaded ? onProjectLoaded() : onAudioLoaded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setIsLoadingProject(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const validation = validateAudioFile(file);

    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    try {
      setError(null);
      const store = useAppStore.getState();
      store.setPitch(0);
      store.setVolume(6);
      store.setPlaybackRate(1);
      if (store.globalControls.isMuted) store.toggleMute();
      // Start with default zoom for current device class
      store.setZoomLevel(getDefaultZoomLevel());

      await resumeAudioContext();
      await loadFile(file);
      // Audio engine will set the 20% (1/5) initial viewport

      onAudioLoaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audio');
    }
  };

  const features = [
    { icon: <WaveIcon />, text: 'Waveform Visualization', compactText: 'Waveform', color: KENYAN_GREEN },
    { icon: <MarkerIcon />, text: 'Section Markers', compactText: 'Markers', color: KENYAN_RED },
    { icon: <SpeedIcon />, text: 'Speed Control', compactText: 'Speed', color: KENYAN_GREEN },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: neuBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        zIndex: 1000,
        overflow: 'auto',
        overflowX: 'hidden',
        fontFamily: HANDWRITTEN_FONT,
        padding: pagePadding,
      }}
    >
      {/* Subtle background pattern */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0.03,
        background: `
          radial-gradient(circle at 20% 30%, ${KENYAN_GREEN} 0%, transparent 40%),
          radial-gradient(circle at 80% 70%, ${KENYAN_RED} 0%, transparent 40%)
        `,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Main Card */}
      <div
        className="welcome-card"
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'stretch',
          justifyContent: isMobile ? 'flex-start' : 'center',
          padding: heroCardPadding,
          background: neuBg,
          borderRadius: heroCardRadius,
          boxShadow: neuRaised,
          animation: 'fadeInUp 0.6s ease-out',
          position: 'relative',
          zIndex: 1,
          maxWidth: isMobile ? 'min(100%, 460px)' : '1100px',
          width: '100%',
          gap: heroGap,
          marginTop: isMobile ? '0' : 'auto',
          marginBottom: isMobile ? '0' : 'auto',
        }}
      >
        {/* Left Side - Logo, Title, Features (Desktop) or Top (Mobile) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          justifyContent: 'flex-start',
          flex: isMobile ? '0 0 auto' : '1 1 45%',
          gap: isSmallMobile ? '0.75rem' : isMobile ? '1rem' : '1.25rem',
          minWidth: 0,
          width: isMobile ? '100%' : 'auto',
        }}>
          {/* Logo/Title Section */}
          <div style={{
            textAlign: 'left',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: isMobile ? '0.75rem' : '0.5rem',
          }}>
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: isMobile ? (isTinyPhone ? '0.75rem' : '0.9rem') : '0.75rem',
              width: '100%',
            }}>
              {/* Neumorphic Logo Circle */}
              <div style={{
                width: heroLogoSize,
                height: heroLogoSize,
                borderRadius: isMobile ? '18px' : '50%',
                background: neuBg,
                boxShadow: neuRaised,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width={heroLogoIconSize} height={heroLogoIconSize} viewBox="0 0 24 24" fill="none">
                  <path d="M9 18V5l12-2v13" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="6" cy="18" r="3" fill={KENYAN_GREEN}/>
                  <circle cx="18" cy="16" r="3" fill={KENYAN_RED}/>
                </svg>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{
                  fontSize: heroTitleSize,
                  fontWeight: '700',
                  fontFamily: HANDWRITTEN_FONT,
                  color: isLightMode ? '#2d3748' : KENYAN_WHITE,
                  marginBottom: '0.18rem',
                  marginTop: 0,
                  letterSpacing: isMobile ? '-0.2px' : '-0.5px',
                  lineHeight: '1.15'
                }}>
                  Transcription Pro
                </h1>
                <p style={{
                  color: isLightMode ? '#718096' : 'rgba(255, 255, 255, 0.55)',
                  fontSize: heroSubtitleSize,
                  fontFamily: HANDWRITTEN_FONT,
                  margin: 0,
                  lineHeight: 1.35,
                }}>
                  Professional audio transcription for phones, tablets, and desktop.
                </p>
              </div>
            </div>

            {isMobile ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: isTinyPhone ? '0.35rem' : '0.45rem',
                width: '100%',
              }}>
                {features.map((feature, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: isTinyPhone ? '0.45rem 0.3rem' : '0.55rem 0.4rem',
                      background: isLightMode ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.04)',
                      borderRadius: 12,
                      boxShadow: `2px 2px 4px ${shadowDark}, -1px -1px 3px ${shadowLight}`,
                      textAlign: 'center',
                    }}
                  >
                    <span style={{
                      display: 'flex',
                      width: isTinyPhone ? '28px' : '32px',
                      height: isTinyPhone ? '28px' : '32px',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '10px',
                      background: `${feature.color}14`,
                      color: feature.color,
                    }}>
                      {feature.icon}
                    </span>
                    <span style={{
                      fontSize: isTinyPhone ? '0.62rem' : '0.68rem',
                      color: isLightMode ? '#4a5568' : 'rgba(255,255,255,0.72)',
                      fontWeight: 600,
                      lineHeight: 1.2,
                    }}>
                      {feature.compactText}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Features - Neumorphic Chips - hide on very small screens */}
          {!isSmallMobile && !isMobile && (
            <div style={{
              display: 'flex',
              gap: isMobile ? '6px' : '8px',
              flexWrap: 'wrap',
              justifyContent: isMobile ? 'center' : 'flex-start',
              width: '100%'
            }}>
              {features.map((feature, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '4px' : '6px',
                    padding: isMobile ? '5px 10px' : '6px 12px',
                    background: neuBg,
                    borderRadius: '16px',
                    boxShadow: `2px 2px 4px ${shadowDark}, -1px -1px 3px ${shadowLight}`,
                    fontSize: isMobile ? '0.7rem' : '0.8rem',
                    color: feature.color,
                    fontWeight: '500'
                  }}
                >
                  <span style={{ display: 'flex', transform: isMobile ? 'scale(0.8)' : 'scale(0.9)' }}>{feature.icon}</span>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side - Action Buttons (Desktop) or Below (Mobile) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          flex: isMobile ? '0 0 auto' : '1 1 55%',
          gap: isSmallMobile ? '0.6rem' : isMobile ? '0.75rem' : '1rem',
          width: '100%',
          maxWidth: isMobile ? '100%' : '480px',
        }}>
          {/* Restore Previous Session Button (shown on mobile when audio context failed) */}
          {pendingRestore && onRestorePendingSession && (
            <button
              onClick={handleRestoreSession}
              disabled={isRestoringSession}
              style={{
                width: '100%',
                padding: isMobile ? actionButtonPadding : '0.75rem 1.25rem',
                border: `2px solid ${KENYAN_GREEN}`,
                borderRadius: isMobile ? actionButtonRadius : '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isMobile ? '0.55rem' : '0.75rem',
                cursor: isRestoringSession ? 'wait' : 'pointer',
                background: `linear-gradient(135deg, ${KENYAN_GREEN}20, ${KENYAN_GREEN}10)`,
                transition: 'all 0.3s ease',
                boxShadow: `0 0 20px ${KENYAN_GREEN}30`,
                opacity: isRestoringSession ? 0.7 : 1,
                fontFamily: HANDWRITTEN_FONT,
                minHeight: isMobile ? actionButtonMinHeight : '50px',
                touchAction: 'manipulation',
                animation: 'pulse 2s ease-in-out infinite'
              }}
            >
              <svg width={isMobile ? actionIconSize : 24} height={isMobile ? actionIconSize : 24} viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              <span style={{
                color: KENYAN_GREEN,
                fontWeight: '600',
                fontSize: isMobile ? actionTitleSize : '0.95rem'
              }}>
                {isRestoringSession ? 'Restoring...' : 'Tap to Restore Previous Session'}
              </span>
            </button>
          )}

          {/* New Project Button */}
          <button
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleStartNewProject}
            onMouseEnter={() => setHoveredButton('new')}
            onMouseLeave={() => setHoveredButton(null)}
            disabled={isLoading || isLoadingProject}
            style={{
              width: '100%',
              padding: isMobile ? actionButtonPadding : '0.9rem 1.25rem',
              border: 'none',
              borderRadius: isMobile ? actionButtonRadius : 14,
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.55rem' : '1rem',
              cursor: (isLoading || isLoadingProject) ? 'wait' : 'pointer',
              background: neuBg,
              transition: 'all 0.2s ease',
              boxShadow: (isDragging || hoveredButton === 'new') ? neuPressed : neuRaised,
              transform: (isDragging || hoveredButton === 'new') ? 'scale(0.98)' : 'scale(1)',
              opacity: (isLoading || isLoadingProject) ? 0.6 : 1,
              fontFamily: HANDWRITTEN_FONT,
              minHeight: isMobile ? actionButtonMinHeight : 64,
              touchAction: 'manipulation'
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: isMobile ? actionIconBoxSize : 40,
                  height: isMobile ? actionIconBoxSize : 40,
                  borderRadius: '50%',
                  background: neuBg,
                  boxShadow: neuPressed,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: isMobile ? Math.max(14, actionIconSize - 4) : 20,
                    height: isMobile ? Math.max(14, actionIconSize - 4) : 20,
                    border: `3px solid ${KENYAN_GREEN}30`,
                    borderTopColor: KENYAN_GREEN,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{
                    color: isLightMode ? '#2d3748' : KENYAN_WHITE,
                    fontSize: isMobile ? actionTitleSize : '0.9rem',
                    fontWeight: '600',
                    margin: 0
                  }}>Loading audio...</p>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: isMobile ? actionIconBoxSize : 48,
                  height: isMobile ? actionIconBoxSize : 48,
                  borderRadius: isMobile ? 10 : 12,
                  background: neuBg,
                  boxShadow: `3px 3px 6px ${shadowDark}, -2px -2px 4px ${shadowLight}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <MusicIcon size={isMobile ? actionIconSize : 32} />
                </div>
                <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                  <p style={{
                    color: isLightMode ? '#2d3748' : KENYAN_WHITE,
                    fontSize: isMobile ? actionTitleSize : '1.05rem',
                    fontWeight: '600',
                    margin: 0,
                    marginBottom: '2px'
                  }}>
                    {isDragging ? 'Drop audio file' : 'New Project'}
                  </p>
                  <p style={{
                    color: isLightMode ? '#718096' : 'rgba(255, 255, 255, 0.5)',
                    fontSize: isMobile ? actionSubtitleSize : '0.8rem',
                    margin: 0
                  }}>
                    Click or drag & drop audio
                  </p>
                </div>
                <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </>
            )}
          </button>

          {!isIOS && (
            <button
              onClick={handleLoadProject}
              onMouseEnter={() => setHoveredButton('load')}
              onMouseLeave={() => setHoveredButton(null)}
              disabled={isLoading || isLoadingProject}
              style={{
                width: '100%',
                padding: isMobile ? actionButtonPadding : '0.9rem 1.25rem',
                border: 'none',
                borderRadius: isMobile ? actionButtonRadius : 14,
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '0.55rem' : '1rem',
                cursor: (isLoading || isLoadingProject) ? 'wait' : 'pointer',
                background: neuBg,
                transition: 'all 0.2s ease',
                boxShadow: (isLoadingProject || hoveredButton === 'load') ? neuPressed : neuRaised,
                transform: (isLoadingProject || hoveredButton === 'load') ? 'scale(0.98)' : 'scale(1)',
                opacity: (isLoading || isLoadingProject) ? 0.6 : 1,
                fontFamily: HANDWRITTEN_FONT,
                minHeight: isMobile ? actionButtonMinHeight : 64,
                touchAction: 'manipulation'
              }}
            >
              {isLoadingProject ? (
                <>
                  <div style={{
                    width: isMobile ? actionIconBoxSize : 40,
                    height: isMobile ? actionIconBoxSize : 40,
                    borderRadius: '50%',
                    background: neuBg,
                    boxShadow: neuPressed,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <div style={{
                      width: isMobile ? Math.max(14, actionIconSize - 4) : 20,
                      height: isMobile ? Math.max(14, actionIconSize - 4) : 20,
                      border: `3px solid ${KENYAN_RED}30`,
                      borderTopColor: KENYAN_RED,
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{
                      color: isLightMode ? '#2d3748' : KENYAN_WHITE,
                      fontSize: isMobile ? actionTitleSize : '0.9rem',
                      fontWeight: '600',
                      margin: 0
                    }}>Loading project...</p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    width: isMobile ? actionIconBoxSize : 48,
                    height: isMobile ? actionIconBoxSize : 48,
                    borderRadius: isMobile ? 10 : 12,
                    background: neuBg,
                    boxShadow: `3px 3px 6px ${shadowDark}, -2px -2px 4px ${shadowLight}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FolderIcon size={isMobile ? actionIconSize : 32} />
                  </div>
                  <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                    <p style={{
                      color: isLightMode ? '#2d3748' : KENYAN_WHITE,
                      fontSize: isMobile ? actionTitleSize : '1.05rem',
                      fontWeight: '600',
                      margin: 0,
                      marginBottom: '2px'
                    }}>
                      Load Project
                    </p>
                    <p style={{
                      color: isLightMode ? '#718096' : 'rgba(255, 255, 255, 0.5)',
                      fontSize: isMobile ? actionSubtitleSize : '0.8rem',
                      margin: 0
                    }}>
                      Open saved .tsproj file
                    </p>
                  </div>
                  <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} viewBox="0 0 24 24" fill="none" stroke={KENYAN_RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </>
              )}
            </button>
          )}

          {/* Restore Last Session Button - shown if autosave data exists */}
          {hasAutosaveData && onRestoreAutosave && (
            <button
              onClick={onRestoreAutosave}
              onMouseEnter={() => setHoveredButton('restore')}
              onMouseLeave={() => setHoveredButton(null)}
              disabled={isLoading || isLoadingProject}
              style={{
                width: '100%',
                padding: isMobile ? actionButtonPadding : '1rem 1.5rem',
                border: `2px solid ${KENYAN_GREEN}`,
                borderRadius: isMobile ? actionButtonRadius : '14px',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '0.55rem' : '1rem',
                cursor: (isLoading || isLoadingProject) ? 'wait' : 'pointer',
                background: `linear-gradient(135deg, ${KENYAN_GREEN}15, ${KENYAN_GREEN}05)`,
                transition: 'all 0.3s ease',
                boxShadow: hoveredButton === 'restore'
                  ? `inset 2px 2px 4px ${shadowDark}, inset -2px -2px 4px ${shadowLight}, 0 0 20px ${KENYAN_GREEN}30`
                  : `4px 4px 8px ${shadowDark}, -4px -4px 8px ${shadowLight}, 0 0 15px ${KENYAN_GREEN}20`,
                transform: hoveredButton === 'restore' ? 'scale(0.98)' : 'scale(1)',
                opacity: (isLoading || isLoadingProject) ? 0.6 : 1,
                fontFamily: HANDWRITTEN_FONT,
                minHeight: isMobile ? actionButtonMinHeight + 4 : '70px',
                touchAction: 'manipulation'
              }}
            >
              <div style={{
                width: isMobile ? actionIconBoxSize + 2 : '56px',
                height: isMobile ? actionIconBoxSize + 2 : '56px',
                borderRadius: isMobile ? 10 : '14px',
                background: `linear-gradient(135deg, ${KENYAN_GREEN}20, ${KENYAN_GREEN}10)`,
                boxShadow: `4px 4px 8px ${shadowDark}, -3px -3px 6px ${shadowLight}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width={isMobile ? actionIconSize : 28} height={isMobile ? actionIconSize : 28} viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </div>
              <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                <p style={{
                  color: KENYAN_GREEN,
                  fontSize: isMobile ? actionTitleSize : '1.15rem',
                  fontWeight: '600',
                  marginTop: 0,
                  marginLeft: 0,
                  marginRight: 0,
                  marginBottom: '4px'
                }}>
                  Restore Last Session
                </p>
                <p style={{
                  color: isLightMode ? '#718096' : 'rgba(255, 255, 255, 0.5)',
                  fontSize: isMobile ? actionSubtitleSize : '0.9rem',
                  margin: 0
                }}>
                  Continue where you left off
                </p>
              </div>
              <svg width={isMobile ? 16 : 22} height={isMobile ? 16 : 22} viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          )}

          {/* My Projects Section - For Mobile PWA */}
          {storedProjects.length > 0 && (
            <div style={{ width: '100%' }}>
            {/* Section Header */}
            <button
              onClick={() => setShowStoredProjects(!showStoredProjects)}
              style={{
                width: '100%',
                padding: isMobile ? '0.6rem 0.75rem' : '0.75rem 1rem',
                background: 'transparent',
                border: 'none',
                borderRadius: isMobile ? '10px' : '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                fontFamily: HANDWRITTEN_FONT,
              }}
            >
              <span style={{
                color: isLightMode ? '#4a5568' : 'rgba(255, 255, 255, 0.7)',
                fontSize: isMobile ? actionTitleSize : 'clamp(0.8rem, 3vw, 0.95rem)',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '0.4rem' : '0.5rem',
              }}>
                <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
                My Projects ({storedProjects.length})
              </span>
              <svg
                width={isMobile ? 18 : 20}
                height={isMobile ? 18 : 20}
                viewBox="0 0 24 24"
                fill="none"
                stroke={isLightMode ? '#4a5568' : 'rgba(255, 255, 255, 0.5)'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: showStoredProjects ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Projects List */}
            {showStoredProjects && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '0.4rem' : '0.5rem',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: isMobile ? '0.4rem' : '0.5rem',
                background: isLightMode ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
                borderRadius: isMobile ? '10px' : '12px',
                marginTop: '0.5rem',
              }}>
                {storedProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => {
                      if (loadingStoredId !== null) return;
                      void handleLoadStoredProject(project);
                    }}
                    onKeyDown={(e) => handleStoredProjectKeyDown(e, project)}
                    role="button"
                    tabIndex={loadingStoredId !== null ? -1 : 0}
                    aria-disabled={loadingStoredId !== null}
                    style={{
                      width: '100%',
                      padding: isMobile ? '0.65rem' : '0.75rem',
                      background: neuBg,
                      border: 'none',
                      borderRadius: isMobile ? '9px' : '10px',
                      boxShadow: loadingStoredId === project.id ? neuPressed : `3px 3px 6px ${shadowDark}, -2px -2px 4px ${shadowLight}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? '0.6rem' : '0.75rem',
                      cursor: loadingStoredId !== null ? 'wait' : 'pointer',
                      opacity: loadingStoredId !== null && loadingStoredId !== project.id ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                      fontFamily: HANDWRITTEN_FONT,
                    }}
                  >
                    {/* Color indicator */}
                    <div style={{
                      width: isMobile ? '32px' : '36px',
                      height: isMobile ? '32px' : '36px',
                      borderRadius: isMobile ? '7px' : '8px',
                      background: project.thumbnailColor || KENYAN_GREEN,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {loadingStoredId === project.id ? (
                        <div style={{
                          width: isMobile ? '14px' : '16px',
                          height: isMobile ? '14px' : '16px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }} />
                      ) : (
                          <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18V5l12-2v13"/>
                          <circle cx="6" cy="18" r="3"/>
                          <circle cx="18" cy="16" r="3"/>
                        </svg>
                      )}
                    </div>

                    {/* Project info */}
                    <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                      <p style={{
                        color: isLightMode ? '#2d3748' : KENYAN_WHITE,
                        fontSize: isMobile ? actionTitleSize : 'clamp(0.8rem, 3vw, 0.9rem)',
                        fontWeight: '600',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {project.name}
                      </p>
                      <p style={{
                        color: isLightMode ? '#718096' : 'rgba(255, 255, 255, 0.5)',
                        fontSize: isMobile ? actionSubtitleSize : 'clamp(0.65rem, 2.5vw, 0.75rem)',
                        margin: 0,
                      }}>
                        {formatDate(project.updatedAt)}
                        {project.audioFileName && ` â€¢ ${project.audioFileName.substring(0, 20)}${project.audioFileName.length > 20 ? '...' : ''}`}
                      </p>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteStoredProject(e, project.id)}
                      style={{
                        width: isMobile ? '24px' : '28px',
                        height: isMobile ? '24px' : '28px',
                        padding: 0,
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: isLightMode ? '#a0aec0' : 'rgba(255, 255, 255, 0.3)',
                        transition: 'color 0.2s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = KENYAN_RED}
                      onMouseLeave={(e) => e.currentTarget.style.color = isLightMode ? '#a0aec0' : 'rgba(255, 255, 255, 0.3)'}
                      title="Delete project"
                    >
                      <svg width={isMobile ? 14 : 16} height={isMobile ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}

          {/* Supported Formats */}
          <p style={{
            color: isLightMode ? '#a0aec0' : 'rgba(255, 255, 255, 0.3)',
            fontSize: sectionMutedSize,
            textAlign: isMobile ? 'center' : 'left',
            margin: 0,
            marginTop: isMobile ? '0' : '0.5rem'
          }}>
            Supports MP3, WAV, OGG, FLAC, M4A, AAC, WEBM
          </p>

          {/* iOS File Access Tips */}
          {isIOS && (
            <div style={{
              width: '100%',
              marginTop: isMobile ? '0.8rem' : '1rem',
            }}>
              <button
                onClick={() => setShowIOSTips(!showIOSTips)}
                style={{
                  width: '100%',
                  padding: isMobile ? '0.65rem 0.8rem' : '0.75rem 1rem',
                  background: `linear-gradient(135deg, ${KENYAN_GREEN}15, ${KENYAN_GREEN}05)`,
                  border: `1px solid ${KENYAN_GREEN}30`,
                  borderRadius: isMobile ? '10px' : '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontFamily: HANDWRITTEN_FONT,
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.5rem' }}>
                  <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  <span style={{
                    color: KENYAN_GREEN,
                    fontSize: isMobile ? actionTitleSize : '0.9rem',
                    fontWeight: '600'
                  }}>
                    Finding Audio on iOS
                  </span>
                </div>
                <svg
                  width={isMobile ? 14 : 16}
                  height={isMobile ? 14 : 16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={KENYAN_GREEN}
                  strokeWidth="2"
                  style={{
                    transform: showIOSTips ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                  }}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {showIOSTips && (
                <div style={{
                  marginTop: isMobile ? '0.6rem' : '0.75rem',
                  padding: isMobile ? '0.85rem' : '1rem',
                  background: isLightMode ? 'rgba(0, 102, 68, 0.05)' : 'rgba(0, 102, 68, 0.1)',
                  borderRadius: isMobile ? '10px' : '12px',
                  border: `1px solid ${KENYAN_GREEN}20`,
                  animation: 'fadeIn 0.3s ease-out',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.65rem' : '0.75rem' }}>
                    {/* Files App Tip */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '0.6rem' : '0.75rem' }}>
                      <div style={{
                        width: isMobile ? '28px' : '32px',
                        height: isMobile ? '28px' : '32px',
                        borderRadius: isMobile ? '7px' : '8px',
                        background: `linear-gradient(135deg, #007AFF, #5856D6)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <svg width={isMobile ? 14 : 16} height={isMobile ? 14 : 16} viewBox="0 0 24 24" fill="white">
                          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                        </svg>
                      </div>
                      <div>
                        <p style={{
                          margin: 0,
                          fontWeight: '600',
                          fontSize: isMobile ? actionTitleSize : '0.85rem',
                          color: isLightMode ? '#2d3748' : '#fff',
                        }}>
                          Files App
                        </p>
                        <p style={{
                          margin: '2px 0 0',
                          fontSize: isMobile ? actionSubtitleSize : '0.75rem',
                          color: isLightMode ? '#718096' : 'rgba(255,255,255,0.6)',
                        }}>
                          Check "On My iPhone" â†’ Downloads folder
                        </p>
                      </div>
                    </div>

                    {/* iCloud Drive Tip */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '0.6rem' : '0.75rem' }}>
                      <div style={{
                        width: isMobile ? '28px' : '32px',
                        height: isMobile ? '28px' : '32px',
                        borderRadius: isMobile ? '7px' : '8px',
                        background: `linear-gradient(135deg, #5AC8FA, #007AFF)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <svg width={isMobile ? 14 : 16} height={isMobile ? 14 : 16} viewBox="0 0 24 24" fill="white">
                          <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/>
                        </svg>
                      </div>
                      <div>
                        <p style={{
                          margin: 0,
                          fontWeight: '600',
                          fontSize: isMobile ? actionTitleSize : '0.85rem',
                          color: isLightMode ? '#2d3748' : '#fff',
                        }}>
                          iCloud Drive
                        </p>
                        <p style={{
                          margin: '2px 0 0',
                          fontSize: isMobile ? actionSubtitleSize : '0.75rem',
                          color: isLightMode ? '#718096' : 'rgba(255,255,255,0.6)',
                        }}>
                          Access files synced from Mac/PC
                        </p>
                      </div>
                    </div>

                    {/* Voice Memos Tip */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '0.6rem' : '0.75rem' }}>
                      <div style={{
                        width: isMobile ? '28px' : '32px',
                        height: isMobile ? '28px' : '32px',
                        borderRadius: isMobile ? '7px' : '8px',
                        background: `linear-gradient(135deg, ${KENYAN_RED}, #FF6B6B)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <svg width={isMobile ? 14 : 16} height={isMobile ? 14 : 16} viewBox="0 0 24 24" fill="white">
                          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                          <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
                        </svg>
                      </div>
                      <div>
                        <p style={{
                          margin: 0,
                          fontWeight: '600',
                          fontSize: isMobile ? actionTitleSize : '0.85rem',
                          color: isLightMode ? '#2d3748' : '#fff',
                        }}>
                          Voice Memos
                        </p>
                        <p style={{
                          margin: '2px 0 0',
                          fontSize: isMobile ? actionSubtitleSize : '0.75rem',
                          color: isLightMode ? '#718096' : 'rgba(255,255,255,0.6)',
                        }}>
                          Share â†’ Save to Files â†’ Then load here
                        </p>
                      </div>
                    </div>

                    {/* Browse Tip */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '0.6rem' : '0.75rem' }}>
                      <div style={{
                        width: isMobile ? '28px' : '32px',
                        height: isMobile ? '28px' : '32px',
                        borderRadius: isMobile ? '7px' : '8px',
                        background: `linear-gradient(135deg, ${KENYAN_GREEN}, #34C759)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <svg width={isMobile ? 14 : 16} height={isMobile ? 14 : 16} viewBox="0 0 24 24" fill="white">
                          <circle cx="11" cy="11" r="8"/>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                      </div>
                      <div>
                        <p style={{
                          margin: 0,
                          fontWeight: '600',
                          fontSize: isMobile ? actionTitleSize : '0.85rem',
                          color: isLightMode ? '#2d3748' : '#fff',
                        }}>
                          Browse All Locations
                        </p>
                        <p style={{
                          margin: '2px 0 0',
                          fontSize: isMobile ? actionSubtitleSize : '0.75rem',
                          color: isLightMode ? '#718096' : 'rgba(255,255,255,0.6)',
                        }}>
                          Tap "Browse" in Files to see all apps & locations
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Start Guide */}
          <QuickStartGuide
            isLightMode={isLightMode}
            isMobile={isMobile}
            compactMode={isCompactPhone}
            tinyMode={isTinyPhone}
          />

          {/* Error Message */}
          {error && (
            <div style={{
              color: KENYAN_RED,
              fontSize: isMobile ? actionSubtitleSize : '0.85rem',
              padding: isMobile ? '0.65rem 0.8rem' : '0.75rem 1rem',
              background: neuBg,
              borderRadius: isMobile ? '10px' : '12px',
              boxShadow: neuPressed,
              width: '100%',
              textAlign: 'center',
              animation: 'shake 0.4s ease-in-out',
              marginTop: '0.5rem'
            }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Footer - positioned at bottom but flows with content */}
      <div style={{
        marginTop: 'auto',
        paddingTop: isSmallMobile ? '10px' : isMobile ? '14px' : '20px',
        display: 'flex',
        alignItems: 'center',
        gap: isSmallMobile ? '4px' : '6px',
        color: isLightMode ? '#a0aec0' : 'rgba(255, 255, 255, 0.3)',
        fontSize: isSmallMobile ? '0.65rem' : isMobile ? '0.7rem' : '0.8rem',
        fontFamily: HANDWRITTEN_FONT,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <span>Made with</span>
        <HeartIcon />
        <span>in Kenya</span>
        <div style={{
          display: 'flex',
          gap: '2px',
          marginLeft: isSmallMobile ? '4px' : '6px'
        }}>
          <span style={{ width: isSmallMobile ? 6 : 8, height: isSmallMobile ? 4 : 5, background: KENYAN_BLACK, borderRadius: '2px 0 0 2px' }} />
          <span style={{ width: isSmallMobile ? 6 : 8, height: isSmallMobile ? 4 : 5, background: KENYAN_RED }} />
          <span style={{ width: isSmallMobile ? 6 : 8, height: isSmallMobile ? 4 : 5, background: KENYAN_GREEN }} />
          <span style={{ width: isSmallMobile ? 6 : 8, height: isSmallMobile ? 4 : 5, background: KENYAN_WHITE, borderRadius: '0 2px 2px 0' }} />
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merienda:wght@300;400;500;600;700&display=swap');

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        /* Mobile responsive styles for welcome screen */
        @media (max-width: 480px) {
          .hide-on-small-mobile {
            display: none !important;
          }
        }

        @media (max-width: 360px) {
          .welcome-card {
            padding: 1rem !important;
            gap: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default WelcomeScreen;
