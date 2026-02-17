// ProgressIndicator.tsx - Progress indicator for operations
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const KENYAN_GREEN = '#006644';
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

interface ProgressIndicatorProps {
  isVisible: boolean;
  progress?: number; // 0-100
  message?: string;
  onCancel?: () => void;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  isVisible,
  progress,
  message = 'Processing...',
  onCancel,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isVisible || !mounted) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000000,
      }}
    >
      <div
        style={{
          background: 'rgba(26, 26, 26, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '2rem',
          minWidth: '300px',
          maxWidth: '500px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#ffffff',
              fontFamily: HANDWRITTEN_FONT,
              marginBottom: '0.5rem',
            }}
          >
            {message}
          </div>
          {progress !== undefined && (
            <div
              style={{
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.7)',
                fontFamily: HANDWRITTEN_FONT,
              }}
            >
              {Math.round(progress)}%
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: onCancel ? '1rem' : '0',
          }}
        >
          <div
            style={{
              width: progress !== undefined ? `${progress}%` : '100%',
              height: '100%',
              background: `linear-gradient(90deg, ${KENYAN_GREEN}, #00AA00)`,
              borderRadius: '4px',
              transition: 'width 0.3s ease',
              animation: progress === undefined ? 'shimmer 1.5s ease-in-out infinite' : 'none',
            }}
          />
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontFamily: HANDWRITTEN_FONT,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ProgressIndicator;
