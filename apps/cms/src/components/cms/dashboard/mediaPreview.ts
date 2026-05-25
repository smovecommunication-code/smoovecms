import type { MediaFile } from '../../../domain/contentSchemas';
import { isMediaReferenceValue, mediaIdFromReference, resolveAssetReference, resolveRenderableMediaUrl } from '../../../features/media/assetReference';

export type CmsPreviewState = 'resolvable' | 'unresolved' | 'missing';
export type CmsPreviewSource = 'media-reference' | 'direct-url' | 'empty';

export interface CmsResolvedPreview {
  reference: string;
  src: string;
  alt: string;
  caption: string;
  state: CmsPreviewState;
  source: CmsPreviewSource;
  sourceLabel: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'neutral';
  mediaId?: string;
}

const isRenderableUrl = (value: string): boolean => /^https?:\/\//.test(value) || value.startsWith('data:image/') || value.startsWith('blob:') || value.startsWith('/');

export function resolveCmsPreviewReference(reference: string | undefined, fallbackAlt: string, fallbackQuery: string): CmsResolvedPreview {
  const normalizedReference = (reference || '').trim();
  const resolved = resolveAssetReference(normalizedReference, fallbackAlt, fallbackQuery);

  if (!normalizedReference) {
    return {
      ...resolved,
      state: 'missing',
      source: 'empty',
      sourceLabel: 'Aucune source',
      statusLabel: 'Manquant',
      statusTone: 'neutral',
    };
  }

  if (isMediaReferenceValue(normalizedReference)) {
    const mediaId = mediaIdFromReference(normalizedReference) || undefined;
    if (resolved.isFallback || !isRenderableUrl(resolved.src)) {
      const isArchived = resolved.mediaState === 'archived';
      return {
        ...resolved,
        mediaId,
        state: 'unresolved',
        source: 'media-reference',
        sourceLabel: 'Référence média',
        statusLabel: isArchived ? 'Archivé' : 'Non résolu',
        statusTone: 'warning',
      };
    }

    return {
      ...resolved,
      mediaId,
      state: 'resolvable',
      source: 'media-reference',
      sourceLabel: 'Référence média',
      statusLabel: 'Résolu',
      statusTone: 'success',
    };
  }

  return {
    ...resolved,
    state: isRenderableUrl(resolved.src) ? 'resolvable' : 'unresolved',
    source: 'direct-url',
    sourceLabel: 'URL directe',
    statusLabel: isRenderableUrl(resolved.src) ? 'Résolu' : 'Non résolu',
    statusTone: isRenderableUrl(resolved.src) ? 'success' : 'warning',
  };
}

export function resolveMediaLibraryThumbnail(file: MediaFile): { src: string | null; kind: 'image' | 'non-image' | 'missing' } {
  if (file.type !== 'image') {
    return { src: null, kind: 'non-image' };
  }

  const src = resolveRenderableMediaUrl(file.thumbnailUrl?.trim() || file.url?.trim() || '');
  if (!src) {
    return { src: null, kind: 'missing' };
  }

  return { src, kind: 'image' };
}
