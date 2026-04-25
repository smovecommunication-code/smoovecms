import type { AppRoute, AuthRoutingState, ResolvedPage } from './navigationTypes';

export const HOME_SECTIONS = new Set(['services', 'about', 'portfolio', 'contact']);
export const CMS_SECTIONS = new Set(['overview', 'projects', 'blog', 'media', 'content', 'users', 'settings']);

export function isCmsRoute(route: AppRoute): boolean {
  return route === 'cms' || route === 'cms-dashboard' || route.startsWith('cms-') || route.startsWith('cms/');
}

export function resolveCmsSectionFromRoute(route: AppRoute): string {
  if (route === 'cms' || route === 'cms-dashboard') {
    return 'overview';
  }

  if (route.startsWith('cms/')) {
    const [, rawSection] = route.split('/');
    return CMS_SECTIONS.has(rawSection) ? rawSection : 'overview';
  }

  if (route.startsWith('cms-')) {
    const section = route.slice('cms-'.length);
    return CMS_SECTIONS.has(section) ? section : 'overview';
  }

  return 'overview';
}

export function resolveAuthPageGuard(route: AppRoute, auth: AuthRoutingState): ResolvedPage | null {
  if (route !== 'login' && route !== 'register') {
    return null;
  }

  if (!auth.cmsEnabled) {
    return 'cms-unavailable';
  }

  if (auth.isAuthenticated) {
    return auth.postLoginRoute;
  }

  if (route === 'register' && !auth.registrationEnabled) {
    return 'login';
  }

  return route;
}

export function resolveCmsRouteGuard(auth: AuthRoutingState): ResolvedPage {
  if (!auth.cmsEnabled) {
    return 'cms-unavailable';
  }

  if (!auth.isAuthReady) {
    return 'auth-loading';
  }

  if (!auth.isAuthenticated) {
    return 'login';
  }

  if (!auth.canAccessCMS) {
    return 'cms-forbidden';
  }

  return 'cms-dashboard';
}
