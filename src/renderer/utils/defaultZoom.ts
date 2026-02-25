import { Capacitor } from '@capacitor/core';

export const DESKTOP_DEFAULT_ZOOM = 5;
export const MOBILE_TABLET_DEFAULT_ZOOM = 10;

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

export function getDefaultZoomLevel(): number {
  if (typeof window === 'undefined') {
    return DESKTOP_DEFAULT_ZOOM;
  }

  const isElectron = !!(window as any).electronAPI;
  if (isElectron) {
    return DESKTOP_DEFAULT_ZOOM;
  }

  try {
    if (Capacitor.getPlatform() !== 'web') {
      return MOBILE_TABLET_DEFAULT_ZOOM;
    }
  } catch (_) {}

  return isMobileOrTabletWebRuntime()
    ? MOBILE_TABLET_DEFAULT_ZOOM
    : DESKTOP_DEFAULT_ZOOM;
}
