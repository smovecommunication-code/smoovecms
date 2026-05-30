import type { MediaFile } from '../../domain/contentSchemas';
import { mediaRepository } from '../../repositories/mediaRepository';
import { resolveMediaRecordUrl, resolveMediaUrl } from '../../utils/mediaResolver';
import {
  MEDIA_REFERENCE_PREFIX,
  isMediaReference,
  isValidMediaFieldValue as isValidMediaFieldContract,
  mediaIdFromReference,
  mediaReferenceExists,
  toMediaReference,
} from '../../shared/contentContracts';

export { MEDIA_REFERENCE_PREFIX };

const FALLBACK_MEDIA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#eef2ff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#4f46e5" font-family="Arial,sans-serif" font-size="40">Media unavailable</text></svg>`;
const FALLBACK_MEDIA_DATA_URL = `data:image/svg+xml,${encodeURIComponent(FALLBACK_MEDIA_SVG)}`;

const toDeterministicFallbackUrl = (): string => FALLBACK_MEDIA_DATA_URL;

export const resolveRenderableMediaUrl = (url: string, _apiBaseUrl?: string): string => resolveMediaUrl(url);

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

    const mediaUrl = media ? resolveMediaRecordUrl(media) : '';
    if (mediaUrl) {
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
        url: resolveRenderableMediaUrl(mediaUrl),
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
