import { logWarn } from '../../utils/observability';

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export function readFromStorage<T>(
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
  options?: { persistFallback?: boolean },
): T {
  if (!isBrowser()) return fallback;

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    if (options?.persistFallback) {
      writeToStorage(key, fallback);
    }
    return fallback;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(key);
    if (options?.persistFallback) {
      writeToStorage(key, fallback);
    }
    return fallback;
  }

  if (!isValid(parsed)) {
    if (import.meta.env.DEV) {
      console.warn(`[storage] Invalid payload for key "${key}", fallback applied.`);
    }
    window.localStorage.removeItem(key);
    if (options?.persistFallback) {
      writeToStorage(key, fallback);
    }
    return fallback;
  }

  return parsed;
}

export function writeToStorage<T>(key: string, value: T): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logWarn({
      scope: 'storage',
      event: 'write_failed',
      error,
      details: { key },
    });
  }
}

export function removeFromStorage(key: string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
}

export function listStorageKeys(): string[] {
  if (!isBrowser()) return [];
  return Object.keys(window.localStorage);
}
