import type { AppUser } from '../../../utils/securityPolicy';

export interface AdminUsersFilters {
  query: string;
  role: 'all' | AppUser['role'];
  status: 'all' | NonNullable<AppUser['accountStatus']>;
  verification: 'all' | 'verified' | 'unverified';
  provider: 'all' | NonNullable<AppUser['authProvider']>;
}

export function filterAdminUsers(users: AppUser[], filters: AdminUsersFilters): AppUser[] {
  const normalizedQuery = filters.query.trim().toLowerCase();
  return users.filter((entry) => {
    if (filters.role !== 'all' && entry.role !== filters.role) return false;
    if (filters.status !== 'all' && (entry.accountStatus ?? 'active') !== filters.status) return false;
    if (filters.provider !== 'all' && (entry.authProvider ?? 'local') !== filters.provider) return false;
    if (filters.verification === 'verified' && !entry.emailVerified) return false;
    if (filters.verification === 'unverified' && entry.emailVerified) return false;
    if (!normalizedQuery) return true;
    return entry.name.toLowerCase().includes(normalizedQuery) || entry.email.toLowerCase().includes(normalizedQuery);
  });
}

export function canMutateSensitiveUserFields(actor: AppUser | null, targetUserId: string, patch: Partial<Pick<AppUser, 'role' | 'accountStatus'>>): boolean {
  if (!actor || actor.role !== 'admin') return false;
  if (actor.id !== targetUserId) return true;
  if (patch.role) return false;
  if (patch.accountStatus === 'suspended') return false;
  return true;
}
