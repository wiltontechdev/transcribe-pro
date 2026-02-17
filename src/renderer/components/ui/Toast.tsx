// Toast.tsx - Toast notification system
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);
    
    // Auto-dismiss after duration
    const duration = toast.duration || 3000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(toast.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(toast.id), 300);
  };

  const getToastStyles = () => {
    const baseStyles = {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '12px',
      minWidth: '280px',
      maxWidth: '400px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid',
      fontFamily: "'Merienda', 'Caveat', cursive",
      fontSize: '0.9rem',
      fontWeight: '500',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isVisible && !isExiting ? 'translateX(0)' : 'translateX(400px)',
      opacity: isVisible && !isExiting ? 1 : 0,
    };

    switch (toast.type) {
      case 'success':
        return {
          ...baseStyles,
          background: 'rgba(0, 102, 68, 0.9)',
          borderColor: 'rgba(0, 102, 68, 0.5)',
          color: '#ffffff',
        };
      case 'error':
        return {
          ...baseStyles,
          background: 'rgba(222, 41, 16, 0.9)',
          borderColor: 'rgba(222, 41, 16, 0.5)',
          color: '#ffffff',
        };
      case 'warning':
        return {
          ...baseStyles,
          background: 'rgba(255, 193, 7, 0.9)',
          borderColor: 'rgba(255, 193, 7, 0.5)',
          color: '#1a1a1a',
        };
      case 'info':
      default:
        return {
          ...baseStyles,
          background: 'rgba(26, 26, 26, 0.95)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
        };
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
          </svg>
        );
    }
  };

  return (
    <div style={getToastStyles()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        {getIcon()}
        <span style={{ flex: 1 }}>{toast.message}</span>
      </div>
      <button
        onClick={handleClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          opacity: 0.7,
          transition: 'opacity 0.2s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/>
        </svg>
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  // Always render the portal container to prevent React from unmounting/remounting it
  // This fixes the "removeChild" error when toasts are removed during exit animations
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 1000002,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>,
    document.body
  );
};

// Toast manager hook
let toastIdCounter = 0;
const toastListeners: Set<(toasts: Toast[]) => void> = new Set();
let toastQueue: Toast[] = [];

export const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
  const id = `toast-${++toastIdCounter}`;
  const newToast: Toast = { id, message, type, duration };
  toastQueue = [...toastQueue, newToast];
  toastListeners.forEach(listener => listener([...toastQueue]));
};

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setToasts(newToasts);
    toastListeners.add(listener);
    setToasts([...toastQueue]);
    
    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const closeToast = (id: string) => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    toastListeners.forEach(listener => listener([...toastQueue]));
  };

  return { toasts, closeToast };
};

export default ToastContainer;
