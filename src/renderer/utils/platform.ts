export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const userAgent = (navigator.userAgent || '').toLowerCase();
  const isIOSUA = /iphone|ipad|ipod/.test(userAgent);
  const isIPadDesktopUA = /macintosh/.test(userAgent) && (navigator.maxTouchPoints || 0) > 1;

  return isIOSUA || isIPadDesktopUA;
}
