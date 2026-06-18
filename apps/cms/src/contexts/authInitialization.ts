import { fetchApiReady, fetchSession, type AuthResult, type ReadyResult } from '../utils/authApi';
import { resolveTrustedSessionUser, type AppUser } from '../utils/securityPolicy';

export interface AuthSessionState {
  sessionId: string | null;
  authenticatedAt: string | null;
  lastActivityAt: string | null;
  authProvider: string | null;
  role: string | null;
}

export interface AuthInitializationResult {
  user: AppUser | null;
  sessionState: AuthSessionState | null;
  authError: string | null;
  authNotice: string | null;
  readyState: ReadyResult | null;
}

function mapSession(raw: Record<string, unknown> | null | undefined): AuthSessionState | null {
  if (!raw) return null;
  return {
    sessionId: (raw.sessionId as string | null | undefined) ?? null,
    authenticatedAt: (raw.authenticatedAt as string | null | undefined) ?? null,
    lastActivityAt: (raw.lastActivityAt as string | null | undefined) ?? null,
    authProvider: (raw.authProvider as string | null | undefined) ?? 'local',
    role: (raw.role as string | null | undefined) ?? null,
  };
}

function buildInitNotice(session: AuthResult, readyState: ReadyResult): string | null {
  if (!readyState.ready) return readyState.errorMessage;
  if (session.success || session.errorCode === 'UNAUTHENTICATED') return null;
  if (session.errorCode === 'REQUEST_TIMEOUT') {
    return 'La restauration de session a pris trop de temps. Vous pouvez vous connecter maintenant.';
  }
  return session.errorMessage ?? 'Initialisation de session indisponible. Réessayez.';
}

export async function initializeCmsAuth(options?: { timeoutMs?: number }): Promise<AuthInitializationResult> {
  const readyState = await fetchApiReady({ timeoutMs: Math.min(options?.timeoutMs ?? 3000, 3000) });
  const session = readyState.ready
    ? await fetchSession({ timeoutMs: options?.timeoutMs })
    : { success: false, user: null, session: null, errorCode: 'API_NOT_READY', errorMessage: readyState.errorMessage, status: readyState.status };
  const user = resolveTrustedSessionUser(session.user);

  return {
    user,
    sessionState: mapSession((session.session as Record<string, unknown> | null | undefined) ?? null),
    authError: session.success || session.errorCode === 'UNAUTHENTICATED' ? null : session.errorMessage,
    authNotice: buildInitNotice(session, readyState),
    readyState,
  };
}
