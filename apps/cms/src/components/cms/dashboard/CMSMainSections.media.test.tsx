import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MediaSection } from './CMSMainSections';
import type { MediaFile } from '../../../domain/contentSchemas';

const sampleMedia: MediaFile = {
  id: 'media-1',
  name: 'hero.jpg',
  title: 'Hero image',
  label: 'Hero image',
  type: 'image',
  url: 'https://cdn.example.com/hero.jpg',
  thumbnailUrl: 'https://cdn.example.com/hero.jpg',
  size: 2048,
  uploadedDate: '2026-01-01T00:00:00.000Z',
  uploadedBy: 'admin-1',
  alt: 'Hero image alt',
  caption: 'Hero caption',
  tags: ['hero'],
  source: 'content-store',
  metadata: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
};

describe('MediaSection', () => {
  it('renders real media records and exposes backend refresh', () => {
    const html = renderToStaticMarkup(
      <MediaSection
        mediaQuery=""
        setMediaQuery={vi.fn()}
        setSelectedMediaId={vi.fn()}
        isUploadingMedia={false}
        handleMediaUpload={async () => {}}
        canEditContent
        mediaUploadError=""
        filteredMediaFiles={[sampleMedia]}
        loadMediaFromBackend={async () => {}}
        selectedMediaId="media-1"
        selectedMedia={sampleMedia}
        authoritativeReferences={[]}
        authoritativeReferencesLoading={false}
        authoritativeReferencesError=""
        localFallbackUsages={[]}
        canDeleteContent
        deleteMedia={vi.fn()}
      />,
    );

    expect(html).toContain('Rafraîchir backend');
    expect(html).toContain('Hero image');
    expect(html).toContain('content-store');
    expect(html).toContain('media:media-1');
    expect(html).toContain('Supprimer');
  });
});
