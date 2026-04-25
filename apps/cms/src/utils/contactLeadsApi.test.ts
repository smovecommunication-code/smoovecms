import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchContactLeads } from './contactLeadsApi';

describe('cms contact leads api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns items and summary from admin endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              items: [{ id: 'lead_1', email: 'john@example.com', name: 'John', subject: 'Quote', message: 'Hello', source: 'project', delivered: true, deliveryStatus: 'sent', createdAt: '2026-01-01T00:00:00.000Z' }],
              summary: { total: 1, received: 0, sent: 1, failed: 0, disabled: 0 },
              pagination: { page: 1, limit: 50, total: 1, pages: 1 },
            },
          }),
        }) as Response,
      ),
    );

    const result = await fetchContactLeads({ source: 'project' });

    expect(result.items).toHaveLength(1);
    expect(result.summary.sent).toBe(1);
  });

  it('throws on endpoint failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ({
          ok: false,
          status: 403,
          json: async () => ({ success: false, error: { message: 'forbidden' } }),
        }) as Response,
      ),
    );

    await expect(fetchContactLeads()).rejects.toThrow('forbidden');
  });
});
