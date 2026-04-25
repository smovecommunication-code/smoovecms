import { describe, expect, it } from 'vitest';
import {
  isValidCmsHref,
  isValidHttpUrl,
  isValidMediaField,
  parseManagedTaxonomyInput,
  toDateTimeLocalValue,
  toIsoDateTime,
} from './cmsValidation';

describe('cmsValidation helpers', () => {
  it('validates HTTP/S urls only', () => {
    expect(isValidHttpUrl('https://example.com')).toBe(true);
    expect(isValidHttpUrl('http://example.com')).toBe(true);
    expect(isValidHttpUrl('ftp://example.com')).toBe(false);
    expect(isValidHttpUrl('not-a-url')).toBe(false);
  });

  it('validates CMS href semantics', () => {
    expect(isValidCmsHref('#services')).toBe(true);
    expect(isValidCmsHref('/contact')).toBe(true);
    expect(isValidCmsHref('https://example.com/page')).toBe(true);
    expect(isValidCmsHref('#')).toBe(false);
    expect(isValidCmsHref('javascript:alert(1)')).toBe(false);
    expect(isValidCmsHref('')).toBe(false);
  });

  it('deduplicates managed taxonomy entries case-insensitively', () => {
    const entries = parseManagedTaxonomyInput(' Marketing  Digital\nmarketing digital\nSEO\n seo ');
    expect(entries).toEqual(['Marketing Digital', 'SEO']);
  });

  it('validates media field references using shared media utility', () => {
    expect(isValidMediaField('media:asset-123')).toBe(true);
    expect(isValidMediaField('https://example.com/image.jpg')).toBe(true);
    expect(isValidMediaField('invalid-reference')).toBe(true);
  });

  it('converts between ISO and datetime-local values', () => {
    const iso = '2025-12-31T10:20:00.000Z';
    expect(toDateTimeLocalValue(iso)).toBe('2025-12-31T10:20');
    expect(toDateTimeLocalValue('bad')).toBe('');

    expect(toIsoDateTime('2025-12-31T10:20')).toBeTruthy();
    expect(toIsoDateTime('  ')).toBeNull();
    expect(toIsoDateTime('bad-value')).toBeNull();
  });
});
