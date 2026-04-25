import { describe, expect, it } from 'vitest';
import type { ContentHealthSummary } from '../../../utils/contentApi';
import { deriveDashboardReadinessSnapshot } from './contentHealthSummary';

const makeHealth = (overrides: Partial<ContentHealthSummary> = {}): ContentHealthSummary => ({
  publication: {
    blog: { draft: 0, in_review: 0, published: 2, archived: 0 },
    projects: { draft: 0, in_review: 0, published: 1, archived: 0 },
    services: { draft: 0, in_review: 0, published: 1, archived: 0 },
  },
  quality: {
    missingPublishedMedia: { blog: 1, projects: 0, services: 1 },
    seoIncomplete: { blog: 0, projects: 1, services: 0 },
    invalidServiceRoutes: 1,
    routeCollisions: 1,
    unresolvedMediaReferences: 2,
    unresolvedPublishedCriticalMedia: {
      blogCard: 1,
      projectCard: 1,
      projectHero: 1,
      projectGallery: 0,
      archivedReferencedByPublished: 1,
    },
    mediaMissingAlt: 0,
    missingBrandAssets: 0,
    legacyFieldUsage: { blog: 1, projects: 0, services: 1 },
  },
  launchReadiness: {
    blockers: ['invalid_service_routes'],
    summary: {
      blockerCount: 3,
      warningCount: 4,
      publishReadyCount: 2,
      publishedCount: 4,
    },
    topIssues: [],
  },
  mediaRolePresets: ['cardImage', 'heroImage'],
  releaseReadinessChecks: [
    { id: 'check-1', level: 'blocker', status: 'failed', message: 'x', checkedAt: '2026-04-11T00:00:00.000Z' },
    { id: 'check-2', level: 'warning', status: 'passed', message: 'y', checkedAt: '2026-04-11T00:00:00.000Z' },
  ],
  ...overrides,
});

describe('deriveDashboardReadinessSnapshot', () => {
  it('maps readiness summary into compact overview counts', () => {
    const snapshot = deriveDashboardReadinessSnapshot(makeHealth());
    expect(snapshot).toEqual({
      blockerCount: 3,
      warningCount: 4,
      publishReadyCount: 2,
      publishedCount: 4,
      unresolvedRouteCount: 2,
      unresolvedMediaCount: 6,
      failedReleaseChecks: 1,
    });
  });

  it('falls back safely when launch summary is absent', () => {
    const snapshot = deriveDashboardReadinessSnapshot(makeHealth({
      launchReadiness: { blockers: ['a', 'b'] },
    }));

    expect(snapshot.blockerCount).toBe(2);
    expect(snapshot.warningCount).toBe(0);
    expect(snapshot.publishedCount).toBe(4);
  });
});
