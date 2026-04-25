import { isServiceArray, type Service } from '../domain/contentSchemas';
import { services as staticServices } from '../data/services';
import { readFromStorage, writeToStorage } from './storage/localStorageStore';
import { normalizeSlug, requiredTrimmed, normalizeStringArray } from '../shared/contentContracts';

const SERVICE_STORAGE_KEY = 'smove_services';

const toIsoOrNow = (value?: string): string => {
  if (!value) return new Date().toISOString();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
};

const normalizeService = (service: Partial<Service> & { id: string }): Service => {
  const now = new Date().toISOString();
  const title = requiredTrimmed(service.title);

  return {
    ...service,
    id: requiredTrimmed(service.id),
    title,
    slug: normalizeSlug(requiredTrimmed(service.slug), title, service.id),
    description: requiredTrimmed(service.description),
    shortDescription: requiredTrimmed(service.shortDescription) || undefined,
    icon: requiredTrimmed(service.icon) || 'palette',
    iconLikeAsset: requiredTrimmed(service.iconLikeAsset) || undefined,
    routeSlug: normalizeSlug(requiredTrimmed(service.routeSlug) || requiredTrimmed(service.slug), title, service.id),
    overviewTitle: requiredTrimmed((service as Service).overviewTitle) || undefined,
    overviewDescription: requiredTrimmed((service as Service).overviewDescription) || undefined,
    ctaTitle: requiredTrimmed((service as Service).ctaTitle) || undefined,
    ctaDescription: requiredTrimmed((service as Service).ctaDescription) || undefined,
    ctaPrimaryLabel: requiredTrimmed((service as Service).ctaPrimaryLabel) || undefined,
    ctaPrimaryHref: requiredTrimmed((service as Service).ctaPrimaryHref) || undefined,
    processTitle: requiredTrimmed((service as Service).processTitle) || undefined,
    processSteps: Array.isArray((service as Service).processSteps)
      ? normalizeStringArray((service as Service).processSteps)
      : [],
    color: requiredTrimmed(service.color) || 'from-[#00b3e8] to-[#00c0e8]',
    features: normalizeStringArray(service.features),
    status: service.status ?? 'published',
    featured: Boolean(service.featured),
    createdAt: toIsoOrNow(service.createdAt),
    updatedAt: now,
  };
};

const compareServices = (a: Service, b: Service): number => {
  const featuredCompare = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  if (featuredCompare !== 0) return featuredCompare;
  const updatedCompare = Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || '');
  if (!Number.isNaN(updatedCompare) && updatedCompare !== 0) return updatedCompare;
  return a.title.localeCompare(b.title, 'fr');
};

interface ServiceRepository {
  getAll(): Service[];
  getPublished(): Service[];
  getById(id: string): Service | undefined;
  replaceAll(services: Service[]): Service[];
  save(service: Service): Service;
  delete(id: string): void;
}

class LocalServiceRepository implements ServiceRepository {
  private readonly defaults = this.normalizeServices(staticServices);

  private normalizeServices(input: unknown): Service[] {
    if (!Array.isArray(input)) {
      if (import.meta.env.DEV) {
        console.warn('[serviceRepository] invalid service collection shape, using empty array');
      }
      return [];
    }

    const normalized = input
      .flatMap((entry) => {
        if (!entry || typeof entry !== 'object') {
          return [];
        }

        const candidate = entry as Partial<Service> & { id?: string };
        if (!candidate.id || typeof candidate.id !== 'string' || !candidate.id.trim()) {
          return [];
        }

        try {
          return [normalizeService(candidate as Partial<Service> & { id: string })];
        } catch {
          return [];
        }
      })
      .sort(compareServices);

    if (!isServiceArray(normalized) && import.meta.env.DEV) {
      console.warn('[serviceRepository] service normalization produced invalid entries, dropping malformed data');
    }

    return normalized;
  }

  private read(): Service[] {
    const services = readFromStorage(SERVICE_STORAGE_KEY, Array.isArray, this.defaults, { persistFallback: true });
    return this.normalizeServices(services);
  }

  getAll(): Service[] {
    return this.read();
  }

  getPublished(): Service[] {
    return this.getAll().filter((service) => service.status === 'published');
  }

  getById(id: string): Service | undefined {
    return this.getAll().find((service) => service.id === id);
  }

  replaceAll(services: Service[]): Service[] {
    const normalized = this.normalizeServices(services);
    writeToStorage(SERVICE_STORAGE_KEY, normalized);
    return normalized;
  }

  save(service: Service): Service {
    const trusted = normalizeService(service);
    const services = this.getAll();

    if (!trusted.id || !trusted.title || !trusted.slug || !trusted.routeSlug || !trusted.description) {
      throw new Error('Invalid service payload');
    }

    const slugConflict = services.find((candidate) => candidate.slug === trusted.slug && candidate.id !== trusted.id);
    if (slugConflict) {
      throw new Error('Service slug already exists');
    }

    const routeSlugConflict = services.find((candidate) => candidate.routeSlug === trusted.routeSlug && candidate.id !== trusted.id);
    if (routeSlugConflict) {
      throw new Error('Service route slug already exists');
    }

    const index = services.findIndex((candidate) => candidate.id === trusted.id);
    if (index >= 0) {
      trusted.createdAt = services[index].createdAt || trusted.createdAt;
      services[index] = trusted;
    } else {
      services.push(trusted);
    }

    const ordered = services.sort(compareServices);
    writeToStorage(SERVICE_STORAGE_KEY, ordered);
    return trusted;
  }

  delete(id: string): void {
    writeToStorage(
      SERVICE_STORAGE_KEY,
      this.getAll().filter((service) => service.id !== id),
    );
  }
}

export const serviceRepository: ServiceRepository = new LocalServiceRepository();
