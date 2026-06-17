import type { MediaFile } from '../domain/contentSchemas';
import { RUNTIME_CONFIG } from '../config/runtimeConfig';

const DEFAULT_API_ORIGIN = 'https://smoveapi-1.onrender.com';
export const API_ORIGIN = DEFAULT_API_ORIGIN;
const HTTP_URL_PATTERN = /^https?:\/\//i;
const FORBIDDEN_RENDER_SCHEME_PATTERN = /^(?:blob|file|data):/i;
const LOCAL_DISK_PATH_PATTERN = /^(?:[a-zA-Z]:[\\/]|~[\\/]|\/Users\/|\/home\/|\/workspace\/|\/var\/|\/tmp\/|server\/data\/|api\/server\/data\/)/;

type MediaUrlCandidate = Partial<MediaFile> & {
  secureUrl?: string;
  publicUrl?: string;
  posterUrl?: string;
  path?: string;
};

const toApiOrigin = (): string => {
  const configured = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.trim() || RUNTIME_CONFIG.apiBaseUrl;
  if (!configured) return DEFAULT_API_ORIGIN;
  try {
    return new URL(configured).origin;
  } catch {
    return DEFAULT_API_ORIGIN;
  }
};

const isDev = () => import.meta.env.DEV;
const logUnresolved = (reason: string, value: unknown) => {
  if (isDev()) console.warn(`[cms-media-resolver] ${reason}`, value);
};

const isSafeHttpUrl = (value: string): boolean => HTTP_URL_PATTERN.test(value);
const isCloudinaryUrl = (value: string): boolean => isSafeHttpUrl(value) && /\bres\.cloudinary\.com\b/i.test(value);

const isForbiddenRenderableValue = (value: string): boolean => {
  const normalized = value.trim();
  return (
    !normalized ||
    normalized.startsWith('//') ||
    FORBIDDEN_RENDER_SCHEME_PATTERN.test(normalized) ||
    normalized.startsWith('media:') ||
    LOCAL_DISK_PATH_PATTERN.test(normalized) ||
    normalized.includes('\\')
  );
};


export const extractUploadPublicPath = (value: unknown): string => {
  const normalized = `${value || ''}`.trim().replace(/\\/g, '/');
  if (!normalized) return '';
  const uploadsIndex = normalized.lastIndexOf('/uploads/');
  if (uploadsIndex >= 0) return normalized.slice(uploadsIndex);
  const dataUploadsIndex = normalized.lastIndexOf('data/uploads/');
  if (dataUploadsIndex >= 0) return `/uploads/${normalized.slice(dataUploadsIndex + 'data/uploads/'.length)}`;
  if (normalized.startsWith('uploads/')) return `/${normalized}`;
  return '';
};

export const absolutizeMediaPath = (value: string): string => {
  const normalized = value.trim();
  if (isSafeHttpUrl(normalized)) return normalized;

  const apiOrigin = toApiOrigin();
  const extractedPath = extractUploadPublicPath(normalized);
  if (extractedPath) return `${apiOrigin}${extractedPath}`;
  if (isForbiddenRenderableValue(normalized)) return '';
  if (normalized.startsWith('/uploads/')) return `${apiOrigin}${normalized}`;
  if (normalized.startsWith('uploads/')) return `${apiOrigin}/${normalized}`;
  return '';
};

export const resolveCmsMediaUrl = (input: unknown, mediaList: MediaFile[] = []): string => {
  if (!input) return '';

  if (typeof input === 'string') {
    const normalized = input.trim();
    if (!normalized) return '';
    if (isSafeHttpUrl(normalized)) return normalized;
    if (normalized.startsWith('/uploads/') || normalized.startsWith('uploads/')) return absolutizeMediaPath(normalized);

    if (normalized.startsWith('media:')) {
      const id = normalized.slice(6).trim();
      const found = mediaList.find((media) => String(media.id) === id && !media.archivedAt);
      return found ? resolveCmsMediaUrl(found, mediaList) : '';
    }

    const found = mediaList.find((media) => String(media.id) === normalized && !media.archivedAt);
    return found ? resolveCmsMediaUrl(found, mediaList) : '';
  }

  if (typeof input !== 'object') return '';
  const media = input as MediaUrlCandidate & { storagePath?: string };
  const cloudinaryCandidates = [media.secureUrl, media.url, media.thumbnailUrl, media.posterUrl, media.publicUrl]
    .filter((candidate): candidate is string => typeof candidate === 'string' && isCloudinaryUrl(candidate));
  const candidates = [...cloudinaryCandidates, media.secureUrl, media.thumbnailUrl, media.posterUrl, media.url, media.publicUrl, media.publicPath, media.path, media.storagePath];
  for (const candidate of candidates) {
    const resolved = typeof candidate === 'string' ? absolutizeMediaPath(candidate) : '';
    if (resolved) return resolved;
  }

  const filename = `${media.filename || ''}`.trim().replace(/^uploads\//, '');
  return filename && !isForbiddenRenderableValue(filename)
    ? `${toApiOrigin()}/uploads/${filename.replace(/^\/+/, '')}`
    : '';
};

export const resolveMediaRecordUrl = (media: MediaUrlCandidate | null | undefined): string =>
  resolveCmsMediaUrl(media);
export const normalizeMediaReference = (value: unknown): string => {
  const normalized = `${value || ''}`.trim();
  if (!normalized) return '';
  if (normalized.startsWith('media:')) return `media:${normalized.slice(6).trim()}`;
  if (isSafeHttpUrl(normalized)) return normalized;
  if (normalized.startsWith('/uploads/') || normalized.startsWith('uploads/')) return absolutizeMediaPath(normalized);
  if (/^[a-zA-Z0-9_-]{6,}$/.test(normalized)) return `media:${normalized}`;
  return '';
};

const matchById = (id: string, mediaList: MediaFile[]): MediaFile | null =>
  mediaList.find((item) => item.id === id && !item.archivedAt) ?? null;

export const resolveMediaUrl = (value: unknown, mediaList: MediaFile[] = []): string => {
  if (value && typeof value === 'object') {
    const resolved = resolveCmsMediaUrl(value, mediaList);
    if (!resolved) logUnresolved('unrenderable media record', value);
    return resolved;
  }

  const normalized = `${value || ''}`.trim();
  if (!normalized) return '';

  if (normalized.startsWith('media:')) {
    const mediaId = normalized.slice(6).trim();
    const matched = mediaId ? matchById(mediaId, mediaList) : null;
    if (!matched) {
      logUnresolved('missing media ref', normalized);
      return '';
    }
    return resolveCmsMediaUrl(matched, mediaList);
  }

  const byId = matchById(normalized, mediaList);
  if (byId) return resolveCmsMediaUrl(byId, mediaList);

  if (isSafeHttpUrl(normalized) || normalized.startsWith('/uploads/') || normalized.startsWith('uploads/')) {
    return absolutizeMediaPath(normalized);
  }

  logUnresolved('unsupported value', normalized);
  return '';
};
