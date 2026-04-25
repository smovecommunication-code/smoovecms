export type BlogStatus = 'draft' | 'in_review' | 'published' | 'archived';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  authorRole: string;
  category: string;
  tags: string[];
  publishedDate: string;
  readTime: string;
  featuredImage: string;
  images: string[];
  status: BlogStatus;
  seo?: {
    title?: string;
    description?: string;
    canonicalSlug?: string;
    socialImage?: string;
    noIndex?: boolean;
    canonicalUrl?: string;
  };
  mediaRoles?: {
    featuredImage?: string;
    socialImage?: string;
    coverImage?: string;
    cardImage?: string;
  };
  ownerUserId?: string;
  organizationId?: string;
  updatedBy?: string;
}

export type MediaType = 'image' | 'video' | 'document';

export interface MediaAsset {
  id: string;
  type: MediaType;
  url: string;
  alt?: string;
  title?: string;
  label?: string;
  width?: number;
  height?: number;
  metadata?: Record<string, string>;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
  variants?: Partial<Record<'thumbnail' | 'card' | 'hero' | 'social' | 'original', {
    url: string;
    width?: number;
    height?: number;
    mimeType?: string;
  }>>;

  // Legacy compatibility fields
  name: string;
  thumbnailUrl?: string;
  size: number;
  uploadedDate: string;
  uploadedBy: string;
  caption?: string;
  tags: string[];
  ownerUserId?: string;
  organizationId?: string;
}

export type MediaFile = MediaAsset;

export interface Project {
  id: string;
  title: string;
  slug?: string;
  summary?: string;
  featuredImage?: string;
  imageAlt?: string;
  client: string;
  category: string;
  year: string;
  description: string;
  challenge: string;
  solution: string;
  results: string[];
  tags: string[];
  mainImage: string;
  images: string[];
  featured?: boolean;
  status?: 'draft' | 'in_review' | 'published' | 'archived';
  reviewedAt?: string;
  reviewedBy?: string;
  link?: string;
  createdAt?: string;
  updatedAt?: string;
  links?: {
    live?: string;
    caseStudy?: string;
  };
  testimonial?: {
    text: string;
    author: string;
    position: string;
  };
  mediaRoles?: {
    cardImage?: string;
    heroImage?: string;
    coverImage?: string;
    socialImage?: string;
    galleryImages?: string[];
  };
  seo?: {
    title?: string;
    description?: string;
    canonicalSlug?: string;
    socialImage?: string;
  };
  ownerUserId?: string;
  organizationId?: string;
  updatedBy?: string;
}

export interface Service {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  icon: string;
  color: string;
  features: string[];
  status?: 'draft' | 'published' | 'archived';
  featured?: boolean;
  routeSlug?: string;
  overviewTitle?: string;
  overviewDescription?: string;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaPrimaryLabel?: string;
  ctaPrimaryHref?: string;
  processTitle?: string;
  processSteps?: string[];
  iconLikeAsset?: string;
  seo?: {
    title?: string;
    description?: string;
    canonicalSlug?: string;
    socialImage?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  ownerUserId?: string;
  organizationId?: string;
  updatedBy?: string;
}

const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const isBlogPost = (value: unknown): value is BlogPost => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;

  const seo = v.seo as Record<string, unknown> | undefined;

  return (
    isString(v.id) &&
    isString(v.title) &&
    typeof v.slug === 'string' &&
    typeof v.excerpt === 'string' &&
    typeof v.content === 'string' &&
    typeof v.author === 'string' &&
    typeof v.authorRole === 'string' &&
    typeof v.category === 'string' &&
    Array.isArray(v.tags) && v.tags.every((item) => typeof item === 'string') &&
    typeof v.publishedDate === 'string' &&
    typeof v.readTime === 'string' &&
    isString(v.featuredImage) &&
    Array.isArray(v.images) && v.images.every((item) => typeof item === 'string') &&
    (v.status === 'published' || v.status === 'draft' || v.status === 'in_review' || v.status === 'archived') &&
    (seo === undefined ||
      (typeof seo === 'object' &&
        seo !== null &&
        (seo.title === undefined || typeof seo.title === 'string') &&
        (seo.description === undefined || typeof seo.description === 'string') &&
        (seo.canonicalSlug === undefined || typeof seo.canonicalSlug === 'string') &&
        (seo.socialImage === undefined || typeof seo.socialImage === 'string') &&
        (seo.noIndex === undefined || typeof seo.noIndex === 'boolean') &&
        (seo.canonicalUrl === undefined || typeof seo.canonicalUrl === 'string')))
    &&
    (v.mediaRoles === undefined ||
      (typeof v.mediaRoles === 'object' &&
        v.mediaRoles !== null &&
        (((v.mediaRoles as Record<string, unknown>).featuredImage === undefined) || typeof (v.mediaRoles as Record<string, unknown>).featuredImage === 'string') &&
        (((v.mediaRoles as Record<string, unknown>).socialImage === undefined) || typeof (v.mediaRoles as Record<string, unknown>).socialImage === 'string') &&
        (((v.mediaRoles as Record<string, unknown>).coverImage === undefined) || typeof (v.mediaRoles as Record<string, unknown>).coverImage === 'string') &&
        (((v.mediaRoles as Record<string, unknown>).cardImage === undefined) || typeof (v.mediaRoles as Record<string, unknown>).cardImage === 'string')))
  );
};

