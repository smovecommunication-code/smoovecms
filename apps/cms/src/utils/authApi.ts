import { RUNTIME_CONFIG } from '../config/runtimeConfig';
import type { AppUser } from './securityPolicy';

interface SessionMeta {
  sessionId?: string | null;
  authenticatedAt?: string | null;
  lastActivityAt?: string | null;
  authProvider?: string | null;
  role?: string | null;
}

interface AuthApiPayload {
  user?: AppUser | null;
  users?: AppUser[];
  events?: Array<Record<string, unknown>>;
  session?: SessionMeta | null;
  csrfToken?: string | null;
  providers?: Record<string, { enabled: boolean }>;
  reset?: {
    emailDeliveryReady?: boolean;
    expiresAt?: string | null;
    devToken?: string | null;
    devPreviewUrl?: string | null;
  };
}

interface ReadyApiResponse {
  status?: string;
  db?: string;
  sessions?: string;
  ready?: boolean;
}

interface AuthApiResponse {
  success?: boolean;
  data?: AuthApiPayload | null;
  error?: { code?: string; message?: string } | null;
}

export interface ReadyResult {
  ready: boolean;
  status: number;
  statusText: string | null;
  db: string | null;
  sessions: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface AuthResult {
  user: AppUser | null;
  users?: AppUser[];
  events?: Array<Record<string, unknown>>;
  session?: SessionMeta | null;
  csrfToken?: string | null;
  providers?: Record<string, { enabled: boolean }>;
  reset?: AuthApiPayload['reset'];
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  status: number;
}

const AUTH_BASE_URL = `${RUNTIME_CONFIG.apiBaseUrl}/auth`;
const READY_URL = `${RUNTIME_CONFIG.apiBaseUrl}/ready`;

function fallbackErrorMessage(code: string | null, status: number): string {
  if (code === 'UNAUTHENTICATED') return 'Session invalide. Merci de vous reconnecter.';
  if (code === 'FORBIDDEN') return 'Accès refusé.';
  if (code === 'INVALID_CREDENTIALS') return 'Email ou mot de passe invalide.';
  if (code === 'ACCOUNT_SUSPENDED') return 'Ce compte est suspendu. Contactez un administrateur.';
  if (code === 'INVALID_CSRF') return 'Session expirée. Rechargez la page puis réessayez.';
  if (code === 'REQUEST_TIMEOUT') return "L'initialisation du serveur a expiré. Veuillez réessayer.";
  if (status >= 500) return 'Erreur serveur. Réessayez plus tard.';
  return 'Erreur d’authentification.';
}

function normalize(body: AuthApiResponse | null, status: number): AuthResult {
  const success = status < 400 && body?.success === true;
  return {
    user: body?.data?.user ?? null,
    users: body?.data?.users,
    events: body?.data?.events,
    session: body?.data?.session,
    csrfToken: body?.data?.csrfToken ?? null,
    providers: body?.data?.providers,
    reset: body?.data?.reset,
    success,
    errorCode: body?.error?.code ?? null,
    errorMessage: body?.error?.message ?? null,
    status,
  };
}

export function normalizeAuthPayload(payload: AuthApiResponse | null, status: number): AuthResult {
  const result = normalize(payload, status);
  if (!result.success && !result.errorMessage) {
    return { ...result, errorMessage: fallbackErrorMessage(result.errorCode, status) };
  }
  return result;
}

function timeoutResult(status = 408): AuthResult {
  return normalizeAuthPayload({ success: false, error: { code: 'REQUEST_TIMEOUT' } }, status);
}

function readyTimeoutResult(status = 408): ReadyResult {
  return {
    ready: false,
    status,
    statusText: null,
    db: null,
    sessions: null,
    errorCode: 'REQUEST_TIMEOUT',
    errorMessage: 'Le contrôle de disponibilité API a expiré. La connexion reste disponible.',
  };
}

export async function fetchApiReady(options?: { timeoutMs?: number }): Promise<ReadyResult> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof globalThis.setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      controller.abort();
      reject(new DOMException('Request timed out', 'AbortError'));
    }, options?.timeoutMs ?? 3000);
  });

  try {
    const response = await Promise.race([
      fetch(READY_URL, { method: 'GET', cache: 'no-store', signal: controller.signal }),
      timeoutPromise,
    ]);
    const json = (await response.json().catch(() => null)) as ReadyApiResponse | null;
    const statusText = json?.status ?? null;
    const db = json?.db ?? null;
    const sessions = json?.sessions ?? null;
    const ready = response.ok && (statusText === 'ok' || json?.ready === true) && db === 'connected' && sessions === 'ready';

    return {
      ready,
      status: response.status,
      statusText,
      db,
      sessions,
      errorCode: ready ? null : 'API_NOT_READY',
      errorMessage: ready ? null : 'API pas encore prête. Réessayez dans quelques secondes.',
    };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return readyTimeoutResult();
    }
    return {
      ready: false,
      status: 503,
      statusText: null,
      db: null,
      sessions: null,
      errorCode: 'NETWORK_ERROR',
      errorMessage: 'API indisponible. Vérifiez la connexion puis réessayez.',
    };
  } finally {
    globalThis.clearTimeout(timeoutId!);
  }
}

