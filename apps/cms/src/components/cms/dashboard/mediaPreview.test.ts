import { beforeEach, describe, expect, it } from 'vitest';
import { mediaRepository } from '../../../repositories/mediaRepository';
import { toMediaReferenceValue } from '../../../features/media/assetReference';
import { resolveCmsPreviewReference, resolveMediaLibraryThumbnail } from './mediaPreview';

const resetMediaRepository = () => {
  mediaRepository.replaceAll([]);
};

describe('mediaPreview', () => {
  beforeEach(() => {
    resetMediaRepository();
  });

  it('resolves media:asset-id references with the same runtime resolver path used publicly', () => {
    mediaRepository.save({
      id: 'asset-featured',
      type: 'image',
      url: 'https://cdn.example.com/blog-featured.jpg',
      thumbnailUrl: 'https://cdn.example.com/blog-featured-thumb.jpg',
      name: 'blog-featured.jpg',
      size: 1200,
      uploadedDate: '2026-03-23T10:00:00.000Z',
      uploadedBy: 'editor',
      alt: 'Blog featured',
      caption: 'Blog cover',
      tags: ['blog'],
    });

    const preview = resolveCmsPreviewReference(toMediaReferenceValue('asset-featured'), 'Fallback alt', 'blog article image');

    expect(preview.state).toBe('resolvable');
    expect(preview.source).toBe('media-reference');
    expect(preview.src).toBe('https://cdn.example.com/blog-featured.jpg');
    expect(preview.statusLabel).toBe('Résolu');
  });

  it('marks unresolved media references clearly before save/publish', () => {
    const preview = resolveCmsPreviewReference('media:archived-or-missing', 'Fallback alt', 'blog article image');

    expect(preview.source).toBe('media-reference');
    expect(preview.state).toBe('unresolved');
    expect(preview.statusLabel).toBe('Non résolu');
  });

  it('marks archived media references explicitly in CMS previews', () => {
    mediaRepository.save({
      id: 'asset-archived',
      type: 'image',
      url: 'https://cdn.example.com/archived.jpg',
      thumbnailUrl: 'https://cdn.example.com/archived-thumb.jpg',
      name: 'archived.jpg',
      size: 1300,
      uploadedDate: '2026-03-23T10:00:00.000Z',
      uploadedBy: 'editor',
      alt: 'Archived image',
      caption: 'Archived',
      tags: ['legacy'],
      archivedAt: '2026-03-24T08:00:00.000Z',
    });

    const preview = resolveCmsPreviewReference(toMediaReferenceValue('asset-archived'), 'Fallback alt', 'blog article image');
    expect(preview.source).toBe('media-reference');
    expect(preview.state).toBe('unresolved');
    expect(preview.statusLabel).toBe('Archivé');
  });

  it('supports direct URL previews and labels their source explicitly', () => {
    const preview = resolveCmsPreviewReference('https://images.example.com/social.jpg', 'Fallback alt', 'blog article image');

    expect(preview.source).toBe('direct-url');
    expect(preview.state).toBe('resolvable');
    expect(preview.sourceLabel).toBe('URL directe');
  });

  it('uses real thumbnails in media library cards for image assets', () => {
    const preview = resolveMediaLibraryThumbnail({
      id: 'media-1',
      type: 'image',
      url: 'https://cdn.example.com/hero.jpg',
      thumbnailUrl: 'https://cdn.example.com/hero-thumb.jpg',
      name: 'hero.jpg',
      size: 3000,
      uploadedDate: '2026-03-23T10:00:00.000Z',
      uploadedBy: 'editor',
      tags: [],
    });

    expect(preview).toEqual({ src: 'https://cdn.example.com/hero-thumb.jpg', kind: 'image' });
  });

  it('preserves non-image fallback in media library without broken image tags', () => {
    const preview = resolveMediaLibraryThumbnail({
      id: 'media-doc',
      type: 'document',
      url: 'https://cdn.example.com/spec.pdf',
      name: 'spec.pdf',
      size: 4000,
      uploadedDate: '2026-03-23T10:00:00.000Z',
      uploadedBy: 'editor',
      tags: [],
    });

    expect(preview).toEqual({ src: null, kind: 'non-image' });
  });
});
