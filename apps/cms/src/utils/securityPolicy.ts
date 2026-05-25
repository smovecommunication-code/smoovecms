export type UserRole = 'admin' | 'editor' | 'author' | 'viewer' | 'client';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status?: 'client' | 'staff';
  accountStatus?: 'active' | 'invited' | 'suspended';
  authProvider?: 'local' | 'google' | 'facebook';
  providerId?: string | null;
  organizationId?: string;
  planTier?: 'free' | 'pro' | 'enterprise';
  featureFlags?: string[];
  emailVerified?: boolean;
  verificationPending?: boolean;
  verificationMethod?: 'email_token' | 'provider_trust';
  lastLoginAt?: string | null;
  lastActivityAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const USER_ROLES: UserRole[] = ['admin', 'editor', 'author', 'viewer', 'client'];
const USER_STATUSES: NonNullable<AppUser['status']>[] = ['client', 'staff'];
const ACCOUNT_STATUSES: NonNullable<AppUser['accountStatus']>[] = ['active', 'invited', 'suspended'];
const AUTH_PROVIDERS: NonNullable<AppUser['authProvider']>[] = ['local', 'google', 'facebook'];
const VERIFICATION_METHODS: NonNullable<AppUser['verificationMethod']>[] = ['email_token', 'provider_trust'];

export type CmsAccessDecision = 'allow' | 'disabled' | 'unauthenticated' | 'forbidden';

export interface CmsAccessInput {
  cmsEnabled: boolean;
  isAuthenticated: boolean;
  user: Pick<AppUser, 'role' | 'accountStatus'> | null;
}

function parseBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  return value === 'true';
}

export const SECURITY_FLAGS = {
  cmsEnabled: parseBooleanFlag(import.meta.env.VITE_ENABLE_CMS, true),
  registrationEnabled: parseBooleanFlag(import.meta.env.VITE_ENABLE_REGISTRATION, import.meta.env.DEV),
  emailPasswordAuthEnabled: parseBooleanFlag(import.meta.env.VITE_ENABLE_EMAIL_PASSWORD_AUTH, true),
  googleLoginEnabled: parseBooleanFlag(import.meta.env.VITE_ENABLE_GOOGLE_LOGIN, false),
  facebookLoginEnabled: parseBooleanFlag(import.meta.env.VITE_ENABLE_FACEBOOK_LOGIN, false),
  devAdminFallbackEnabled: false,
} as const;

const cmsRoles = new Set<UserRole>(['admin', 'editor', 'author']);

function isCmsIntentRoute(route?: string | null): boolean {
  if (!route) {
    return false;
  }

  return route === 'cms' || route === 'cms-dashboard' || route.startsWith('cms-') || route.startsWith('cms/');
}

export function evaluateCmsAccess(input: CmsAccessInput): CmsAccessDecision {
  if (!input.cmsEnabled) {
    return 'disabled';
  }
  if (!input.isAuthenticated || !input.user) {
    return 'unauthenticated';
  }
  if (input.user.accountStatus === 'suspended') {
    return 'forbidden';
  }
  if (!cmsRoles.has(input.user.role)) {
    return 'forbidden';
  }
  return 'allow';
}

export function resolveTrustedSessionUser(serverUser: AppUser | null, _clientStoredUser?: unknown): AppUser | null {
  if (!serverUser || typeof serverUser !== 'object') {
    return null;
  }

  const role = USER_ROLES.includes(serverUser.role) ? serverUser.role : 'client';

  return {
    id: String(serverUser.id ?? ''),
    email: String(serverUser.email ?? ''),
    name: String(serverUser.name ?? ''),
    role,
    status: USER_STATUSES.includes(serverUser.status ?? 'client') ? serverUser.status : 'client',
    accountStatus: ACCOUNT_STATUSES.includes(serverUser.accountStatus ?? 'active') ? serverUser.accountStatus : 'active',
    authProvider: AUTH_PROVIDERS.includes(serverUser.authProvider ?? 'local') ? serverUser.authProvider : 'local',
    emailVerified: Boolean(serverUser.emailVerified),
    verificationPending: Boolean(serverUser.verificationPending),
    verificationMethod: VERIFICATION_METHODS.includes(serverUser.verificationMethod ?? 'email_token') ? serverUser.verificationMethod : 'email_token',
    providerId: typeof serverUser.providerId === 'string' ? serverUser.providerId : null,
    organizationId: typeof serverUser.organizationId === 'string' ? serverUser.organizationId : 'org_default',
    planTier: serverUser.planTier === 'pro' || serverUser.planTier === 'enterprise' ? serverUser.planTier : 'free',
    featureFlags: Array.isArray(serverUser.featureFlags) ? serverUser.featureFlags.map((entry) => String(entry)) : [],
    lastLoginAt: serverUser.lastLoginAt ? String(serverUser.lastLoginAt) : null,
    lastActivityAt: serverUser.lastActivityAt ? String(serverUser.lastActivityAt) : null,
    createdAt: serverUser.createdAt ? String(serverUser.createdAt) : null,
    updatedAt: serverUser.updatedAt ? String(serverUser.updatedAt) : null,
  };
}


export type PostLoginRoute = 'cms-dashboard' | 'home' | 'account' | 'cms-forbidden';

export function resolvePostLoginRoute(cmsEnabled: boolean, user: AppUser | null, intendedRoute?: string | null): PostLoginRoute {
  const decision = evaluateCmsAccess({
    cmsEnabled,
    isAuthenticated: Boolean(user),
    user,
  });

  if (decision === 'allow') {
    if (isCmsIntentRoute(intendedRoute)) {
      return 'cms-dashboard';
    }
    return 'cms-dashboard';
  }

  if (isCmsIntentRoute(intendedRoute)) {
    return 'cms-forbidden';
  }

  if (user) {
    return 'account';
  }

  return 'home';
}
