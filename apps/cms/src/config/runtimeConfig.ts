import { logWarn } from '../utils/observability';

const DEFAULT_API_ORIGIN = 'https://smoveapi-1.onrender.com';
const DEFAULT_API_BASE_URL = '/api/v1';

function normalizeApiBaseUrl(rawValue: string | undefined): string {
  const candidate = (rawValue ?? DEFAULT_API_BASE_URL).trim();
  if (candidate.length === 0) {
    return DEFAULT_API_BASE_URL;
  }
  if (candidate.startsWith('/')) {
    return candidate.replace(/\/$/, '');
  }

  logWarn({
    scope: 'config',
    event: 'invalid_api_base_url_format',
    details: { configuredValue: candidate },
  });
  return DEFAULT_API_BASE_URL;
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

function normalizeApiOrigin(rawValue: string | undefined): string {
  const candidate = (rawValue ?? DEFAULT_API_ORIGIN).trim();
  if (!candidate) return DEFAULT_API_ORIGIN;
  try {
    const normalized = new URL(candidate).origin;
    if (normalized.includes('localhost') || normalized.includes('127.0.0.1')) {
      logWarn({ scope: 'config', event: 'localhost_api_origin_rejected', details: { configuredValue: candidate } });
      return DEFAULT_API_ORIGIN;
    }
    return normalized;
  } catch {
    logWarn({ scope: 'config', event: 'invalid_api_origin', details: { configuredValue: candidate } });
    return DEFAULT_API_ORIGIN;
  }
}

const API_ORIGIN = normalizeApiOrigin(import.meta.env.VITE_API_ORIGIN);
const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
const API_URL = `${API_ORIGIN}${API_BASE_URL}`;

export const RUNTIME_CONFIG = {
  apiBaseUrl: API_URL,
  requestTimeoutMs: parseTimeout(import.meta.env.VITE_REQUEST_TIMEOUT_MS, 10000),
};
