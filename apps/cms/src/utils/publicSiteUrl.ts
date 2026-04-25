const DEFAULT_PUBLIC_SITE_URL = 'http://localhost:5173/#home';

function ensureHomeHash(url: URL): string {
  if (!url.hash) {
    url.hash = '#home';
  }
  return url.toString();
}

function normalizeAbsoluteUrl(rawValue: string | undefined): string | null {
  const candidate = rawValue?.trim();
  if (!candidate) return null;
  try {
    const baseCandidate = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    const normalized = new URL(baseCandidate);
    if (!/^https?:$/i.test(normalized.protocol)) return null;
    return ensureHomeHash(normalized);
  } catch {
    return null;
  }
}

function inferPublicSiteUrlFromRuntime(): string | null {
  if (typeof window === 'undefined') return null;

  const { protocol, hostname, origin } = window.location;
  const normalizedProtocol = protocol === 'http:' || protocol === 'https:' ? protocol : 'https:';

  if (hostname === '127.0.0.1' || hostname === 'localhost') {
    return DEFAULT_PUBLIC_SITE_URL;
  }

  if (hostname.startsWith('cms.')) {
    return `${normalizedProtocol}//${hostname.slice(4)}/#home`;
  }

  return `${origin}/#home`;
}

export function getPublicSiteUrl(): string {
  const explicit = normalizeAbsoluteUrl(import.meta.env.VITE_PUBLIC_SITE_URL);
  if (explicit) return explicit;

  const legacy = normalizeAbsoluteUrl(import.meta.env.VITE_PUBLIC_APP_URL);
  if (legacy) return legacy;

  const inferred = inferPublicSiteUrlFromRuntime();
  if (inferred) return inferred;

  return DEFAULT_PUBLIC_SITE_URL;
}