export const isMediaFile = (value: unknown): value is MediaFile => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;

  return (
    isString(v.id) &&
    isString(v.name) &&
    (v.type === 'image' || v.type === 'video' || v.type === 'document') &&
    isString(v.url) &&
    (v.thumbnailUrl === undefined || isString(v.thumbnailUrl)) &&
    typeof v.size === 'number' &&
    v.size >= 0 &&
    isString(v.uploadedDate) &&
    isString(v.uploadedBy) &&
    (v.alt === undefined || isString(v.alt)) &&
    (v.title === undefined || isString(v.title)) &&
    (v.label === undefined || isString(v.label)) &&
    (v.width === undefined || (typeof v.width === 'number' && v.width >= 0)) &&
    (v.height === undefined || (typeof v.height === 'number' && v.height >= 0)) &&
    (v.metadata === undefined ||
      (typeof v.metadata === 'object' &&
        v.metadata !== null &&
        Object.values(v.metadata as Record<string, unknown>).every((item) => typeof item === 'string'))) &&
    (v.source === undefined || isString(v.source)) &&
    (v.createdAt === undefined || isString(v.createdAt)) &&
    (v.updatedAt === undefined || isString(v.updatedAt)) &&
    (v.archivedAt === undefined || v.archivedAt === null || isString(v.archivedAt)) &&
    (v.variants === undefined ||
      (typeof v.variants === 'object' &&
        v.variants !== null &&
        Object.entries(v.variants as Record<string, unknown>).every(([key, variant]) =>
          ['thumbnail', 'card', 'hero', 'social', 'original'].includes(key) &&
          typeof variant === 'object' &&
          variant !== null &&
          isString((variant as Record<string, unknown>).url) &&
          ((variant as Record<string, unknown>).width === undefined || typeof (variant as Record<string, unknown>).width === 'number') &&
          ((variant as Record<string, unknown>).height === undefined || typeof (variant as Record<string, unknown>).height === 'number') &&
          ((variant as Record<string, unknown>).mimeType === undefined || isString((variant as Record<string, unknown>).mimeType))
        ))) &&
    (v.caption === undefined || isString(v.caption)) &&
    isStringArray(v.tags)
  );
};