async function request(path: string, init: RequestInit = {}, timeoutMs = RUNTIME_CONFIG.requestTimeoutMs): Promise<AuthResult> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof globalThis.setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      controller.abort();
      reject(new DOMException('Request timed out', 'AbortError'));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetch(`${AUTH_BASE_URL}${path}`, {
        ...init,
        headers,
        credentials: 'include',
        signal: controller.signal,
      }),
      timeoutPromise,
    ]);

    const json = (await response.json().catch(() => null)) as AuthApiResponse | null;
    console.info('[auth_api_debug]', {
      path,
      status: response.status,
      credentialsMode: 'include',
      authenticated: json?.data?.user ? true : json?.data?.user === null ? false : null,
    });
    return normalizeAuthPayload(json, response.status);
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return timeoutResult();
    }
    return normalizeAuthPayload({ success: false, error: { code: 'NETWORK_ERROR', message: 'Service d’authentification indisponible.' } }, 503);
  } finally {
    globalThis.clearTimeout(timeoutId!);
  }
}

export function fetchSession(options?: { timeoutMs?: number }): Promise<AuthResult> {
  return request('/session', { method: 'GET' }, options?.timeoutMs);
}

export function fetchOAuthProviders(): Promise<AuthResult> {
  return request('/oauth/providers', { method: 'GET' });
}

async function buildCsrfHeaders(): Promise<AuthResult | Headers> {
  const csrfSource = await fetchSession();
  if (!csrfSource.success) {
    return csrfSource;
  }

  const headers = new Headers();
  if (csrfSource.csrfToken) {
    headers.set('X-CSRF-Token', csrfSource.csrfToken);
  }
  return headers;
}

export async function loginWithPassword(email: string, password: string): Promise<AuthResult> {
  return request('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function registerWithPassword(email: string, password: string, name: string): Promise<AuthResult> {
  return request('/register', { method: 'POST', body: JSON.stringify({ email, password, name }) });
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const headers = await buildCsrfHeaders();
  if ('success' in headers) return headers;
  return request('/password-reset/request', { method: 'POST', headers, body: JSON.stringify({ email }) });
}

export async function confirmPasswordReset(token: string, password: string): Promise<AuthResult> {
  const headers = await buildCsrfHeaders();
  if ('success' in headers) return headers;
  return request('/password-reset/confirm', { method: 'POST', headers, body: JSON.stringify({ token, password }) });
}

export async function logoutWithSession(): Promise<AuthResult> {
  const headers = await buildCsrfHeaders();
  if ('success' in headers) return headers;
  return request('/logout', { method: 'POST', headers });
}

export function fetchAdminUsers(): Promise<AuthResult> {
  return request('/admin/users', { method: 'GET' });
}

export function updateAdminUserWithApi(
  userId: string,
  patch: Partial<Pick<AppUser, 'role' | 'accountStatus' | 'emailVerified'>>,
): Promise<AuthResult> {
  return request(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function fetchAuthAuditEvents(): Promise<AuthResult> {
  return request('/admin/audit-events', { method: 'GET' });
}
