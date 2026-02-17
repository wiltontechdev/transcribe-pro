// LoadingSpinner.tsx - Reusable loading spinner component
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = '#006644',
  text 
}) => {
  const sizeMap = {
    small: { width: '20px', height: '20px', borderWidth: '2px' },
    medium: { width: '40px', height: '40px', borderWidth: '3px' },
    large: { width: '60px', height: '60px', borderWidth: '4px' },
  };

  const dimensions = sizeMap[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div
        style={{
          width: dimensions.width,
          height: dimensions.height,
          border: `${dimensions.borderWidth} solid rgba(255, 255, 255, 0.2)`,
          borderTopColor: color,
          borderRightColor: color,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {text && (
        <span style={{ 
          color: 'rgba(255, 255, 255, 0.8)', 
          fontSize: '0.9rem',
          fontFamily: "'Merienda', 'Caveat', cursive"
        }}>
          {text}
        </span>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
