import type { MediaFile } from '../../domain/contentSchemas';
import { mediaRepository } from '../../repositories/mediaRepository';
import { RUNTIME_CONFIG } from '../../config/runtimeConfig';
import {
  MEDIA_REFERENCE_PREFIX,
  isMediaReference,
  isValidMediaFieldValue as isValidMediaFieldContract,
  mediaIdFromReference,
  mediaReferenceExists,
  toMediaReference,
} from '../../shared/contentContracts';

export { MEDIA_REFERENCE_PREFIX };

const HTTP_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
const FALLBACK_MEDIA_DATA_URL =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="%23eef2ff"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%234f46e5" font-family="Arial,sans-serif" font-size="40">Media unavailable</text></svg>';

const toApiOrigin = (apiBaseUrl: string): string => {
  if (!apiBaseUrl.startsWith('http://') && !apiBaseUrl.startsWith('https://')) {
    return '';
  }

  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return '';
  }
};

const toDeterministicFallbackUrl = (): string => FALLBACK_MEDIA_DATA_URL;

export const resolveRenderableMediaUrl = (url: string, apiBaseUrl = RUNTIME_CONFIG.apiBaseUrl): string => {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) return normalizedUrl;

  if (HTTP_SCHEME_PATTERN.test(normalizedUrl) || normalizedUrl.startsWith('//')) {
    return normalizedUrl;
  }

  if (!normalizedUrl.startsWith('/')) {
    const apiOrigin = toApiOrigin(apiBaseUrl);
    const looksLikeRelativeAssetPath =
      !normalizedUrl.includes(' ') &&
      /^[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(normalizedUrl) &&
      (normalizedUrl.includes('/') || normalizedUrl.startsWith('uploads') || normalizedUrl.startsWith('media'));
    if (looksLikeRelativeAssetPath && apiOrigin) {
      return `${apiOrigin}/${normalizedUrl.replace(/^\.?\//, '')}`;
    }
    return normalizedUrl;
  }

  const apiOrigin = toApiOrigin(apiBaseUrl);
  return apiOrigin ? `${apiOrigin}${normalizedUrl}` : normalizedUrl;
};

export interface ResolvedAssetReference {
  reference: string;
  src: string;
  alt: string;
  caption: string;
  isMediaAsset: boolean;
  isFallback: boolean;
  mediaState: 'resolved' | 'missing' | 'archived' | 'direct-url' | 'fallback';
}

export interface CanonicalResolvedMedia {
  reference: string;
  url: string;
  alt: string;
  isValid: boolean;
  mediaState: ResolvedAssetReference['mediaState'];
  mediaType: MediaFile['type'] | 'url' | 'fallback';
}

const normalizeText = (value: string | undefined, fallback: string): string => {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
};

export const isMediaReferenceValue = (value: string | undefined): boolean => isMediaReference(value);

export const toMediaReferenceValue = (mediaId: string): string => toMediaReference(mediaId);

export { mediaIdFromReference };

export const mediaReferenceExistsInRepository = (reference: string): boolean =>
  mediaReferenceExists(reference, (mediaId) => Boolean(mediaRepository.getById(mediaId)));

export const isValidMediaFieldValue = (value: string): boolean =>
  isValidMediaFieldContract(value, {
    allowInlineText: true,
    hasMediaById: (mediaId) => Boolean(mediaRepository.getById(mediaId)),
  });

export const resolveCanonicalMedia = (
  reference: string | undefined,
  fallbackAlt: string,
): CanonicalResolvedMedia => {
  const normalizedReference = (reference || '').trim();

  if (isMediaReferenceValue(normalizedReference)) {
    const mediaId = mediaIdFromReference(normalizedReference);
    const media: MediaFile | undefined = mediaId ? mediaRepository.getById(mediaId) : undefined;

    if (media?.url) {
      if (media.archivedAt) {
        return {
          reference: normalizedReference,
          url: toDeterministicFallbackUrl(),
          alt: fallbackAlt,
          isValid: false,
          mediaState: 'archived',
          mediaType: media.type,
        };
      }

      return {
        reference: normalizedReference,
        url: resolveRenderableMediaUrl(media.url),
        alt: normalizeText(media.alt, fallbackAlt),
        isValid: true,
        mediaState: 'resolved',
        mediaType: media.type,
      };
    }

    return {
      reference: normalizedReference,
      url: toDeterministicFallbackUrl(),
      alt: fallbackAlt,
      isValid: false,
      mediaState: 'missing',
      mediaType: 'fallback',
    };
  }

  if (normalizedReference) {
    const resolvedUrl = resolveRenderableMediaUrl(normalizedReference);
    const isValid = Boolean(resolvedUrl) && !isMediaReferenceValue(resolvedUrl);
    return {
      reference: normalizedReference,
      url: isValid ? resolvedUrl : toDeterministicFallbackUrl(),
      alt: fallbackAlt,
      isValid,
      mediaState: 'direct-url',
      mediaType: 'url',
    };
  }

  return {
    reference: '',
    url: toDeterministicFallbackUrl(),
    alt: fallbackAlt,
    isValid: false,
    mediaState: 'fallback',
    mediaType: 'fallback',
  };
};

export const resolveAssetReference = (
  reference: string | undefined,
  fallbackAlt: string,
  fallbackQuery: string,
): ResolvedAssetReference => {
  const canonical = resolveCanonicalMedia(reference, fallbackAlt || fallbackQuery);

  return {
    reference: canonical.reference || fallbackQuery,
    src: canonical.url,
    alt: canonical.alt,
    caption: canonical.alt,
    isMediaAsset: isMediaReferenceValue(canonical.reference),
    isFallback: !canonical.isValid,
    mediaState: canonical.mediaState,
  };
};
