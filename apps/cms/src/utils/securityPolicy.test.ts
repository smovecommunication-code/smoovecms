import { describe, expect, it } from 'vitest';
import { evaluateCmsAccess } from './securityPolicy';

describe('cms securityPolicy access control', () => {
  it('allows active admin/editor/author users', () => {
    expect(evaluateCmsAccess({ cmsEnabled: true, isAuthenticated: true, user: { role: 'admin', accountStatus: 'active' } })).toBe('allow');
    expect(evaluateCmsAccess({ cmsEnabled: true, isAuthenticated: true, user: { role: 'editor', accountStatus: 'active' } })).toBe('allow');
    expect(evaluateCmsAccess({ cmsEnabled: true, isAuthenticated: true, user: { role: 'author', accountStatus: 'active' } })).toBe('allow');
  });

  it('denies non-admin roles and suspended accounts', () => {
    expect(evaluateCmsAccess({ cmsEnabled: true, isAuthenticated: true, user: { role: 'client', accountStatus: 'active' } })).toBe('forbidden');
    expect(evaluateCmsAccess({ cmsEnabled: true, isAuthenticated: true, user: { role: 'admin', accountStatus: 'suspended' } })).toBe('forbidden');
  });
});
