import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAdminUsers, fetchSession, loginWithPassword } from './authApi';

describe('cms authApi admin requests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('uses session cookies without bearer tokens', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => ({
      status: 200,
      json: async () => ({ success: true, data: { users: [{ id: '1', email: 'admin@test.com', role: 'admin', name: 'Admin' }] } }),
      requestInit: init,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchAdminUsers();
    const [, init] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    const headers = new Headers(init.headers);

    expect(result.success).toBe(true);
    expect(result.users?.[0]?.role).toBe('admin');
    expect(init.credentials).toBe('include');
    expect(headers.has('Authorization')).toBe(false);
  });

  it('returns a timeout error when session bootstrap hangs', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));

    const pending = fetchSession({ timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);

    await expect(pending).resolves.toMatchObject({
      success: false,
      errorCode: 'REQUEST_TIMEOUT',
      status: 408,
    });
  });

  it('keeps login flow usable by returning csrf bootstrap failure directly', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 408,
      json: async () => ({ success: false, error: { code: 'REQUEST_TIMEOUT' } }),
    })));

    const result = await loginWithPassword('admin@test.com', 'password');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('REQUEST_TIMEOUT');
  });
});
