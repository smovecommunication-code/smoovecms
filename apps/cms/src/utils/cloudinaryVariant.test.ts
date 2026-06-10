import { describe, expect, it } from 'vitest';
import { getCloudinaryVariant } from './cloudinaryVariant';
describe('getCloudinaryVariant', () => {
  it('creates contain previews without modifying non-Cloudinary URLs', () => {
    expect(getCloudinaryVariant('https://res.cloudinary.com/demo/image/upload/sample.png', 'contain')).toContain('/upload/c_fit,w_800,h_800,f_auto,q_auto/');
    expect(getCloudinaryVariant('/uploads/sample.png', 'contain')).toBe('/uploads/sample.png');
  });
});
