import { HOME_SECTIONS, isCmsRoute, resolveAuthPageGuard, resolveCmsRouteGuard } from './guards';
import type { AppRoute, AuthRoutingState, RouteResolution } from './navigationTypes';
import { PREMIUM_SERVICE_ROUTES, normalizeServiceSlug } from '../features/marketing/serviceRouting';

export function parseHashRoute(hash: string): AppRoute {
  const rawRoute = (hash.startsWith('#') ? hash.slice(1) : hash) || 'home';
  return rawRoute.split('?')[0] as AppRoute;
}

const extractServiceSlug = (route: string): string | null => {
  const normalized = route.trim();
  if (!normalized) return null;

  if (normalized.startsWith('/services/')) {
    return normalizeServiceSlug(normalized.slice('/services/'.length));
  }

  if (normalized.startsWith('services/')) {
    return normalizeServiceSlug(normalized.slice('services/'.length));
  }

  if (normalized.startsWith('service/')) {
    return normalizeServiceSlug(normalized.slice('service/'.length));
  }

  if (normalized.startsWith('service-')) {
    return normalizeServiceSlug(normalized.slice('service-'.length));
  }

  return null;
};

export function resolveRoute(hash: string, auth: AuthRoutingState): RouteResolution {
  const route = parseHashRoute(hash);

  const guardedAuthRoute = resolveAuthPageGuard(route, auth);
  if (guardedAuthRoute) {
    return {
      page: guardedAuthRoute,
      sectionToScroll: null,
      normalizedHash: guardedAuthRoute,
    };
  }

  if (isCmsRoute(route)) {
    const page = resolveCmsRouteGuard(auth);
    const normalizedHash = page === 'cms-dashboard' ? 'cms' : page;
    return {
      page,
      sectionToScroll: null,
      normalizedHash,
    };
  }


  if (route === 'account') {
    if (!auth.isAuthReady) {
      return {
        page: 'auth-loading',
        sectionToScroll: null,
        normalizedHash: 'auth-loading',
      };
    }

    if (!auth.isAuthenticated) {
      return {
        page: 'login',
        sectionToScroll: null,
        normalizedHash: 'login',
      };
    }

    return {
      page: 'account',
      sectionToScroll: null,
    };
  }

  if (HOME_SECTIONS.has(route)) {
    return {
      page: 'home',
      sectionToScroll: route,
    };
  }


  if (route === 'service-design' || route === 'service-web') {
    return {
      page: route,
      sectionToScroll: null,
    };
  }

  const serviceSlug = extractServiceSlug(route);
  if (serviceSlug !== null) {
    const slug = normalizeServiceSlug(serviceSlug);
    if (!slug) {
      return { page: 'services-all', sectionToScroll: null };
    }
    const premiumRoute = PREMIUM_SERVICE_ROUTES[slug];
    if (premiumRoute) {
      return { page: premiumRoute, sectionToScroll: null };
    }
    return { page: `service-${slug}`, sectionToScroll: null };
  }

  if (route.startsWith('blog/')) {
    const slug = route.slice('blog/'.length).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (slug) {
      return {
        page: `blog-${slug}`,
        sectionToScroll: null,
      };
    }
  }

  if (route.startsWith('project-')) {
    return {
      page: route,
      sectionToScroll: null,
    };
  }

  const knownPages = new Set([
    'home',
    'projects',
    'services-all',
    'portfolio',
    'blog',
    'apropos',
    'cms-unavailable',
    'cms-forbidden',
    'auth-loading',
  ]);

  if (knownPages.has(route)) {
    return {
      page: route,
      sectionToScroll: null,
    };
  }

  return {
    page: 'home',
    sectionToScroll: null,
  };
}
