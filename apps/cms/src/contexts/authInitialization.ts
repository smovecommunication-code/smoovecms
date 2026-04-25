import { fetchSession, type AuthResult } from '../utils/authApi';
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

function buildInitNotice(session: AuthResult): string | null {
  if (session.success) return null;
  if (session.errorCode === 'REQUEST_TIMEOUT') {
    return "L'initialisation du serveur a expiré. Vous pouvez vous connecter et réessayer.";
  }
  if (session.errorCode === 'UNAUTHENTICATED') return null;
  return session.errorMessage ?? 'Initialisation de session indisponible. Réessayez.';
}

export async function initializeCmsAuth(options?: { timeoutMs?: number }): Promise<AuthInitializationResult> {
  const session = await fetchSession({ timeoutMs: options?.timeoutMs });
  const user = resolveTrustedSessionUser(session.user);

  return {
    user,
    sessionState: mapSession((session.session as Record<string, unknown> | null | undefined) ?? null),
    authError: session.success ? null : session.errorMessage,
    authNotice: buildInitNotice(session),
  };
}
