// WorkspaceLayoutModal.tsx - Manage workspace layouts
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/store';
import { WorkspaceManager, WorkspaceLayout } from './WorkspaceManager';
import { showToast } from './Toast';

const KENYAN_GREEN = '#006644';
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

interface WorkspaceLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WorkspaceLayoutModal: React.FC<WorkspaceLayoutModalProps> = ({ isOpen, onClose }) => {
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  const [layouts, setLayouts] = useState<WorkspaceLayout[]>([]);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLayouts(WorkspaceManager.getLayouts());
    }
  }, [isOpen]);

  const handleSaveLayout = () => {
    if (!newLayoutName.trim()) {
      showToast('Please enter a layout name', 'error');
      return;
    }
    WorkspaceManager.saveLayout(newLayoutName.trim());
    setLayouts(WorkspaceManager.getLayouts());
    setNewLayoutName('');
    showToast('Layout saved successfully!', 'success');
  };

  const handleLoadLayout = (layoutId: string) => {
    if (WorkspaceManager.loadLayout(layoutId)) {
      showToast('Layout loaded successfully!', 'success');
      onClose();
    } else {
      showToast('Failed to load layout', 'error');
    }
  };

  const handleDeleteLayout = (layoutId: string) => {
    if (WorkspaceManager.deleteLayout(layoutId)) {
      setLayouts(WorkspaceManager.getLayouts());
      showToast('Layout deleted', 'success');
    } else {
      showToast('Failed to delete layout', 'error');
    }
  };

  if (!isOpen || !mounted) return null;

  const textColor = isLightMode ? '#1a1a1a' : '#ffffff';
  const bgColor = isLightMode 
    ? 'rgba(255, 255, 255, 0.98)'
    : 'rgba(26, 26, 26, 0.98)';
  const borderColor = isLightMode 
    ? 'rgba(0, 0, 0, 0.1)'
    : 'rgba(255, 255, 255, 0.1)';

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
          minWidth: '500px',
          maxWidth: '700px',
          width: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          color: textColor,
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '1.5rem',
          fontFamily: HANDWRITTEN_FONT,
        }}>
          Workspace Layouts
        </h2>

        {/* Save new layout */}
        <div style={{ marginBottom: '2rem', padding: '1rem', background: isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
          <label style={{ display: 'block', color: textColor, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Save Current Layout
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Layout name..."
              value={newLayoutName}
              onChange={(e) => setNewLayoutName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLayout()}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                color: textColor,
                fontSize: '0.9rem',
              }}
            />
            <button
              onClick={handleSaveLayout}
              style={{
                padding: '0.5rem 1rem',
                background: KENYAN_GREEN,
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontFamily: HANDWRITTEN_FONT,
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>

        {/* Saved layouts */}
        <div>
          <h3 style={{ color: textColor, fontSize: '1rem', marginBottom: '1rem', fontFamily: HANDWRITTEN_FONT }}>
            Saved Layouts
          </h3>
          {layouts.length === 0 ? (
            <div style={{ color: textColor, opacity: 0.7, textAlign: 'center', padding: '2rem' }}>
              No saved layouts
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {layouts.map((layout) => (
                <div
                  key={layout.id}
                  style={{
                    padding: '1rem',
                    background: isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ color: textColor, fontWeight: '500', marginBottom: '0.25rem' }}>
                      {layout.name}
                    </div>
                    <div style={{ color: textColor, opacity: 0.6, fontSize: '0.85rem' }}>
                      {new Date(layout.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleLoadLayout(layout.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: KENYAN_GREEN,
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontFamily: HANDWRITTEN_FONT,
                        cursor: 'pointer',
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDeleteLayout(layout.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(220, 53, 69, 0.2)',
                        border: '1px solid rgba(220, 53, 69, 0.3)',
                        borderRadius: '8px',
                        color: '#ff6b7a',
                        fontSize: '0.85rem',
                        fontFamily: HANDWRITTEN_FONT,
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close button */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: `1px solid ${borderColor}`,
              borderRadius: '10px',
              color: textColor,
              fontSize: '0.9rem',
              fontFamily: HANDWRITTEN_FONT,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default WorkspaceLayoutModal;
