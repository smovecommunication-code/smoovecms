import { describe, expect, it } from 'vitest';
import { getMetadataCompleteness, summarizeReferences, toDomainLabel, type BackendMediaReference } from './mediaGovernance';

describe('mediaGovernance', () => {
  it('summarizes backend references by domain and keeps actionable samples', () => {
    const references: BackendMediaReference[] = [
      { domain: 'blog', id: 'blog-1', field: 'mediaRoles.coverImage', label: 'Post A' },
      { domain: 'blog', id: 'blog-1', field: 'seo.socialImage', label: 'Post A' },
      { domain: 'project', id: 'project-1', field: 'mediaRoles.heroImage', label: 'Projet X' },
      { domain: 'settings', id: 'global', field: 'siteSettings.brandMedia.logo', label: 'Site settings' },
    ];

    const summary = summarizeReferences(references);

    expect(summary.total).toBe(4);
    expect(summary.byDomain).toEqual([
      { domain: 'blog', label: 'Blog', count: 2 },
      { domain: 'project', label: 'Projets', count: 1 },
      { domain: 'settings', label: 'Réglages', count: 1 },
    ]);
    expect(summary.sample[0]).toContain('Blog • Post A • mediaRoles.coverImage');
  });

  it('maps known and unknown domains safely', () => {
    expect(toDomainLabel('service')).toBe('Services');
    expect(toDomainLabel('unknown-domain')).toBe('unknown-domain');
  });

  it('derives metadata completeness indicators without requiring score semantics', () => {
    expect(getMetadataCompleteness({
      id: 'asset-1',
      type: 'image',
      url: 'https://cdn.example.com/asset-1.jpg',
      name: 'asset-1.jpg',
      size: 1200,
      uploadedDate: '2026-03-20T08:00:00.000Z',
      uploadedBy: 'ops',
      alt: 'Hero visual',
      caption: '',
      tags: ['homepage'],
    })).toEqual({ alt: true, caption: false, tags: true });

    expect(getMetadataCompleteness({
      id: 'asset-2',
      type: 'image',
      url: 'https://cdn.example.com/asset-2.jpg',
      name: 'asset-2.jpg',
      size: 1500,
      uploadedDate: '2026-03-20T08:00:00.000Z',
      uploadedBy: 'ops',
      alt: ' ',
      caption: ' ',
      tags: [],
    })).toEqual({ alt: false, caption: false, tags: false });
  });
});
