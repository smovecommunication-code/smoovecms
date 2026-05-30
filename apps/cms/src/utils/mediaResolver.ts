import type { MediaFile } from '../domain/contentSchemas';
import { RUNTIME_CONFIG } from '../config/runtimeConfig';

const DEFAULT_API_ORIGIN = 'https://smoveapi-1.onrender.com';
const HTTP_URL_PATTERN = /^https?:\/\//i;
const FORBIDDEN_RENDER_SCHEME_PATTERN = /^(?:blob|file|data):/i;
const LOCAL_DISK_PATH_PATTERN = /^(?:[a-zA-Z]:[\\/]|~[\\/]|\/Users\/|\/home\/|\/workspace\/|\/var\/|\/tmp\/|server\/data\/|api\/server\/data\/)/;

type MediaUrlCandidate = Partial<MediaFile> & {
  publicUrl?: string;
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

export const absolutizeMediaPath = (value: string): string => {
  const normalized = value.trim();
  if (isForbiddenRenderableValue(normalized)) return '';
  if (isSafeHttpUrl(normalized)) return normalized;

  const apiOrigin = toApiOrigin();
  if (normalized.startsWith('/uploads/')) return `${apiOrigin}${normalized}`;
  if (normalized.startsWith('uploads/')) return `${apiOrigin}/${normalized}`;
  return '';
};

export const resolveMediaRecordUrl = (media: MediaUrlCandidate | null | undefined): string => {
  if (!media || typeof media !== 'object') return '';

  const url = `${media.url || media.publicUrl || ''}`.trim();
  if (isSafeHttpUrl(url)) return url;

  const publicPath = `${media.publicPath || ''}`.trim();
  if (publicPath.startsWith('/uploads/')) return `${toApiOrigin()}${publicPath}`;
  if (publicPath.startsWith('uploads/')) return `${toApiOrigin()}/${publicPath}`;

  const filename = `${media.filename || ''}`.trim();
  if (filename && !isForbiddenRenderableValue(filename)) return `${toApiOrigin()}/uploads/${filename.replace(/^\/+/, '')}`;

  return '';
};

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
    const resolved = resolveMediaRecordUrl(value as MediaUrlCandidate);
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
    return resolveMediaUrl(matched, mediaList);
  }

  const byId = matchById(normalized, mediaList);
  if (byId) return resolveMediaUrl(byId, mediaList);

  if (isSafeHttpUrl(normalized) || normalized.startsWith('/uploads/') || normalized.startsWith('uploads/')) {
    return absolutizeMediaPath(normalized);
  }

  logUnresolved('unsupported value', normalized);
  return '';
};
