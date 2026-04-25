import { describe, expect, it } from 'vitest';
import { resolveRoute } from './routeResolver';
import type { AuthRoutingState } from './navigationTypes';

const baseAuth: AuthRoutingState = {
  isAuthenticated: false,
  isAuthReady: true,
  canAccessCMS: false,
  cmsEnabled: true,
  registrationEnabled: true,
  postLoginRoute: 'account',
};

describe('cms routeResolver safety', () => {
  it('redirects unknown routes to home instead of crashing', () => {
    expect(resolveRoute('#not-real-route', baseAuth).page).toBe('home');
  });

  it('normalizes cms routes for authorized users', () => {
    const resolved = resolveRoute('#cms', { ...baseAuth, isAuthenticated: true, canAccessCMS: true });
    expect(resolved.page).toBe('cms-dashboard');
    expect(resolved.normalizedHash).toBe('cms');
  });

  it('falls back service root with empty slug to services-all', () => {
    const resolved = resolveRoute('#service///', baseAuth);
    expect(resolved.page).toBe('services-all');
  });
});
