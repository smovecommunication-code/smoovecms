import { describe, expect, it } from 'vitest';
import { resolveRenderableMediaUrl } from './assetReference';

describe('resolveRenderableMediaUrl', () => {
  it('keeps absolute urls unchanged', () => {
    expect(resolveRenderableMediaUrl('https://cdn.example.com/a.jpg', 'https://api.example.com')).toBe('https://cdn.example.com/a.jpg');
  });

  it('resolves root-relative media urls against API origin', () => {
    expect(resolveRenderableMediaUrl('/uploads/media/a.jpg', 'https://api.example.com/v1/content')).toBe('https://api.example.com/uploads/media/a.jpg');
  });

  it('resolves path-like relative media urls against API origin', () => {
    expect(resolveRenderableMediaUrl('uploads/media/a.jpg', 'https://api.example.com/v1/content')).toBe('https://api.example.com/uploads/media/a.jpg');
  });

  it('does not rewrite non-url labels', () => {
    expect(resolveRenderableMediaUrl('project cover image', 'https://api.example.com/v1/content')).toBe('project cover image');
  });
});