export const isProject = (value: unknown): value is Project => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const testimonial = v.testimonial as Record<string, unknown> | undefined;
  const links = v.links as Record<string, unknown> | undefined;

  return (
    isString(v.id) &&
    isString(v.title) &&
    typeof v.client === 'string' &&
    typeof v.category === 'string' &&
    typeof v.year === 'string' &&
    typeof v.description === 'string' &&
    typeof v.challenge === 'string' &&
    typeof v.solution === 'string' &&
    Array.isArray(v.results) && v.results.every((item) => typeof item === 'string') &&
    Array.isArray(v.tags) && v.tags.every((item) => typeof item === 'string') &&
    isString(v.mainImage) &&
    Array.isArray(v.images) && v.images.every((item) => typeof item === 'string') &&
    (v.slug === undefined || isString(v.slug)) &&
    (v.summary === undefined || isString(v.summary)) &&
    (v.featuredImage === undefined || isString(v.featuredImage)) &&
    (v.imageAlt === undefined || isString(v.imageAlt)) &&
    (v.featured === undefined || typeof v.featured === 'boolean') &&
    (v.status === undefined || v.status === 'draft' || v.status === 'in_review' || v.status === 'published' || v.status === 'archived') &&
    (v.link === undefined || isString(v.link)) &&
    (v.createdAt === undefined || isString(v.createdAt)) &&
    (v.updatedAt === undefined || isString(v.updatedAt)) &&
    (v.reviewedAt === undefined || isString(v.reviewedAt)) &&
    (v.reviewedBy === undefined || isString(v.reviewedBy)) &&
    (links === undefined ||
      (typeof links === 'object' &&
        links !== null &&
        (links.live === undefined || isString(links.live)) &&
        (links.caseStudy === undefined || isString(links.caseStudy)))) &&
    (testimonial === undefined ||
      (typeof testimonial === 'object' &&
        testimonial !== null &&
        isString(testimonial.text) &&
        isString(testimonial.author) &&
        isString(testimonial.position)))
    &&
    (v.mediaRoles === undefined ||
      (typeof v.mediaRoles === 'object' &&
        v.mediaRoles !== null &&
        (((v.mediaRoles as Record<string, unknown>).cardImage === undefined) || isString((v.mediaRoles as Record<string, unknown>).cardImage)) &&
        (((v.mediaRoles as Record<string, unknown>).heroImage === undefined) || isString((v.mediaRoles as Record<string, unknown>).heroImage)) &&
        (((v.mediaRoles as Record<string, unknown>).coverImage === undefined) || isString((v.mediaRoles as Record<string, unknown>).coverImage)) &&
        (((v.mediaRoles as Record<string, unknown>).socialImage === undefined) || isString((v.mediaRoles as Record<string, unknown>).socialImage)) &&
        (((v.mediaRoles as Record<string, unknown>).galleryImages === undefined) || isStringArray((v.mediaRoles as Record<string, unknown>).galleryImages))))
    &&
    (v.seo === undefined ||
      (typeof v.seo === 'object' &&
        v.seo !== null &&
        (((v.seo as Record<string, unknown>).title === undefined) || isString((v.seo as Record<string, unknown>).title)) &&
        (((v.seo as Record<string, unknown>).description === undefined) || isString((v.seo as Record<string, unknown>).description)) &&
        (((v.seo as Record<string, unknown>).canonicalSlug === undefined) || isString((v.seo as Record<string, unknown>).canonicalSlug)) &&
        (((v.seo as Record<string, unknown>).socialImage === undefined) || isString((v.seo as Record<string, unknown>).socialImage))))
  );
};

export const isBlogPostArray = (value: unknown): value is BlogPost[] =>
  Array.isArray(value) && value.every(isBlogPost);

export const isMediaFileArray = (value: unknown): value is MediaFile[] =>
  Array.isArray(value) && value.every(isMediaFile);

export const isProjectArray = (value: unknown): value is Project[] =>
  Array.isArray(value) && value.every(isProject);

export const isService = (value: unknown): value is Service => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;

  return (
    isString(v.id) &&
    isString(v.title) &&
    isString(v.slug) &&
    isString(v.description) &&
    isString(v.icon) &&
    isString(v.color) &&
    isStringArray(v.features) &&
    (v.shortDescription === undefined || isString(v.shortDescription)) &&
    (v.routeSlug === undefined || isString(v.routeSlug)) &&
    (v.overviewTitle === undefined || isString(v.overviewTitle)) &&
    (v.overviewDescription === undefined || isString(v.overviewDescription)) &&
    (v.ctaTitle === undefined || isString(v.ctaTitle)) &&
    (v.ctaDescription === undefined || isString(v.ctaDescription)) &&
    (v.ctaPrimaryLabel === undefined || isString(v.ctaPrimaryLabel)) &&
    (v.ctaPrimaryHref === undefined || isString(v.ctaPrimaryHref)) &&
    (v.processTitle === undefined || isString(v.processTitle)) &&
    (v.processSteps === undefined || isStringArray(v.processSteps)) &&
    (v.iconLikeAsset === undefined || isString(v.iconLikeAsset)) &&
    (v.seo === undefined ||
      (typeof v.seo === 'object' &&
        v.seo !== null &&
        (((v.seo as Record<string, unknown>).title === undefined) || isString((v.seo as Record<string, unknown>).title)) &&
        (((v.seo as Record<string, unknown>).description === undefined) || isString((v.seo as Record<string, unknown>).description)) &&
        (((v.seo as Record<string, unknown>).canonicalSlug === undefined) || isString((v.seo as Record<string, unknown>).canonicalSlug)) &&
        (((v.seo as Record<string, unknown>).socialImage === undefined) || isString((v.seo as Record<string, unknown>).socialImage)))) &&
    (v.status === undefined || v.status === 'draft' || v.status === 'published' || v.status === 'archived') &&
    (v.link === undefined || isString(v.link)) &&
    (v.featured === undefined || typeof v.featured === 'boolean') &&
    (v.createdAt === undefined || isString(v.createdAt)) &&
    (v.updatedAt === undefined || isString(v.updatedAt))
  );
};

export const isServiceArray = (value: unknown): value is Service[] =>
  Array.isArray(value) && value.every(isService);
