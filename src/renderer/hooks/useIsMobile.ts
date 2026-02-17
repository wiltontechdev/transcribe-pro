// useIsMobile.ts - Shared mobile detection for web, Electron, and Capacitor (Android/iOS)
// On Capacitor native, always returns true (mobile layout). Otherwise uses viewport width ≤1024.

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function useIsMobile(): boolean {
  const getIsMobile = () => {
    if (Capacitor.getPlatform() !== 'web') return true;
    return window.innerWidth <= 1024;
  };

  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    const handleResize = () => setIsMobile(getIsMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}
