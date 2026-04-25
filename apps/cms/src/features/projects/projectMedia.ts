import type { Project } from '../../domain/contentSchemas';
import { isMediaReferenceValue, resolveAssetReference, toMediaReferenceValue } from '../media/assetReference';

export const PROJECT_MEDIA_FALLBACK_QUERY = 'project cover image';

const asTrimmed = (value?: string): string => (typeof value === 'string' ? value.trim() : '');

export interface ResolvedProjectMedia {
  reference: string;
  src: string;
  alt: string;
}

export interface CanonicalProjectMediaRoles {
  cardImage: string;
  heroImage: string;
  socialImage: string;
  galleryImages: string[];
}

export const toProjectMediaReference = (mediaId: string) => toMediaReferenceValue(mediaId);

export const isProjectMediaReference = (value?: string) => isMediaReferenceValue(value);

export function toCanonicalProjectMediaRoles(
  project: Pick<Project, 'featuredImage' | 'mainImage' | 'images' | 'mediaRoles' | 'seo'>,
): CanonicalProjectMediaRoles {
  const legacyFeatured = asTrimmed(project.featuredImage);
  const legacyMain = asTrimmed(project.mainImage);
  const roleCard = asTrimmed(project.mediaRoles?.cardImage);
  const roleHero = asTrimmed(project.mediaRoles?.heroImage);
  const roleCover = asTrimmed(project.mediaRoles?.coverImage);
  const roleSocial = asTrimmed(project.mediaRoles?.socialImage);
  const seoSocial = asTrimmed(project.seo?.socialImage);
  const roleGallery = Array.isArray(project.mediaRoles?.galleryImages)
    ? project.mediaRoles?.galleryImages.map((entry) => asTrimmed(entry)).filter(Boolean)
    : [];

  const cardImage = roleCard || roleHero || roleCover || legacyFeatured || legacyMain || PROJECT_MEDIA_FALLBACK_QUERY;
  const heroImage = roleHero || roleCover || roleCard || legacyMain || legacyFeatured || cardImage;
  const socialImage = roleSocial || seoSocial || roleCard || roleHero || legacyFeatured || legacyMain || cardImage;
  const legacyGallery = Array.isArray(project.images) ? project.images.map((entry) => asTrimmed(entry)).filter(Boolean) : [];
  const galleryImages = roleGallery.length > 0 ? roleGallery : legacyGallery.length > 0 ? legacyGallery : [heroImage];

  return {
    cardImage,
    heroImage,
    socialImage,
    galleryImages,
  };
}

export function resolveProjectFeaturedImage(project: Pick<Project, 'featuredImage' | 'mainImage' | 'title' | 'imageAlt' | 'mediaRoles'>): ResolvedProjectMedia {
  const roles = toCanonicalProjectMediaRoles(project);
  const fallbackAlt = asTrimmed(project.imageAlt) || asTrimmed(project.title) || 'Projet SMOVE';
  const resolved = resolveAssetReference(roles.cardImage, fallbackAlt, PROJECT_MEDIA_FALLBACK_QUERY);

  return {
    reference: resolved.reference,
    src: resolved.src,
    alt: resolved.alt,
  };
}

export function resolveProjectHeroMedia(project: Pick<Project, 'featuredImage' | 'mainImage' | 'title' | 'imageAlt' | 'mediaRoles'>): ResolvedProjectMedia {
  const roles = toCanonicalProjectMediaRoles(project);
  const resolved = resolveAssetReference(roles.heroImage, project.imageAlt || project.title || 'Projet SMOVE', PROJECT_MEDIA_FALLBACK_QUERY);

  return {
    reference: resolved.reference,
    src: resolved.src,
    alt: resolved.alt,
  };
}

export function resolveProjectGalleryMedia(project: Pick<Project, 'images' | 'title' | 'imageAlt' | 'featuredImage' | 'mainImage' | 'mediaRoles'>): ResolvedProjectMedia[] {
  const roles = toCanonicalProjectMediaRoles(project);

  return roles.galleryImages.map((reference) => {
    const resolved = resolveAssetReference(reference, project.imageAlt || project.title || 'Projet SMOVE', PROJECT_MEDIA_FALLBACK_QUERY);
    return {
      reference: resolved.reference,
      src: resolved.src,
      alt: resolved.alt,
    };
  });
}
