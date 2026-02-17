// PWAInstallBanner – cross-browser install prompt (Chrome, Safari iOS, Firefox, Edge)
// Fully responsive design with platform-specific instructions

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/store';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const KENYAN_GREEN = '#006644';
const KENYAN_RED = '#DE2910';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  if (/Electron/i.test(navigator.userAgent)) return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(navigator as { standalone?: boolean }).standalone;
}

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

function isSafariDesktop(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|Android/.test(navigator.userAgent) && !/iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isFirefox(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Firefox|FxiOS/.test(navigator.userAgent);
}

function isEdge(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Edg/.test(navigator.userAgent);
}

export const PWAInstallBanner: React.FC = () => {
  const theme = useAppStore((s) => s.theme);
  const isLightMode = theme === 'light';

  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 400);

  // Track window width for responsive layout
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isSmallMobile = windowWidth < 360;
  const isMobile = windowWidth < 480;

  // Show on every load/reload when not installed
  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // beforeinstallprompt (Chrome, Edge, some Android browsers)
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setShow(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstalled(true);
        }
        setDeferredPrompt(null);
        setShow(false);
      } catch {
        // ignore
      }
      return;
    }
    // For browsers without install prompt, just dismiss (user follows instructions)
    setShow(false);
  };

  const dismiss = () => setShow(false);

  if (installed || !show) return null;

  const isIOS = isIOSSafari();
  const isAndroidDevice = isAndroid();
  const isSafari = isSafariDesktop();
  const isFF = isFirefox();
  const hasInstallPrompt = !!deferredPrompt;

  // Determine platform and content
  let title = 'Install App';
  let instructions: string[] = [];
  let ctaLabel = 'Install';
  let showInstallButton = true;

  if (isIOS) {
    title = 'Add to Home Screen';
    instructions = [
      '1. Tap the Share button (□↑)',
      '2. Scroll down, tap "Add to Home Screen"',
      '3. Tap "Add" to confirm'
    ];
    ctaLabel = 'OK, Got it';
    showInstallButton = true;
  } else if (isAndroidDevice && !hasInstallPrompt) {
    title = 'Install App';
    instructions = [
      '1. Tap the menu (⋮) in your browser',
      '2. Tap "Install app" or "Add to Home screen"'
    ];
    ctaLabel = 'OK, Got it';
    showInstallButton = true;
  } else if (isSafari) {
    title = 'Add to Dock';
    instructions = [
      '1. Click File in the menu bar',
      '2. Select "Add to Dock"'
    ];
    ctaLabel = 'OK, Got it';
    showInstallButton = true;
  } else if (isFF) {
    title = 'Install App';
    instructions = [
      '1. Click the menu (☰)',
      '2. Click "Install" or "Add to Home Screen"'
    ];
    ctaLabel = 'OK, Got it';
    showInstallButton = true;
  } else if (hasInstallPrompt) {
    title = 'Install Transcribe Pro';
    instructions = [];
    ctaLabel = 'Install Now';
    showInstallButton = true;
  } else {
    title = 'Install App';
    instructions = ['Use your browser menu to install this app'];
    ctaLabel = 'OK';
    showInstallButton = true;
  }

  const bg = isLightMode ? '#ffffff' : '#1a1a1a';
  const textColor = isLightMode ? '#1a1a1a' : '#ffffff';
  const mutedColor = isLightMode ? '#666666' : 'rgba(255,255,255,0.7)';
  const borderColor = isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

  return (
    <div
      role="banner"
      style={{
        position: 'fixed',
        bottom: isSmallMobile ? 8 : isMobile ? 12 : 20,
        left: isSmallMobile ? 6 : isMobile ? 10 : 16,
        right: isSmallMobile ? 6 : isMobile ? 10 : 16,
        maxWidth: isMobile ? 'none' : 380,
        margin: '0 auto',
        background: bg,
        color: textColor,
        borderRadius: isSmallMobile ? 16 : 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        border: `1px solid ${borderColor}`,
        padding: isSmallMobile ? 12 : isMobile ? 14 : 18,
        zIndex: 10002,
        animation: 'pwaBannerSlide 0.35s ease-out',
      }}
    >
      {/* Header with icon and title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isSmallMobile ? 10 : 12,
        marginBottom: instructions.length > 0 ? (isSmallMobile ? 10 : 14) : 0,
      }}>
        <div
          style={{
            width: isSmallMobile ? 40 : isMobile ? 44 : 48,
            height: isSmallMobile ? 40 : isMobile ? 44 : 48,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${KENYAN_GREEN}, ${KENYAN_RED})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg 
            width={isSmallMobile ? 20 : 24} 
            height={isSmallMobile ? 20 : 24} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="2"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ 
            margin: 0, 
            fontWeight: 700, 
            fontSize: isSmallMobile ? 14 : isMobile ? 15 : 16,
            lineHeight: 1.2,
          }}>
            {title}
          </p>
          {hasInstallPrompt && instructions.length === 0 && (
            <p style={{ 
              margin: '4px 0 0', 
              fontSize: isSmallMobile ? 11 : 12, 
              color: mutedColor,
              lineHeight: 1.3,
            }}>
              Quick access from your home screen
            </p>
          )}
        </div>
        {/* Close button */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: 'none',
            background: isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
            color: mutedColor,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Instructions (if any) */}
      {instructions.length > 0 && (
        <div style={{
          background: isLightMode ? 'rgba(0,102,68,0.06)' : 'rgba(0,102,68,0.15)',
          borderRadius: 12,
          padding: isSmallMobile ? '10px 12px' : '12px 14px',
          marginBottom: isSmallMobile ? 10 : 14,
        }}>
          {instructions.map((step, idx) => (
            <p 
              key={idx} 
              style={{ 
                margin: idx === 0 ? 0 : '6px 0 0',
                fontSize: isSmallMobile ? 12 : 13,
                color: mutedColor,
                lineHeight: 1.4,
              }}
            >
              {step}
            </p>
          ))}
        </div>
      )}

      {/* Action button */}
      {showInstallButton && (
        <button
          type="button"
          onClick={handleInstall}
          style={{
            width: '100%',
            padding: isSmallMobile ? '10px 16px' : '12px 20px',
            minHeight: 44,
            background: `linear-gradient(135deg, ${KENYAN_GREEN}, #008855)`,
            border: 'none',
            borderRadius: 12,
            color: 'white',
            fontSize: isSmallMobile ? 13 : 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,102,68,0.3)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          {ctaLabel}
        </button>
      )}

      <style>{`
        @keyframes pwaBannerSlide {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PWAInstallBanner;
