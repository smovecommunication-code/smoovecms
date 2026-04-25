import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchNewsletterSubscribers } from './newsletterApi';

describe('cms newsletter api', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns authoritative list + summary payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          items: [{ id: 'sub_1', email: 'john@example.com', status: 'active', source: 'footer', subscribedAt: '2026-01-02T00:00:00.000Z', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' }],
          pagination: { page: 1, limit: 50, total: 1, pages: 1 },
          summary: { total: 1, active: 1, unsubscribed: 0 },
        },
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchNewsletterSubscribers({ status: 'all' });
    expect(result.items).toHaveLength(1);
    expect(result.summary.active).toBe(1);

    const lastCall = fetchMock.mock.calls.at(-1);
    expect(lastCall?.[1]).toMatchObject({ cache: 'no-store', credentials: 'include' });
  });

  it('falls back to empty summary when API omits counters', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { items: [], pagination: { page: 1, limit: 50, total: 0, pages: 1 } } }),
      })),
    );

    const result = await fetchNewsletterSubscribers();
    expect(result.summary).toEqual({ total: 0, active: 0, unsubscribed: 0 });
  });
});
