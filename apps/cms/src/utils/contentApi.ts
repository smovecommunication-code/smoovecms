import { RUNTIME_CONFIG } from '../config/runtimeConfig';
import type { BlogPost, MediaFile, Project, Service } from '../domain/contentSchemas';
import type { HomePageContentSettings } from '../data/pageContentSeed';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string; details?: unknown };
}

export class ContentApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ContentApiError';
  }
}

export interface EditorialAnalytics {
  drafts: number;
  inReview: number;
  published: number;
  archived: number;
  recentlyUpdated: Array<{ id: string; title: string; status: BlogPost['status']; publishedDate: string }>;
}


export interface MediaUploadPayload {
  filename: string;
  title?: string;
  dataUrl: string;
  alt?: string;
  caption?: string;
  tags?: string[];
}

export interface CmsSettings {
  siteSettings: {
    siteTitle: string;
    supportEmail: string;
    brandMedia: {
      logo: string;
      logoDark: string;
      favicon: string;
      defaultSocialImage: string;
    };
  };
  operationalSettings: {
    instantPublishing: boolean;
  };
  taxonomySettings: {
    blog: {
      managedCategories: string[];
      managedTags: string[];
      enforceManagedTags: boolean;
    };
  };
  // Flat aliases are compatibility-only.
  siteTitle?: string;
  supportEmail?: string;
  instantPublishing?: boolean;
  taxonomy?: {
    blog?: {
      managedCategories?: string[];
      managedTags?: string[];
      enforceManagedTags?: boolean;
    };
  };
}

export interface PublicSiteSettings {
  siteSettings: {
    siteTitle: string;
    supportEmail: string;
    brandMedia: {
      logo: string;
      logoDark: string;
      favicon: string;
      defaultSocialImage: string;
    };
  };
  // Flat aliases are compatibility-only.
  siteTitle?: string;
  supportEmail?: string;
  brandMedia?: {
    logo?: string;
    logoDark?: string;
    favicon?: string;
    defaultSocialImage?: string;
  };
}

export interface SettingsHistoryEntry {
  versionId: string;
  changedAt: string;
  changedBy: string;
  changedFields: string[];
  changeSummary: string;
  rollbackOf?: string;
}

export interface SyncDiagnostics {
  mode: 'authoritative_remote' | 'degraded_local';
  instantPublishingEnabled: boolean;
  invalidMediaReferences: Array<{
    domain: string;
    id: string;
    status?: string;
    field: string;
    label: string;
    value: string;
    mediaId: string;
    isValid: boolean;
    resolution?: 'active' | 'archived' | 'missing';
  }>;
  summary: {
    invalidMediaReferenceCount: number;
    criticalUnresolvedMediaReferenceCount?: number;
    publishedCriticalUnresolvedMediaReferenceCount?: number;
    blogCount: number;
    projectCount: number;
    serviceCount: number;
    mediaCount: number;
  };
}


export interface ConversionMetrics {
  eventsLast1000: number;
  byName: Record<string, number>;
  conversionPath: {
    homeToDiscovery: number;
    discoveryToContact: number;
    contactFormSubmissions: number;
  };
  topRoutes: Array<{ route: string; hits: number }>;
  recent: Array<{
    id: string;
    name: string;
    route: string;
    source: string;
    happenedAt: string;
    ctaId?: string | null;
    targetRoute?: string | null;
  }>;
}

export interface ContentHealthSummary {
  publication: {
    blog: Record<string, number>;
    projects: Record<string, number>;
    services: Record<string, number>;
  };
  quality: {
    missingPublishedMedia: {
      blog: number;
      projects: number;
      services: number;
    };
    seoIncomplete: {
      blog: number;
      projects: number;
      services: number;
    };
    invalidServiceRoutes: number;
    routeCollisions?: number;
    unresolvedMediaReferences?: number;
    unresolvedPublishedCriticalMedia?: {
      blogCard: number;
      projectCard: number;
      projectHero: number;
      projectGallery: number;
      archivedReferencedByPublished: number;
    };
    unresolvedMediaByStatus?: {
      published: number;
      draft: number;
      inReview: number;
      archived: number;
      system: number;
    };
    legacyFieldUsage?: {
      blog: number;
      projects: number;
      services: number;
    };
    mediaMissingAlt: number;
    missingBrandAssets: number;
  };
  launchReadiness: {
    blockers: string[];
    summary?: {
      blockerCount: number;
      warningCount: number;
      publishReadyCount: number;
      publishedCount: number;
    };
    topIssues?: Array<{
      id: string;
      label: string;
      status: string;
      issues: Array<{
        severity: 'blocker' | 'warning';
        code: string;
        message: string;
      }>;
    }>;
  };
  mediaRolePresets: string[];
  releaseReadinessChecks?: Array<{
    id: string;
    level: 'blocker' | 'warning';
    status: 'passed' | 'failed';
    message: string;
    checkedAt: string;
  }>;
}

