import { describe, expect, it } from 'vitest';
import type { AppUser } from '../../../utils/securityPolicy';
import { canMutateSensitiveUserFields, filterAdminUsers } from './adminUsersViewModel';

const USERS: AppUser[] = [
  { id: '1', name: 'Admin Root', email: 'admin@smove.test', role: 'admin', accountStatus: 'active', emailVerified: true, authProvider: 'local' },
  { id: '2', name: 'Editor Jane', email: 'jane@smove.test', role: 'editor', accountStatus: 'invited', emailVerified: false, authProvider: 'google' },
  { id: '3', name: 'Client Bob', email: 'bob@smove.test', role: 'client', accountStatus: 'suspended', emailVerified: false, authProvider: 'facebook' },
];

describe('adminUsersViewModel', () => {
  it('filters users by text/role/status/verification/provider', () => {
    const filtered = filterAdminUsers(USERS, {
      query: 'jane',
      role: 'editor',
      status: 'invited',
      verification: 'unverified',
      provider: 'google',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('2');
  });

  it('returns empty array when no user matches filters', () => {
    const filtered = filterAdminUsers(USERS, {
      query: 'unknown',
      role: 'all',
      status: 'all',
      verification: 'all',
      provider: 'all',
    });
    expect(filtered).toHaveLength(0);
  });

  it('blocks self role/suspend mutations while allowing non-sensitive self changes', () => {
    const actor = USERS[0];
    expect(canMutateSensitiveUserFields(actor, actor.id, { role: 'editor' })).toBe(false);
    expect(canMutateSensitiveUserFields(actor, actor.id, { accountStatus: 'suspended' })).toBe(false);
    expect(canMutateSensitiveUserFields(actor, actor.id, { accountStatus: 'active' })).toBe(true);
    expect(canMutateSensitiveUserFields(actor, '2', { role: 'editor' })).toBe(true);
  });
});
