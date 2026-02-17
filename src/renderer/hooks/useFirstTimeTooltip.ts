// useFirstTimeTooltip - First-time guide tooltips for marker panel (localStorage)
const STORAGE_KEY = 'marker_panel_tooltips_seen';

export function getSeenTooltips(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markTooltipSeen(id: string): void {
  try {
    const seen = getSeenTooltips();
    seen.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  } catch {}
}

export function hasSeenTooltip(id: string): boolean {
  return getSeenTooltips().has(id);
}
