import { Capacitor } from '@capacitor/core';

export const DESKTOP_DEFAULT_ZOOM = 5;
export const MOBILE_MIN_ZOOM = 5;
export const PHONE_DEFAULT_ZOOM = 30;
export const MOBILE_TABLET_DEFAULT_ZOOM = 50;
export const DESKTOP_MAX_ZOOM = 50;
export const PHONE_MAX_ZOOM = 100;
export const PHONE_LAYOUT_BREAKPOINT = 768;
export const MOBILE_LAYOUT_BREAKPOINT = 1024;

function isMobileOrTabletWebRuntime(): boolean {
  if (typeof navigator === 'undefined') return false;

  const userAgent = (navigator.userAgent || '').toLowerCase();
  const isMobileOrTabletUA =
    /android|iphone|ipad|ipod|mobile|tablet|silk|kindle|playbook|windows phone/.test(userAgent);

  // iPadOS can report a desktop UA string; maxTouchPoints helps identify it.
  const isIPadDesktopUA =
    /macintosh/.test(userAgent) && (navigator.maxTouchPoints || 0) > 1;

  return isMobileOrTabletUA || isIPadDesktopUA;
}

function usesMobileLayoutViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT;
}

function usesPhoneLayoutViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < PHONE_LAYOUT_BREAKPOINT;
}

export function getDefaultZoomLevel(): number {
  if (typeof window === 'undefined') {
    return DESKTOP_DEFAULT_ZOOM;
  }

  const isPhoneViewport = usesPhoneLayoutViewport();
  if (isPhoneViewport) {
    return PHONE_DEFAULT_ZOOM;
  }

  try {
    if (Capacitor.getPlatform() !== 'web') {
      return MOBILE_TABLET_DEFAULT_ZOOM;
    }
  } catch (_) {}

  return (usesMobileLayoutViewport() || isMobileOrTabletWebRuntime())
    ? MOBILE_TABLET_DEFAULT_ZOOM
    : DESKTOP_DEFAULT_ZOOM;
}

export function getMaxZoomLevel(viewportWidth?: number): number {
  const width = viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : Number.POSITIVE_INFINITY);
  return width < 768 ? PHONE_MAX_ZOOM : DESKTOP_MAX_ZOOM;
}
