// HelpModal.tsx - Comprehensive help modal with all features
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/store';

const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

interface HelpSection {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

const HelpModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.ui.isHelpModalOpen);
  const setIsHelpModalOpen = useAppStore((state) => state.setIsHelpModalOpen);
  const [activeSection, setActiveSection] = useState<string>('shortcuts');
  const [searchQuery, setSearchQuery] = useState('');

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsHelpModalOpen(false);
    }
  };

  const handleClose = () => {
    setIsHelpModalOpen(false);
    setSearchQuery('');
  };

  // Keyboard Shortcuts Section
  const shortcutsContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h4 style={{ color: KENYAN_GREEN, marginBottom: '1rem', fontFamily: HANDWRITTEN_FONT }}>Playback Controls</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { key: 'Space', desc: 'Play/Pause audio playback' },
            { key: 'Escape', desc: 'Stop playback' },
            { key: '←', desc: 'Skip backward 5 seconds' },
            { key: '→', desc: 'Skip forward 5 seconds' },
            { key: '↑', desc: 'Increase volume (+10%)' },
            { key: '↓', desc: 'Decrease volume (-10%)' },
          ].map((shortcut, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>{shortcut.desc}</span>
              <kbd style={{ padding: '0.4rem 0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 style={{ color: KENYAN_GREEN, marginBottom: '1rem', fontFamily: HANDWRITTEN_FONT }}>Project Management</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { key: 'Ctrl+O', desc: 'Start New Project' },
            { key: 'Ctrl+L', desc: 'Load Project' },
            { key: 'Ctrl+S', desc: 'Save Project' },
            { key: 'Ctrl+Shift+S', desc: 'Save Project As...' },
          ].map((shortcut, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>{shortcut.desc}</span>
              <kbd style={{ padding: '0.4rem 0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 style={{ color: KENYAN_GREEN, marginBottom: '1rem', fontFamily: HANDWRITTEN_FONT }}>Editing</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { key: 'Ctrl+Z', desc: 'Undo last action' },
            { key: 'Ctrl+Y', desc: 'Redo last action' },
            { key: 'Ctrl+Shift+Z', desc: 'Redo (alternative)' },
          ].map((shortcut, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>{shortcut.desc}</span>
              <kbd style={{ padding: '0.4rem 0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Quick Start Guide Section
  const quickStartContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {[
        {
          step: 1,
          title: 'Load Your Audio File',
          description: 'Click "File" → "Start New Project" or press Ctrl+O to select an audio file. Supported formats: MP3, WAV, OGG, M4A.',
          icon: '🎵',
        },
        {
          step: 2,
          title: 'Navigate the Waveform',
          description: 'Use the zoom controls in the menu bar to zoom in/out. Click and drag on the waveform to seek to different positions.',
          icon: '📊',
        },
        {
          step: 3,
          title: 'Play and Listen',
          description: 'Press Space to play/pause. Use arrow keys (← →) to skip 5 seconds. Adjust volume with ↑ ↓ keys or the volume control button.',
          icon: '▶️',
        },
        {
          step: 4,
          title: 'Create Your First Marker',
          description: 'While playing, press the "Create Marker" button in the Marker Panel when you reach the point you want to mark. Or click directly on the waveform timeline.',
          icon: '📍',
        },
        {
          step: 5,
          title: 'Edit and Save',
          description: 'Click on a marker to edit its label, notes, and timestamp. Save your project with Ctrl+S to preserve all your markers.',
          icon: '💾',
        },
      ].map((step) => (
        <div key={step.step} style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '3rem', lineHeight: '1' }}>{step.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: KENYAN_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontFamily: HANDWRITTEN_FONT }}>
                {step.step}
              </div>
              <h4 style={{ color: '#fff', fontSize: '1.1rem', fontFamily: HANDWRITTEN_FONT, margin: 0 }}>{step.title}</h4>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
              {step.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  // Features Section
  const featuresContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {[
        {
          title: 'Audio Waveform Visualization',
          description: 'Visual representation of your audio file with real-time playback position indicator. Zoom in to see fine details or zoom out for an overview.',
          icon: '📈',
        },
        {
          title: 'Marker Timeline',
          description: 'Create, edit, and manage markers along your audio timeline. Each marker can have a label, notes, and precise timestamp.',
          icon: '📍',
        },
        {
          title: 'Pitch Control',
          description: 'Adjust audio pitch from -2 to +2 semitones in real-time. Access via "Audio Effects" → "Pitch Control" menu.',
          icon: '🎚️',
        },
        {
          title: 'Volume Control',
          description: 'Fine-tune volume from -60 dB to +6 dB. Mute/unmute with a single click. Volume settings persist across sessions.',
          icon: '🔊',
        },
        {
          title: 'Project Auto-Save',
          description: 'Your work is automatically saved every 5 minutes (configurable in Settings). Never lose your progress!',
          icon: '💾',
        },
        {
          title: 'Undo/Redo System',
          description: 'Full undo/redo support for all marker operations. Press Ctrl+Z to undo or Ctrl+Y to redo.',
          icon: '↩️',
        },
      ].map((feature, idx) => (
        <div key={idx} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '2rem' }}>{feature.icon}</div>
            <div style={{ flex: 1 }}>
              <h4 style={{ color: KENYAN_GREEN, fontSize: '1.1rem', fontFamily: HANDWRITTEN_FONT, margin: '0 0 0.5rem 0' }}>
                {feature.title}
              </h4>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                {feature.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Tips & Tricks Section
  const tipsContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {[
        { tip: 'Use zoom controls to precisely place markers at specific timestamps.', icon: '🔍' },
        { tip: 'Double-click a marker on the timeline to quickly edit it.', icon: '⚡' },
        { tip: 'Save frequently! Auto-save runs every 5 minutes, but manual saves (Ctrl+S) are instant.', icon: '💡' },
        { tip: 'Adjust pitch in real-time while playing to find the perfect setting.', icon: '🎵' },
        { tip: 'Use keyboard shortcuts for faster workflow - they work even when menus are closed.', icon: '⌨️' },
        { tip: 'Markers are color-coded: green for active, grey for inactive.', icon: '🎨' },
        { tip: 'The waveform shows amplitude - taller waves mean louder audio at that point.', icon: '📊' },
        { tip: 'You can create multiple markers at the same timestamp for different purposes.', icon: '📍' },
      ].map((item, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', borderLeft: `3px solid ${KENYAN_GREEN}` }}>
          <div style={{ fontSize: '1.5rem' }}>{item.icon}</div>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0, flex: 1 }}>
            {item.tip}
          </p>
        </div>
      ))}
    </div>
  );

  // Troubleshooting Section
  const troubleshootingContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {[
        {
          issue: 'Audio file won\'t load',
          solution: 'Ensure the file format is supported (MP3, WAV, OGG, M4A). Check file size - very large files may take time to process. Try a different file to rule out corruption.',
        },
        {
          issue: 'Markers not appearing',
          solution: 'Make sure you\'ve created a marker using the "Create Marker" button or by clicking on the timeline. Check that you\'re zoomed in enough to see markers.',
        },
        {
          issue: 'Playback is choppy or laggy',
          solution: 'Close other applications to free up system resources. Try reducing zoom level. Check your system audio settings.',
        },
        {
          issue: 'Changes not saving',
          solution: 'Ensure auto-save is enabled in Settings. Manually save with Ctrl+S. Check browser console for errors if using web version.',
        },
        {
          issue: 'Can\'t hear audio',
          solution: 'Check system volume and app volume control. Ensure audio isn\'t muted (look for mute icon in volume control). Verify audio file has audio track.',
        },
        {
          issue: 'Keyboard shortcuts not working',
          solution: 'Make sure no input fields are focused. Some shortcuts may be disabled during certain operations. Try clicking on the waveform first.',
        },
      ].map((item, idx) => (
        <div key={idx} style={{ padding: '1.5rem', background: 'rgba(222, 41, 16, 0.1)', borderRadius: '12px', border: '1px solid rgba(222, 41, 16, 0.2)' }}>
          <h4 style={{ color: KENYAN_RED, fontSize: '1rem', fontFamily: HANDWRITTEN_FONT, margin: '0 0 0.75rem 0' }}>
            ❌ {item.issue}
          </h4>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
            ✅ {item.solution}
          </p>
        </div>
      ))}
    </div>
  );

  const sections: HelpSection[] = [
    { id: 'shortcuts', title: 'Keyboard Shortcuts', icon: '⌨️', content: shortcutsContent },
    { id: 'quickstart', title: 'Quick Start Guide', icon: '🚀', content: quickStartContent },
    { id: 'features', title: 'Features', icon: '✨', content: featuresContent },
    { id: 'tips', title: 'Tips & Tricks', icon: '💡', content: tipsContent },
    { id: 'troubleshooting', title: 'Troubleshooting', icon: '🔧', content: troubleshootingContent },
  ];

  // Search functionality
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    
    const query = searchQuery.toLowerCase();
    return sections.filter(section => {
      const sectionText = `${section.title} ${section.content?.toString() || ''}`.toLowerCase();
      return sectionText.includes(query);
    });
  }, [searchQuery]);

  const activeContent = sections.find(s => s.id === activeSection)?.content || shortcutsContent;

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        padding: '20px',
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: 'rgba(26, 26, 26, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          width: '90vw',
          maxWidth: '1200px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2rem 2rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h2 style={{ color: '#ffffff', fontSize: '2rem', fontWeight: '600', fontFamily: HANDWRITTEN_FONT, margin: 0 }}>
            📚 Help & Documentation
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              fontSize: '24px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(222, 41, 16, 0.3)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ×
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 48px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontFamily: HANDWRITTEN_FONT,
                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3)',
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = KENYAN_GREEN;
                e.currentTarget.style.boxShadow = `inset 2px 2px 4px rgba(0, 0, 0, 0.3), 0 0 0 3px ${KENYAN_GREEN}20`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.boxShadow = 'inset 2px 2px 4px rgba(0, 0, 0, 0.3)';
              }}
            />
            <svg
              width="20"
              height="20"
              viewBox="0 0 16 16"
              fill="rgba(255,255,255,0.5)"
              style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar Navigation */}
          <div style={{ width: '250px', borderRight: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.5rem', overflowY: 'auto', background: 'rgba(0, 0, 0, 0.2)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={{
                    padding: '1rem',
                    background: activeSection === section.id ? `rgba(0, 102, 68, 0.3)` : 'transparent',
                    border: `1px solid ${activeSection === section.id ? KENYAN_GREEN : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '10px',
                    color: activeSection === section.id ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.95rem',
                    fontFamily: HANDWRITTEN_FONT,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== section.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== section.id) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{section.icon}</span>
                  <span>{section.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
            {activeContent}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HelpModal;
