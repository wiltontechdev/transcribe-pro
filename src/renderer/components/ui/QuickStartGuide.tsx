// QuickStartGuide.tsx - Expandable animated how-to-use section
// Features step-by-step guide with animated icons

import React, { useState } from 'react';

const KENYAN_GREEN = '#006644';
const KENYAN_RED = '#DE2910';

interface QuickStartGuideProps {
  isLightMode: boolean;
  isMobile: boolean;
  compactMode?: boolean;
  tinyMode?: boolean;
}

// Animated icons for each step
const LoadAudioIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="quick-start-icon load-icon">
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
  </svg>
);

const AddMarkerIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="quick-start-icon marker-icon">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const SpeedIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="quick-start-icon speed-icon">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const NavigateIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="quick-start-icon navigate-icon">
    <path d="M2 12h2l2-5 4 10 4-8 2 3h6"/>
  </svg>
);

const ExportIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="quick-start-icon export-icon">
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
    description: 'Click on the timeline or press N to mark important sections',
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

export const QuickStartGuide: React.FC<QuickStartGuideProps> = ({
  isLightMode,
  isMobile,
  compactMode = false,
  tinyMode = false,
}) => {
  // Always start collapsed - user must click to expand
  const [isExpanded, setIsExpanded] = useState(false);

  const bgColor = isLightMode ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)';
  const borderColor = isLightMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
  const textColor = isLightMode ? '#2d3748' : '#ffffff';
  const mutedColor = isLightMode ? '#718096' : 'rgba(255, 255, 255, 0.6)';
  const headerPadding = tinyMode ? '0.65rem 0.7rem' : compactMode ? '0.7rem 0.8rem' : isMobile ? '0.75rem' : '1rem';
  const headerRadius = compactMode ? '12px' : '14px';
  const headerIconBoxSize = tinyMode ? 30 : compactMode ? 32 : isMobile ? 36 : 40;
  const headerIconSize = tinyMode ? 15 : compactMode ? 16 : 18;
  const titleSize = tinyMode ? '0.8rem' : compactMode ? '0.86rem' : isMobile ? '0.95rem' : '1.05rem';
  const subtitleSize = tinyMode ? '0.62rem' : compactMode ? '0.66rem' : isMobile ? '0.7rem' : '0.8rem';
  const chevronSize = compactMode ? 18 : 20;
  const contentPadding = tinyMode ? '0.75rem' : compactMode ? '0.85rem' : isMobile ? '1rem' : '1.25rem';
  const contentGap = tinyMode ? '0.65rem' : compactMode ? '0.75rem' : isMobile ? '1rem' : '0.75rem';
  const stepPadding = tinyMode ? '0.6rem' : compactMode ? '0.65rem' : isMobile ? '0.75rem' : '0.5rem';
  const stepGap = tinyMode ? '0.7rem' : compactMode ? '0.8rem' : '1rem';
  const numberSize = tinyMode ? 24 : compactMode ? 26 : isMobile ? 28 : 24;
  const numberFontSize = tinyMode ? '0.7rem' : compactMode ? '0.74rem' : isMobile ? '0.8rem' : '0.75rem';
  const stepIconBoxSize = tinyMode ? 34 : compactMode ? 38 : isMobile ? 44 : 40;
  const stepIconSize = tinyMode ? 18 : compactMode ? 20 : 24;
  const stepTitleSize = tinyMode ? '0.78rem' : compactMode ? '0.82rem' : isMobile ? '0.9rem' : '0.85rem';
  const stepDescriptionSize = tinyMode ? '0.66rem' : compactMode ? '0.7rem' : '0.75rem';

  return (
    <div style={{ width: '100%', marginTop: compactMode ? '0.85rem' : '1rem' }}>
      {/* Header/Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: headerPadding,
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: headerRadius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontFamily: "'Merienda', 'Caveat', cursive",
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: compactMode ? '0.55rem' : '0.75rem' }}>
          <div
            style={{
              width: `${headerIconBoxSize}px`,
              height: `${headerIconBoxSize}px`,
              borderRadius: compactMode ? '9px' : '10px',
              background: `linear-gradient(135deg, ${KENYAN_GREEN}, ${KENYAN_RED})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'quickStartIconPulse 2s ease-in-out infinite',
            }}
          >
            <svg width={headerIconSize} height={headerIconSize} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{
              margin: 0,
              fontWeight: '600',
              fontSize: titleSize,
              color: textColor,
            }}>
              Quick Start Guide
            </p>
            <p style={{
              margin: '2px 0 0',
              fontSize: subtitleSize,
              color: mutedColor,
            }}>
              Learn how to use Transcribe Pro
            </p>
          </div>
        </div>
        <svg
          width={chevronSize}
          height={chevronSize}
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
            marginTop: compactMode ? '0.6rem' : '0.75rem',
            padding: contentPadding,
            background: bgColor,
            borderRadius: headerRadius,
            border: `1px solid ${borderColor}`,
            animation: 'quickStartExpand 0.3s ease-out',
          }}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: contentGap,
          }}>
            {steps.map((step, index) => (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: stepGap,
                  padding: stepPadding,
                  background: isLightMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.03)',
                  borderRadius: compactMode ? '10px' : '12px',
                  animation: `quickStartStepSlide 0.3s ease-out ${index * 0.1}s backwards`,
                }}
              >
                {/* Step Number & Icon */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: compactMode ? '0.55rem' : '0.75rem',
                  flexShrink: 0,
                }}>
                  <div
                    style={{
                      width: `${numberSize}px`,
                      height: `${numberSize}px`,
                      borderRadius: '50%',
                      background: `${step.color}20`,
                      color: step.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: numberFontSize,
                      fontWeight: '700',
                    }}
                  >
                    {index + 1}
                  </div>
                  <div
                    style={{
                      width: `${stepIconBoxSize}px`,
                      height: `${stepIconBoxSize}px`,
                      borderRadius: compactMode ? '10px' : '12px',
                      background: `linear-gradient(135deg, ${step.color}15, ${step.color}30)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <step.Icon color={step.color} size={stepIconSize} />
                  </div>
                </div>

                {/* Step Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0,
                    fontWeight: '600',
                    fontSize: stepTitleSize,
                    color: textColor,
                  }}>
                    {step.title}
                  </p>
                  <p style={{
                    margin: '3px 0 0',
                    fontSize: stepDescriptionSize,
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
