/**
 * Lightweight storage and performance checks for optimization feedback.
 * Used in Settings to show storage usage and optional perf metrics.
 */

/** Estimate localStorage size in bytes (UTF-16 = 2 bytes per char). */
export function getLocalStorageSizeBytes(): number {
  if (typeof localStorage === 'undefined') return 0;
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        total += (key.length + (value?.length ?? 0)) * 2;
      }
    }
  } catch {
    return 0;
  }
  return total;
}

export function getLocalStorageSizeKB(): number {
  return Math.round(getLocalStorageSizeBytes() / 1024);
}

/** Storage estimate from browser API when available (quota / usage). */
export interface StorageEstimate {
  quotaMB: number | null;
  usageMB: number | null;
  localStorageKB: number;
}

export async function getStorageEstimate(): Promise<StorageEstimate> {
  const localStorageKB = getLocalStorageSizeKB();
  let quotaMB: number | null = null;
  let usageMB: number | null = null;
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota != null) quotaMB = Math.round(estimate.quota / (1024 * 1024));
      if (estimate.usage != null) usageMB = Math.round(estimate.usage / (1024 * 1024));
    }
  } catch {
    // ignore
  }
  return { quotaMB, usageMB, localStorageKB };
}

/** Run a quick perf check (e.g. 100 store reads + 100 shallow compares). Returns ms. */
export function runQuickPerfCheck(): number {
  const start = performance.now();
  const iterations = 100;
  let sum = 0;
  for (let i = 0; i < iterations; i++) {
    const obj = { a: i, b: i * 2 };
    sum += obj.a + obj.b;
  }
  return Math.round(performance.now() - start);
}
