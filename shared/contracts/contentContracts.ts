export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MEDIA_REFERENCE_PREFIX = 'media:' as const;

const stripDiacritics = (value: unknown): string => `${value ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const normalizeSlug = (value: string | undefined, fallback = '', defaultSlug = ''): string => {
  const base = stripDiacritics(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || defaultSlug;
};

export const isValidSlug = (value: string | undefined): boolean => SLUG_PATTERN.test(`${value ?? ''}`.trim());

export const isHttpUrl = (value: string | undefined): boolean => {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isValidOptionalHttpUrl = (value: string | undefined): boolean => !value || !`${value}`.trim() || isHttpUrl(value);

export const isValidContentHref = (value: string | undefined): boolean => {
  if (typeof value !== 'string') return false;
  const href = value.trim();
  if (!href) return false;
  if (href.startsWith('#')) return href.length > 1;
  if (href.startsWith('/')) return true;
  return isHttpUrl(href);
};

export const isMediaReference = (value: string | undefined): boolean =>
  typeof value === 'string' && value.trim().startsWith(MEDIA_REFERENCE_PREFIX);

export const mediaIdFromReference = (value: string): string => `${value || ''}`.trim().slice(MEDIA_REFERENCE_PREFIX.length).trim();

export const toMediaReference = (mediaId: string): string => `${MEDIA_REFERENCE_PREFIX}${`${mediaId || ''}`.trim()}`;

export const mediaReferenceExists = (value: string | undefined, hasMediaById: (mediaId: string) => boolean): boolean => {
  if (!isMediaReference(value)) return false;
  const mediaId = mediaIdFromReference(value);
  return Boolean(mediaId) && hasMediaById(mediaId);
};

export const isValidMediaFieldValue = (
  value: string | undefined,
  options: { allowInlineText?: boolean; hasMediaById?: (mediaId: string) => boolean } = {},
): boolean => {
  const normalized = `${value || ''}`.trim();
  if (!normalized) return false;

  if (isMediaReference(normalized)) {
    if (!options.hasMediaById) return mediaIdFromReference(normalized).length > 0;
    return mediaReferenceExists(normalized, options.hasMediaById);
  }

  if (isHttpUrl(normalized)) return true;
  return Boolean(options.allowInlineText) && !normalized.includes('://');
};

export const requiredTrimmed = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
export const hasMinTrimmedLength = (value: unknown, min: number): boolean => requiredTrimmed(value).length >= min;
export const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => requiredTrimmed(item)).filter(Boolean) : [];

const contentContracts = {
  SLUG_PATTERN,
  MEDIA_REFERENCE_PREFIX,
  normalizeSlug,
  isValidSlug,
  isHttpUrl,
  isValidOptionalHttpUrl,
  isValidContentHref,
  isMediaReference,
  mediaIdFromReference,
  toMediaReference,
  mediaReferenceExists,
  isValidMediaFieldValue,
  requiredTrimmed,
  hasMinTrimmedLength,
  normalizeStringArray,
};

export default contentContracts;
