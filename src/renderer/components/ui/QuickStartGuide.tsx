// QuickStartGuide.tsx - Expandable animated how-to-use section
// Features step-by-step guide with animated icons

import React, { useState } from 'react';

const KENYAN_GREEN = '#006644';
const KENYAN_RED = '#DE2910';

interface QuickStartGuideProps {
  isLightMode: boolean;
  isMobile: boolean;
}

// Animated icons for each step
const LoadAudioIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="quick-start-icon load-icon">
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
  </svg>
);

const AddMarkerIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="quick-start-icon marker-icon">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const SpeedIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="quick-start-icon speed-icon">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const NavigateIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="quick-start-icon navigate-icon">
    <path d="M2 12h2l2-5 4 10 4-8 2 3h6"/>
  </svg>
);

const ExportIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="quick-start-icon export-icon">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const steps = [
  {
    id: 'load',
    title: 'Load Audio',
    description: 'Drag & drop or click to select an audio file (MP3, WAV, etc.)',
    Icon: LoadAudioIcon,
    color: KENYAN_GREEN,
  },
  {
    id: 'markers',
    title: 'Add Markers',
    description: 'Click on the timeline or press M to mark important sections',
    Icon: AddMarkerIcon,
    color: KENYAN_RED,
  },
  {
    id: 'speed',
    title: 'Adjust Speed',
    description: 'Slow down or speed up playback for easier transcription',
    Icon: SpeedIcon,
    color: '#5856D6',
  },
  {
    id: 'navigate',
    title: 'Navigate Timeline',
    description: 'Click on the waveform or markers to jump to any position',
    Icon: NavigateIcon,
    color: '#FF9500',
  },
  {
    id: 'export',
    title: 'Save & Export',
    description: 'Save your project or export markers for use in other apps',
    Icon: ExportIcon,
    color: '#007AFF',
  },
];

export const QuickStartGuide: React.FC<QuickStartGuideProps> = ({ isLightMode, isMobile }) => {
  // Always start collapsed - user must click to expand
  const [isExpanded, setIsExpanded] = useState(false);

  const bgColor = isLightMode ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)';
  const borderColor = isLightMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
  const textColor = isLightMode ? '#2d3748' : '#ffffff';
  const mutedColor = isLightMode ? '#718096' : 'rgba(255, 255, 255, 0.6)';

  return (
    <div style={{ width: '100%', marginTop: '1rem' }}>
      {/* Header/Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: isMobile ? '0.75rem' : '1rem',
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontFamily: "'Merienda', 'Caveat', cursive",
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${KENYAN_GREEN}, ${KENYAN_RED})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'quickStartIconPulse 2s ease-in-out infinite',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{
              margin: 0,
              fontWeight: '600',
              fontSize: isMobile ? '0.95rem' : '1.05rem',
              color: textColor,
            }}>
              Quick Start Guide
            </p>
            <p style={{
              margin: '2px 0 0',
              fontSize: isMobile ? '0.7rem' : '0.8rem',
              color: mutedColor,
            }}>
              Learn how to use Transcribe Pro
            </p>
          </div>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={mutedColor}
          strokeWidth="2"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: isMobile ? '1rem' : '1.25rem',
            background: bgColor,
            borderRadius: '14px',
            border: `1px solid ${borderColor}`,
            animation: 'quickStartExpand 0.3s ease-out',
          }}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isMobile ? '1rem' : '0.75rem',
          }}>
            {steps.map((step, index) => (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: '1rem',
                  padding: isMobile ? '0.75rem' : '0.5rem',
                  background: isLightMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '12px',
                  animation: `quickStartStepSlide 0.3s ease-out ${index * 0.1}s backwards`,
                }}
              >
                {/* Step Number & Icon */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  flexShrink: 0,
                }}>
                  <div
                    style={{
                      width: isMobile ? '28px' : '24px',
                      height: isMobile ? '28px' : '24px',
                      borderRadius: '50%',
                      background: `${step.color}20`,
                      color: step.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isMobile ? '0.8rem' : '0.75rem',
                      fontWeight: '700',
                    }}
                  >
                    {index + 1}
                  </div>
                  <div
                    style={{
                      width: isMobile ? '44px' : '40px',
                      height: isMobile ? '44px' : '40px',
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, ${step.color}15, ${step.color}30)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <step.Icon color={step.color} />
                  </div>
                </div>

                {/* Step Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0,
                    fontWeight: '600',
                    fontSize: isMobile ? '0.9rem' : '0.85rem',
                    color: textColor,
                  }}>
                    {step.title}
                  </p>
                  <p style={{
                    margin: '3px 0 0',
                    fontSize: isMobile ? '0.75rem' : '0.75rem',
                    color: mutedColor,
                    lineHeight: 1.4,
                  }}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes quickStartIconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes quickStartExpand {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes quickStartStepSlide {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .quick-start-icon.load-icon {
          animation: loadIconBounce 2s ease-in-out infinite;
        }
        .quick-start-icon.marker-icon {
          animation: markerIconPulse 1.5s ease-in-out infinite;
        }
        .quick-start-icon.speed-icon {
          animation: speedIconSpin 3s linear infinite;
        }
        .quick-start-icon.navigate-icon {
          animation: navigateIconWave 2s ease-in-out infinite;
        }
        .quick-start-icon.export-icon {
          animation: exportIconBounce 1.5s ease-in-out infinite;
        }
        @keyframes loadIconBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes markerIconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes speedIconSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes navigateIconWave {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        @keyframes exportIconBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(2px); }
        }
      `}</style>
    </div>
  );
};

export default QuickStartGuide;