export interface MediaUsageImpact {
  mediaId: string;
  okToArchive: boolean;
  decision: 'allow_archive' | 'block_archive';
  references: Array<{ domain: string; id: string; field: string; label: string; status?: string }>;
  summary: {
    total: number;
    published: number;
    editable: number;
    protected: number;
    critical: number;
    criticalPublished: number;
  };
}

const CONTENT_BASE_URL = `${RUNTIME_CONFIG.apiBaseUrl}/content`;
const DEFAULT_MANAGED_CATEGORIES = ['Communication digitale', 'Branding', 'Web'];
const DEFAULT_MANAGED_TAGS = ['Conseil', 'Production', 'Growth'];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${CONTENT_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
    credentials: 'include',
  });

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.success) {
    const code = body?.error?.code || `CONTENT_API_${response.status}`;
    const message = body?.error?.message || `CONTENT_API_${response.status}`;
    throw new ContentApiError(message, code, response.status, body?.error?.details);
  }

  return body;
}

export async function requestWithRetry<T>(
  operation: () => Promise<T>,
  options: { retries?: number; retryDelayMs?: number } = {},
): Promise<T> {
  const retries = options.retries ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 250;

  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      attempt += 1;
      await wait(retryDelayMs * attempt);
    }
  }
}

export async function fetchBackendBlogPosts(): Promise<BlogPost[]> {
  const body = await request<{ posts: BlogPost[] }>('/blog');
  return body.data?.posts || [];
}

export async function fetchPublicBlogPosts(): Promise<BlogPost[]> {
  const response = await fetch(`${CONTENT_BASE_URL}/public/blog`, {
    credentials: 'include',
  });

  const body = (await response.json().catch(() => null)) as ApiEnvelope<{ posts: BlogPost[] }> | null;
  if (!response.ok || !body?.success) {
    const code = body?.error?.code || `CONTENT_API_${response.status}`;
    const message = body?.error?.message || `CONTENT_API_${response.status}`;
    throw new ContentApiError(message, code, response.status, body?.error?.details);
  }

  return body.data?.posts || [];
}

export async function fetchPublicBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const response = await fetch(`${CONTENT_BASE_URL}/public/blog/${encodeURIComponent(slug)}`, {
    credentials: 'include',
  });

  const body = (await response.json().catch(() => null)) as ApiEnvelope<{ post: BlogPost }> | null;
  if (response.status === 404) {
    return null;
  }

  if (!response.ok || !body?.success) {
    const code = body?.error?.code || `CONTENT_API_${response.status}`;
    const message = body?.error?.message || `CONTENT_API_${response.status}`;
    throw new ContentApiError(message, code, response.status, body?.error?.details);
  }

  return body.data?.post || null;
}

export async function saveBackendBlogPost(post: BlogPost): Promise<BlogPost> {
  const body = await request<{ post: BlogPost }>('/blog', {
    method: 'POST',
    body: JSON.stringify(post),
  });
  return body.data!.post;
}

