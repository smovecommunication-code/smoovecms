import { describe, expect, it } from 'vitest';
import { resolveCmsMediaUrl } from './mediaResolver';

describe('resolveCmsMediaUrl', () => {
  const mediaList = [{
    id: 'asset-1', type: 'image' as const, url: '/uploads/2026/06/asset.jpg', thumbnailUrl: '', name: 'asset.jpg',
    size: 1, uploadedDate: '2026-06-09T00:00:00.000Z', uploadedBy: 'admin', tags: [],
  }];

  it('resolves upload paths, media references, IDs, and media records through the API origin', () => {
    const expected = 'https://smoveapi-1.onrender.com/uploads/2026/06/asset.jpg';
    expect(resolveCmsMediaUrl('/uploads/2026/06/asset.jpg')).toBe(expected);
    expect(resolveCmsMediaUrl('uploads/2026/06/asset.jpg')).toBe(expected);
    expect(resolveCmsMediaUrl('media:asset-1', mediaList)).toBe(expected);
    expect(resolveCmsMediaUrl('asset-1', mediaList)).toBe(expected);
    expect(resolveCmsMediaUrl(mediaList[0], mediaList)).toBe(expected);
  });

  it('uses the first renderable record field instead of returning a broken local value', () => {
    expect(resolveCmsMediaUrl({ url: 'media:missing', thumbnailUrl: '/uploads/thumb.jpg' })).toBe(
      'https://smoveapi-1.onrender.com/uploads/thumb.jpg',
    );
  });
});
