import type { Service } from '../../domain/contentSchemas';
import { normalizeSlug } from '../../shared/contentContracts';

export const PREMIUM_SERVICE_ROUTES: Record<string, 'service-design' | 'service-web'> = {
  'design-branding': 'service-design',
  'web-development': 'service-web',
};

export const normalizeServiceSlug = (value: string | undefined): string => normalizeSlug(value);

export const resolveServiceRouteSlug = (service: Pick<Service, 'id' | 'slug' | 'routeSlug'>): string =>
  normalizeServiceSlug(service.routeSlug || service.slug || service.id);

export const resolveServiceRouteHref = (service: Pick<Service, 'id' | 'slug' | 'routeSlug'>): string => {
  const routeSlug = resolveServiceRouteSlug(service);
  if (!routeSlug) {
    return '#services-all';
  }

  return `#/services/${routeSlug}`;
};

export const isPremiumServiceSlug = (slug: string): boolean => Boolean(PREMIUM_SERVICE_ROUTES[slug]);
