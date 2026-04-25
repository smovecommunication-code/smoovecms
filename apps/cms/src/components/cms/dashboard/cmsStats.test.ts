import { describe, expect, it } from 'vitest';
import { deriveDashboardCmsStats } from './cmsStats';

describe('deriveDashboardCmsStats', () => {
  it('derives project count from the rendered projects collection source', () => {
    const stats = deriveDashboardCmsStats({
      projects: [{ id: 'p1' } as never, { id: 'p2' } as never],
      posts: [],
      mediaCount: 0,
      now: Date.parse('2026-04-04T00:00:00.000Z'),
    });

    expect(stats.projectCount).toBe(2);
  });

  it('counts recently updated blog entries within 7 days', () => {
    const stats = deriveDashboardCmsStats({
      projects: [],
      mediaCount: 3,
      now: Date.parse('2026-04-10T00:00:00.000Z'),
      posts: [
        { status: 'published', publishedDate: '2026-04-09T00:00:00.000Z' } as never,
        { status: 'published', publishedDate: '2026-03-20T00:00:00.000Z' } as never,
        { status: 'draft', publishedDate: '2026-04-08T00:00:00.000Z' } as never,
      ],
    });

    expect(stats.blogPostCount).toBe(3);
    expect(stats.mediaCount).toBe(3);
    expect(stats.publishedCount).toBe(2);
    expect(stats.recentlyUpdatedCount).toBe(2);
  });
});
