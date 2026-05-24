import { logWarn } from '../utils/observability';

function normalizeApiBaseUrl(rawValue: string | undefined): string {
  const candidate = (rawValue ?? '/api/v1').trim();
  if (candidate.length === 0) {
    return '/api/v1';
  }

  if (candidate.startsWith('http://') || candidate.startsWith('https://') || candidate.startsWith('/')) {
    return candidate.replace(/\/$/, '');
  }

  logWarn({
    scope: 'config',
    event: 'invalid_api_base_url_format',
    details: { configuredValue: candidate },
  });
  return '/api/v1';
}

function parseTimeout(rawValue: string | undefined, defaultValue: number): number {
  if (!rawValue) return defaultValue;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 1000) {
    logWarn({
      scope: 'config',
      event: 'invalid_request_timeout',
      details: { configuredValue: rawValue, fallback: defaultValue },
    });
    return defaultValue;
  }
  return parsed;
}

export const RUNTIME_CONFIG = {
  apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  requestTimeoutMs: parseTimeout(import.meta.env.VITE_REQUEST_TIMEOUT_MS, 10000),
};
