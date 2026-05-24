import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchAdminUsers as fetchAdminUsersApi,
  fetchAuthAuditEvents,
  fetchOAuthProviders,
  loginWithPassword as loginWithPasswordApi,
  registerWithPassword as registerWithPasswordApi,
  logoutWithSession,
  updateAdminUserWithApi,
} from '../utils/authApi';
import { evaluateCmsAccess, resolvePostLoginRoute, resolveTrustedSessionUser, SECURITY_FLAGS, type AppUser, type PostLoginRoute } from '../utils/securityPolicy';
import { initializeCmsAuth, type AuthSessionState } from './authInitialization';

interface OAuthProviderState { google: boolean; facebook: boolean }

export interface AuthActionResult { success: boolean; error: string | null; destination: PostLoginRoute | null; infoMessage?: string | null }
export interface AuthAuditEvent { [key: string]: unknown }

interface AuthContextType {
  user: AppUser | null;
  authError: string | null;
  authNotice: string | null;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  loginWithOAuth: (provider: 'google' | 'facebook', payload: { email: string; name: string; providerId: string }) => Promise<AuthActionResult>;
  beginOAuthLogin: (provider: 'google' | 'facebook') => void;
  register: (email: string, password: string, name: string) => Promise<AuthActionResult>;
  verifyEmail: (_token: string) => Promise<AuthActionResult>;
  resendVerification: () => Promise<AuthActionResult>;
  fetchAdminUsers: () => Promise<AppUser[]>;
  fetchAdminAuditEvents: () => Promise<AuthAuditEvent[]>;
  updateAdminUser: (userId: string, patch: Partial<Pick<AppUser, 'role' | 'accountStatus' | 'emailVerified'>>) => Promise<AuthActionResult>;
  clearAuthNotice: () => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  cmsEnabled: boolean;
  registrationEnabled: boolean;
  canAccessCMS: boolean;
  oauthProviders: OAuthProviderState;
  postLoginRoute: PostLoginRoute;
  sessionState: AuthSessionState | null;
}

const AuthContext = createContext<AuthContextType | null>(null);


function normalizeLoopbackUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname === '127.0.0.1') {
      parsed.hostname = 'localhost';
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function resolveSafeOAuthRedirectTo(): string {
  if (typeof window === 'undefined') return '';

  const candidate = normalizeLoopbackUrl(window.location.href);

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Ignore parse errors and fall through to a safe fallback.
  }

  return `${window.location.origin}/#login`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [sessionState, setSessionState] = useState<AuthSessionState | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<OAuthProviderState>({ google: false, facebook: false });

  const cmsEnabled = SECURITY_FLAGS.cmsEnabled;
  const registrationEnabled = SECURITY_FLAGS.registrationEnabled;
  const emailPasswordAuthEnabled = SECURITY_FLAGS.emailPasswordAuthEnabled;
  const googleLoginEnabled = SECURITY_FLAGS.googleLoginEnabled;
  const facebookLoginEnabled = SECURITY_FLAGS.facebookLoginEnabled;
  const isAuthenticated = Boolean(user);
  const canAccessCMS = evaluateCmsAccess({ cmsEnabled, isAuthenticated, user }) === 'allow';
  const postLoginRoute = resolvePostLoginRoute(cmsEnabled, user);

  const refresh = async (): Promise<AppUser | null> => {
    const [initialized, providersResult] = await Promise.all([
      initializeCmsAuth({ timeoutMs: 5000 }),
      fetchOAuthProviders(),
    ]);
    setUser(initialized.user);
    setSessionState(initialized.sessionState);
    setAuthError(initialized.authError);
    if (initialized.authNotice) {
      setAuthNotice(initialized.authNotice);
    }
    setOauthProviders({
      google: googleLoginEnabled && Boolean(providersResult.providers?.google?.enabled),
      facebook: facebookLoginEnabled && Boolean(providersResult.providers?.facebook?.enabled),
    });
    return initialized.user;
  };

  const finalizeLogin = (nextUser: AppUser | null): AuthActionResult => {
    if (!nextUser) {
      return { success: false, error: 'Session utilisateur introuvable après connexion.', destination: null };
    }
    if (nextUser.accountStatus === 'suspended') {
      return { success: false, error: 'Compte suspendu. Contactez un administrateur.', destination: null };
    }

    const destination = resolvePostLoginRoute(cmsEnabled, nextUser);
    if (destination === 'cms-forbidden') {
      return {
        success: false,
        error: 'Connexion réussie, mais ce compte ne possède pas les droits administrateur CMS.',
        destination,
      };
    }

    return { success: true, error: null, destination };
  };

  useEffect(() => {
    let mounted = true;
    void refresh().finally(() => {
      if (mounted) setIsAuthReady(true);
    });
    return () => { mounted = false; };
  }, []);

  const login = async (email: string, password: string): Promise<AuthActionResult> => {
    if (!emailPasswordAuthEnabled) {
      return { success: false, error: 'La connexion email/mot de passe est désactivée.', destination: null };
    }

    setAuthError(null);
    const localResult = await loginWithPasswordApi(email, password);
    if (!localResult.success) {
      const message = localResult.errorMessage ?? authError ?? 'Connexion impossible.';
      setAuthError(message);
      return { success: false, error: message, destination: null };
    }

    const trusted = resolveTrustedSessionUser(localResult.user);
    setUser(trusted);
    setSessionState(localResult.session ? {
      sessionId: localResult.session.sessionId ?? null,
      authenticatedAt: localResult.session.authenticatedAt ?? null,
      lastActivityAt: localResult.session.lastActivityAt ?? null,
      authProvider: localResult.session.authProvider ?? 'local',
      role: localResult.session.role ?? null,
    } : null);
    return finalizeLogin(trusted);
  };

  const register = async (email: string, password: string, name: string): Promise<AuthActionResult> => {
    if (!emailPasswordAuthEnabled) {
      return { success: false, error: "La création de compte email/mot de passe est désactivée.", destination: null };
    }

    const localResult = await registerWithPasswordApi(email, password, name);
    if (!localResult.success) {
      const message = localResult.errorMessage ?? authError ?? 'Inscription impossible.';
      setAuthError(message);
      return { success: false, error: message, destination: null };
    }

    const trusted = resolveTrustedSessionUser(localResult.user);
    setUser(trusted);
    setSessionState(localResult.session ? {
      sessionId: localResult.session.sessionId ?? null,
      authenticatedAt: localResult.session.authenticatedAt ?? null,
      lastActivityAt: localResult.session.lastActivityAt ?? null,
      authProvider: localResult.session.authProvider ?? 'local',
      role: localResult.session.role ?? null,
    } : null);
    setAuthError(null);
    return finalizeLogin(trusted);
  };

  const beginOAuthLogin = (provider: 'google' | 'facebook') => {
    const isProviderEnabled = provider === 'google' ? oauthProviders.google : oauthProviders.facebook;
    if (!isProviderEnabled) {
      return;
    }
    const redirectTo = resolveSafeOAuthRedirectTo();
    window.location.assign(`/api/v1/auth/oauth/${provider}/start?redirectTo=${encodeURIComponent(redirectTo)}`);
  };

  const logout = async () => {
    await logoutWithSession();
    setUser(null);
    setSessionState(null);
    setAuthNotice(null);
  };

  const ctx = useMemo<AuthContextType>(() => ({
    user,
    authError,
    authNotice,
    login,
    loginWithOAuth: async (provider) => {
      beginOAuthLogin(provider);
      return { success: true, error: null, destination: null };
    },
    beginOAuthLogin,
    register,
    verifyEmail: async () => ({ success: false, error: 'Use backend email token endpoint.', destination: null }),
    resendVerification: async () => ({ success: false, error: 'Use backend resend verification endpoint.', destination: null }),
    fetchAdminUsers: async () => {
      const result = await fetchAdminUsersApi();
      return result.users ?? [];
    },
    fetchAdminAuditEvents: async () => {
      const result = await fetchAuthAuditEvents();
      return result.events ?? [];
    },
    updateAdminUser: async (userId, patch) => {
      const result = await updateAdminUserWithApi(userId, patch);
      return { success: result.success, error: result.errorMessage, destination: null };
    },
    clearAuthNotice: () => setAuthNotice(null),
    logout,
    isAuthenticated,
    isAuthReady,
    cmsEnabled,
    registrationEnabled,
    canAccessCMS,
    oauthProviders,
    postLoginRoute,
    sessionState,
  }), [
    authError,
    authNotice,
    canAccessCMS,
    cmsEnabled,
    isAuthReady,
    isAuthenticated,
    oauthProviders,
    postLoginRoute,
    registrationEnabled,
    sessionState,
    user,
    emailPasswordAuthEnabled,
    googleLoginEnabled,
    facebookLoginEnabled,
  ]);

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
