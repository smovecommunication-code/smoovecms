import { describe, expect, it } from 'vitest';
import { parseHashRoute, resolveCmsSectionFromRoute } from './cmsRouting';

describe('cmsRouting', () => {
  it('resolves services section from cms route', () => {
    expect(resolveCmsSectionFromRoute('cms/services')).toBe('services');
    expect(resolveCmsSectionFromRoute('cms-services')).toBe('services');
  });

  it('keeps overview fallback for unknown section', () => {
    expect(resolveCmsSectionFromRoute('cms/unknown')).toBe('overview');
  });

  it('normalizes hash routes without query params', () => {
    expect(parseHashRoute('#cms/services?from=test')).toBe('cms/services');
  });
});
