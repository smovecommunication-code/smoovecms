import { describe, expect, it } from 'vitest';
import { resolveRenderableMediaUrl } from './assetReference';

describe('resolveRenderableMediaUrl', () => {
  it('keeps absolute urls unchanged', () => {
    expect(resolveRenderableMediaUrl('https://cdn.example.com/a.jpg', 'https://api.example.com')).toBe('https://cdn.example.com/a.jpg');
  });

  it('resolves root-relative media urls against API origin', () => {
    expect(resolveRenderableMediaUrl('/uploads/media/a.jpg')).toBe('https://smoveapi-1.onrender.com/uploads/media/a.jpg');
  });

  it('resolves path-like relative media urls against API origin', () => {
    expect(resolveRenderableMediaUrl('uploads/media/a.jpg')).toBe('https://smoveapi-1.onrender.com/uploads/media/a.jpg');
  });

  it('does not render non-url labels, blob URLs, or local disk paths', () => {
    expect(resolveRenderableMediaUrl('project cover image')).toBe('');
    expect(resolveRenderableMediaUrl('blob:https://example.com/asset')).toBe('');
    expect(resolveRenderableMediaUrl('/tmp/uploads/a.jpg')).toBe('');
  });
});
