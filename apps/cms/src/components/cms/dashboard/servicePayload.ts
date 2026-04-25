import type { Service } from '../../../domain/contentSchemas';

export interface ServiceFormPayloadState {
  id?: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  icon: string;
  iconLikeAsset: string;
  color: string;
  features: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  routeSlug: string;
  overviewDescription: string;
  ctaTitle: string;
  ctaDescription: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  processTitle: string;
  processSteps: string;
}

const normalizeSlug = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const buildServicePayload = (form: ServiceFormPayloadState, mode: 'create' | 'edit'): Service => {
  const slug = form.slug.trim() || normalizeSlug(form.title);
  const routeSlug = form.routeSlug.trim() || slug;
  const featureList = form.features.split('\n').map((entry) => entry.trim()).filter(Boolean);
  const processSteps = form.processSteps.split('\n').map((entry) => entry.trim()).filter(Boolean);
  const payloadBase = {
    id: form.id || `service-${Date.now()}`,
    title: form.title.trim(),
    slug,
    routeSlug,
    status: form.status,
    featured: form.featured,
  };

  if (mode === 'create') {
    return {
      ...payloadBase,
      description: form.description.trim(),
      icon: form.icon.trim(),
      color: form.color.trim(),
      features: featureList,
      shortDescription: form.shortDescription.trim() || undefined,
      iconLikeAsset: form.iconLikeAsset.trim() || undefined,
      overviewDescription: form.overviewDescription.trim() || undefined,
      ctaTitle: form.ctaTitle.trim() || undefined,
      ctaDescription: form.ctaDescription.trim() || undefined,
      ctaPrimaryLabel: form.ctaPrimaryLabel.trim() || undefined,
      ctaPrimaryHref: form.ctaPrimaryHref.trim() || undefined,
      processTitle: form.processTitle.trim() || undefined,
      processSteps,
    };
  }

  return {
    ...payloadBase,
    ...(form.description.trim() ? { description: form.description.trim() } : {}),
    ...(form.icon.trim() ? { icon: form.icon.trim() } : {}),
    ...(form.color.trim() ? { color: form.color.trim() } : {}),
    ...(featureList.length > 0 ? { features: featureList } : {}),
    ...(form.shortDescription.trim() ? { shortDescription: form.shortDescription.trim() } : {}),
    ...(form.iconLikeAsset.trim() ? { iconLikeAsset: form.iconLikeAsset.trim() } : {}),
    ...(form.overviewDescription.trim() ? { overviewDescription: form.overviewDescription.trim() } : {}),
    ...(form.ctaTitle.trim() ? { ctaTitle: form.ctaTitle.trim() } : {}),
    ...(form.ctaDescription.trim() ? { ctaDescription: form.ctaDescription.trim() } : {}),
    ...(form.ctaPrimaryLabel.trim() ? { ctaPrimaryLabel: form.ctaPrimaryLabel.trim() } : {}),
    ...(form.ctaPrimaryHref.trim() ? { ctaPrimaryHref: form.ctaPrimaryHref.trim() } : {}),
    ...(form.processTitle.trim() ? { processTitle: form.processTitle.trim() } : {}),
    ...(processSteps.length > 0 ? { processSteps } : {}),
  };
};
