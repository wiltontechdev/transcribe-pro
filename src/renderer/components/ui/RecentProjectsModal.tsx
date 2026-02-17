// RecentProjectsModal.tsx - Recent projects popup modal (like Word)
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/store';
import { RecentProject } from '../../types/types';
import { getProjectLoader } from '../project/ProjectLoader';

const KENYAN_GREEN = '#006644';
const KENYAN_RED = '#DE2910';
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

interface RecentProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectSelect: (filePath: string) => void;
}

const RecentProjectsModal: React.FC<RecentProjectsModalProps> = ({ isOpen, onClose, onProjectSelect }) => {
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    if (isOpen) {
      const loader = getProjectLoader();
      const projects = loader.getRecentProjects();
      setRecentProjects(projects);
    }
  }, [isOpen]);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return dateString;
    }
  };

  const handleProjectClick = (filePath: string) => {
    onProjectSelect(filePath);
    onClose();
  };

  const textColor = isLightMode ? '#1a1a1a' : '#ffffff';
  const bgColor = isLightMode 
    ? 'rgba(255, 255, 255, 0.98)'
    : 'rgba(26, 26, 26, 0.98)';
  const borderColor = isLightMode 
    ? 'rgba(0, 0, 0, 0.1)'
    : 'rgba(255, 255, 255, 0.1)';
  const hoverBg = isLightMode
    ? 'rgba(0, 102, 68, 0.1)'
    : 'rgba(0, 102, 68, 0.2)';

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: bgColor,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${borderColor}`,
          borderRadius: '20px',
          padding: '2rem',
          minWidth: '600px',
          maxWidth: '800px',
          width: '90vw',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{
            color: textColor,
            fontSize: '1.5rem',
            fontWeight: '600',
            fontFamily: HANDWRITTEN_FONT,
            margin: 0,
          }}>
            Recent Projects
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: textColor,
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/>
            </svg>
          </button>
        </div>

        {recentProjects.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem 1rem',
            color: textColor,
            opacity: 0.7,
            fontFamily: HANDWRITTEN_FONT,
          }}>
            No recent projects
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentProjects.map((project, idx) => {
              const projectName = project.fileName.replace(/\.tsproj$/, '');
              const lastOpened = formatDate(project.lastOpened);
              
              return (
                <div
                  key={idx}
                  onClick={() => handleProjectClick(project.filePath)}
                  style={{
                    padding: '1rem',
                    background: 'transparent',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = hoverBg;
                    e.currentTarget.style.borderColor = KENYAN_GREEN;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = borderColor;
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      background: isLightMode 
                        ? 'rgba(0, 102, 68, 0.1)' 
                        : 'rgba(0, 102, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="24" height="24" viewBox="0 0 16 16" fill={KENYAN_GREEN}>
                        <path d="M2 2a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l4.414 4.414a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10.586 0H4v12h8V6.5h-3.5A.5.5 0 0 1 8 6V2.414z"/>
                      </svg>
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: textColor,
                        fontWeight: '600',
                        fontSize: '1rem',
                        marginBottom: '0.25rem',
                        fontFamily: HANDWRITTEN_FONT,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {projectName}
                      </div>
                      <div style={{
                        color: textColor,
                        opacity: 0.7,
                        fontSize: '0.85rem',
                        marginBottom: '0.25rem',
                      }}>
                        {project.audioFileName || 'Unknown audio file'}
                      </div>
                      <div style={{
                        color: textColor,
                        opacity: 0.6,
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                      }}>
                        Last opened: {lastOpened}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default RecentProjectsModal;