export async function transitionBackendBlogPost(id: string, status: BlogPost['status']): Promise<BlogPost> {
  const body = await request<{ post: BlogPost }>(`/blog/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
  return body.data!.post;
}

export async function deleteBackendBlogPost(id: string): Promise<void> {
  await request('/blog/' + id, { method: 'DELETE' });
}

export async function fetchEditorialAnalytics(): Promise<EditorialAnalytics> {
  const body = await request<{ analytics: EditorialAnalytics }>('/analytics');
  return body.data!.analytics;
}

export async function fetchBackendProjects(): Promise<Project[]> {
  const body = await request<{ projects: Project[] }>('/projects');
  return body.data?.projects || [];
}

export async function saveBackendProject(project: Project): Promise<Project> {
  const body = await request<{ project: Project }>('/projects', {
    method: 'POST',
    body: JSON.stringify(project),
  });
  return body.data!.project;
}


export async function transitionBackendProject(id: string, status: Project['status']): Promise<Project> {
  const body = await request<{ project: Project }>(`/projects/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
  return body.data!.project;
}

export async function deleteBackendProject(id: string): Promise<void> {
  await request('/projects/' + id, { method: 'DELETE' });
}


export async function fetchBackendServices(): Promise<Service[]> {
  const body = await request<{ services: Service[] }>('/services');
  return body.data?.services || [];
}

export async function saveBackendService(service: Service): Promise<Service> {
  const body = await request<{ service: Service }>('/services', {
    method: 'POST',
    body: JSON.stringify(service),
  });
  return body.data!.service;
}

export async function deleteBackendService(id: string): Promise<void> {
  await request('/services/' + id, { method: 'DELETE' });
}

export async function fetchBackendMediaFiles(): Promise<MediaFile[]> {
  const body = await request<{ mediaFiles: MediaFile[] }>('/media');
  return body.data?.mediaFiles || [];
}


export async function uploadBackendMediaFile(payload: MediaUploadPayload): Promise<MediaFile> {
  const body = await request<{ mediaFile: MediaFile }>('/media/upload', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return body.data!.mediaFile;
}

export async function saveBackendMediaFile(mediaFile: MediaFile): Promise<MediaFile> {
  const body = await request<{ mediaFile: MediaFile }>('/media', {
    method: 'POST',
    body: JSON.stringify(mediaFile),
  });
  return body.data!.mediaFile;
}

export async function deleteBackendMediaFile(id: string): Promise<void> {
  await request('/media/' + id, { method: 'DELETE' });
}

export async function fetchBackendMediaReferences(id: string): Promise<Array<{ domain: string; id: string; field: string; label: string }>> {
  const body = await request<{ references: Array<{ domain: string; id: string; field: string; label: string }> }>(`/media/${id}/references`);
  return body.data?.references || [];
}

export async function fetchBackendMediaImpact(id: string): Promise<MediaUsageImpact> {
  const body = await request<{ impact: MediaUsageImpact }>(`/media/${id}/impact`);
  return body.data!.impact;
}

export async function replaceBackendMediaFile(id: string, mediaFile: Partial<MediaFile>): Promise<MediaFile> {
  const body = await request<{ mediaFile: MediaFile }>(`/media/${id}/replace`, {
    method: 'POST',
    body: JSON.stringify(mediaFile),
  });
  return body.data!.mediaFile;
}

export async function restoreBackendMediaFile(id: string): Promise<MediaFile> {
  const body = await request<{ mediaFile: MediaFile }>(`/media/${id}/restore`, {
    method: 'POST',
  });
  return body.data!.mediaFile;
}

export async function fetchBackendPageContent(): Promise<HomePageContentSettings> {
  const body = await request<{ pageContent: { home: HomePageContentSettings } }>('/page-content');
  return body.data?.pageContent?.home as HomePageContentSettings;
}

export async function saveBackendPageContent(home: HomePageContentSettings): Promise<HomePageContentSettings> {
  const body = await request<{ pageContent: { home: HomePageContentSettings } }>('/page-content', {
    method: 'POST',
    body: JSON.stringify({ home }),
  });
  return body.data!.pageContent.home;
}

export async function fetchBackendSettings(): Promise<CmsSettings> {
  const body = await request<{ settings: CmsSettings }>('/settings');
  return normalizeCmsSettings(body.data!.settings);
}

export async function saveBackendSettings(settings: CmsSettings): Promise<CmsSettings> {
  const body = await request<{ settings: CmsSettings }>('/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
  return normalizeCmsSettings(body.data!.settings);
}

export async function fetchPublicSettings(): Promise<PublicSiteSettings> {
  const response = await fetch(`${CONTENT_BASE_URL}/public/settings`, {
    credentials: 'include',
  });

  const body = (await response.json().catch(() => null)) as ApiEnvelope<{ settings: PublicSiteSettings }> | null;
  if (!response.ok || !body?.success) {
    const code = body?.error?.code || `CONTENT_API_${response.status}`;
    const message = body?.error?.message || `CONTENT_API_${response.status}`;
    throw new ContentApiError(message, code, response.status, body?.error?.details);
  }

  return normalizePublicSettings(body.data!.settings);
}

export async function fetchSettingsHistory(limit = 20): Promise<SettingsHistoryEntry[]> {
  const body = await request<{ history: SettingsHistoryEntry[] }>(`/settings/history?limit=${limit}`);
  return body.data?.history || [];
}

export async function rollbackSettingsVersion(versionId: string): Promise<CmsSettings> {
  const body = await request<{ settings: CmsSettings }>(`/settings/${versionId}/rollback`, {
    method: 'POST',
  });
  return normalizeCmsSettings(body.data!.settings);
}

export function normalizeCmsSettings(settings: Partial<CmsSettings> | null | undefined): CmsSettings {
  const siteSettings = settings?.siteSettings && typeof settings.siteSettings === 'object' ? settings.siteSettings : settings;
  const operationalSettings = settings?.operationalSettings && typeof settings.operationalSettings === 'object' ? settings.operationalSettings : settings;
  const taxonomySettings =
    settings?.taxonomySettings && typeof settings.taxonomySettings === 'object'
      ? settings.taxonomySettings
      : settings?.taxonomy && typeof settings.taxonomy === 'object'
        ? settings.taxonomy
        : undefined;

  const normalized: CmsSettings = {
    siteSettings: {
      siteTitle: typeof siteSettings?.siteTitle === 'string' && siteSettings.siteTitle.trim() ? siteSettings.siteTitle.trim() : 'SMOVE',
      supportEmail:
        typeof siteSettings?.supportEmail === 'string' && siteSettings.supportEmail.trim()
          ? siteSettings.supportEmail.trim()
          : 'contact@smove.africa',
      brandMedia: {
        logo: typeof siteSettings?.brandMedia?.logo === 'string' ? siteSettings.brandMedia.logo.trim() : '',
        logoDark: typeof siteSettings?.brandMedia?.logoDark === 'string' ? siteSettings.brandMedia.logoDark.trim() : '',
        favicon: typeof siteSettings?.brandMedia?.favicon === 'string' ? siteSettings.brandMedia.favicon.trim() : '',
        defaultSocialImage:
          typeof siteSettings?.brandMedia?.defaultSocialImage === 'string' ? siteSettings.brandMedia.defaultSocialImage.trim() : '',
      },
    },
    operationalSettings: {
      instantPublishing:
        typeof operationalSettings?.instantPublishing === 'boolean'
          ? operationalSettings.instantPublishing
          : true,
    },
    taxonomySettings: {
      blog: {
        managedCategories: dedupeList(taxonomySettings?.blog?.managedCategories, DEFAULT_MANAGED_CATEGORIES),
        managedTags: dedupeList(taxonomySettings?.blog?.managedTags, DEFAULT_MANAGED_TAGS),
        enforceManagedTags: taxonomySettings?.blog?.enforceManagedTags !== false,
      },
    },
  };

  return {
    ...normalized,
    siteTitle: normalized.siteSettings.siteTitle,
    supportEmail: normalized.siteSettings.supportEmail,
    instantPublishing: normalized.operationalSettings.instantPublishing,
    taxonomy: normalized.taxonomySettings,
  };
}

export function normalizePublicSettings(settings: Partial<PublicSiteSettings> | null | undefined): PublicSiteSettings {
  const siteSettings = settings?.siteSettings && typeof settings.siteSettings === 'object' ? settings.siteSettings : settings;
  const brandMedia = siteSettings?.brandMedia || settings?.brandMedia;

  const normalized: PublicSiteSettings = {
    siteSettings: {
      siteTitle: typeof siteSettings?.siteTitle === 'string' && siteSettings.siteTitle.trim() ? siteSettings.siteTitle.trim() : 'SMOVE',
      supportEmail:
        typeof siteSettings?.supportEmail === 'string' && siteSettings.supportEmail.trim()
          ? siteSettings.supportEmail.trim()
          : 'contact@smove.africa',
      brandMedia: {
        logo: typeof brandMedia?.logo === 'string' ? brandMedia.logo.trim() : '',
        logoDark: typeof brandMedia?.logoDark === 'string' ? brandMedia.logoDark.trim() : '',
        favicon: typeof brandMedia?.favicon === 'string' ? brandMedia.favicon.trim() : '',
        defaultSocialImage: typeof brandMedia?.defaultSocialImage === 'string' ? brandMedia.defaultSocialImage.trim() : '',
      },
    },
  };

  return {
    ...normalized,
    siteTitle: normalized.siteSettings.siteTitle,
    supportEmail: normalized.siteSettings.supportEmail,
    brandMedia: normalized.siteSettings.brandMedia,
  };
}

function dedupeList(values: string[] | undefined, fallback: string[]): string[] {
  const source = Array.isArray(values) ? values : fallback;
  const seen = new Set<string>();
  const output: string[] = [];
  source.forEach((entry) => {
    const value = `${entry || ''}`.trim();
    if (!value) return;
    const key = value.toLocaleLowerCase('fr');
    if (seen.has(key)) return;
    seen.add(key);
    output.push(value);
  });
  return output.length ? output : [...fallback];
}

export async function fetchSyncDiagnostics(): Promise<SyncDiagnostics> {
  const body = await request<{ diagnostics: SyncDiagnostics }>('/sync-diagnostics');
  return body.data!.diagnostics;
}


export async function fetchConversionMetrics(): Promise<ConversionMetrics> {
  const body = await request<{ metrics: ConversionMetrics }>('/metrics');
  return body.data!.metrics;
}

export async function fetchContentHealthSummary(): Promise<ContentHealthSummary> {
  const body = await request<{ health: ContentHealthSummary }>('/health-summary');
  return body.data!.health;
}
