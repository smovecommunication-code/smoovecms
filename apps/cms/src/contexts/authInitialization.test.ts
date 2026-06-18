import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('../utils/authApi', () => ({
  fetchApiReady: vi.fn(),
  fetchSession: vi.fn(),
}));

import { fetchApiReady, fetchSession } from '../utils/authApi';
import { initializeCmsAuth } from './authInitialization';

const fetchApiReadyMock = vi.mocked(fetchApiReady);
const fetchSessionMock = vi.mocked(fetchSession);

describe('initializeCmsAuth', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('uses backend local session when available', async () => {
    fetchApiReadyMock.mockResolvedValue({ ready: true, status: 200, statusText: 'ok', db: 'connected', sessions: 'ready', errorCode: null, errorMessage: null });
    fetchSessionMock.mockResolvedValue({
      success: true,
      user: { id: '1', email: 'admin@test.com', name: 'Admin', role: 'admin', status: 'staff', accountStatus: 'active' },
      session: { sessionId: 's1', authProvider: 'local', role: 'admin' },
      errorCode: null,
      errorMessage: null,
      status: 200,
    });

    const result = await initializeCmsAuth({ timeoutMs: 3000 });

    expect(fetchSessionMock).toHaveBeenCalledWith({ timeoutMs: 3000 });
    expect(result.user?.role).toBe('admin');
    expect(result.sessionState?.authProvider).toBe('local');
    expect(result.authNotice).toBeNull();
  });

  it('fails open to usable login state when init times out', async () => {
    fetchApiReadyMock.mockResolvedValue({ ready: true, status: 200, statusText: 'ok', db: 'connected', sessions: 'ready', errorCode: null, errorMessage: null });
    fetchSessionMock.mockResolvedValue({
      success: false,
      user: null,
      session: null,
      errorCode: 'REQUEST_TIMEOUT',
      errorMessage: "L'initialisation du serveur a expiré. Veuillez réessayer.",
      status: 408,
    });

    const result = await initializeCmsAuth({ timeoutMs: 3000 });

    expect(result.user).toBeNull();
    expect(result.sessionState).toBeNull();
    expect(result.authNotice).toContain('restauration de session');
  });
});
