import type { BlogPost } from '../../domain/contentSchemas';
import { normalizeSlug as normalizeSharedSlug } from '../../shared/contentContracts';
import { BLOG_MEDIA_FALLBACK_QUERY, resolveBlogMediaReference } from './mediaReference';

export interface CanonicalBlogSeo {
  title: string;
  description: string;
  canonicalSlug: string;
  socialImage: string;
}

export interface CanonicalBlogMedia {
  reference: string;
  src: string;
  alt: string;
  caption: string;
}

export interface CanonicalBlogEntry {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  featuredImage: string;
  readTime: string;
  publishedDate: string;
  status: BlogPost['status'];
  seo: CanonicalBlogSeo;
  media: CanonicalBlogMedia;
}


export interface PublishabilityEvaluation {
  publishable: boolean;
  reasons: string[];
}

export interface CmsBlogInput {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags?: string;
  featuredImage?: string;
  readTime?: string;
  status: BlogPost['status'];
  publishedDate?: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalSlug?: string;
  socialImage?: string;
}

export const normalizeSlug = (rawSlug: string, fallbackTitle?: string): string =>
  normalizeSharedSlug(rawSlug, fallbackTitle, 'article-sans-titre');

function safeDateString(value: string): string {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date(0).toISOString() : new Date(parsed).toISOString();
}

export function toCanonicalBlogEntry(post: BlogPost): CanonicalBlogEntry {
  const excerpt = post.excerpt || post.content.slice(0, 160) || 'Contenu indisponible.';
  const title = post.title || 'Article sans titre';
  const slug = normalizeSlug(post.slug, title);
  const featuredImageRef =
    post.mediaRoles?.featuredImage?.trim() ||
    post.mediaRoles?.coverImage?.trim() ||
    post.mediaRoles?.cardImage?.trim() ||
    post.featuredImage;
  const media = resolveBlogMediaReference(featuredImageRef, title);
  const seoTitle = post.seo?.title?.trim() || title;
  const seoDescription = post.seo?.description?.trim() || excerpt;
  const canonicalSlug = normalizeSlug(post.seo?.canonicalSlug || slug, title);
  const socialImageRef = post.mediaRoles?.socialImage?.trim() || post.seo?.socialImage?.trim() || featuredImageRef || media.src;
  const socialMedia = resolveBlogMediaReference(socialImageRef, title);

  return {
    id: post.id,
    slug,
    title,
    excerpt,
    content: post.content || '',
    author: post.author || 'Équipe SMOVE',
    category: (post.category || 'Non classé').trim() || 'Non classé',
    featuredImage: media.src,
    readTime: post.readTime || '5 min',
    publishedDate: safeDateString(post.publishedDate),
    status: post.status,
    seo: {
      title: seoTitle,
      description: seoDescription,
      canonicalSlug,
      socialImage: socialMedia.src,
    },
    media,
  };
}


export function evaluatePublishability(entry: CanonicalBlogEntry): PublishabilityEvaluation {
  const reasons: string[] = [];

  if (entry.status !== 'published') {
    reasons.push('status_not_published');
  }
  if (!entry.slug.trim()) {
    reasons.push('missing_slug');
  }
  if (!entry.title.trim()) {
    reasons.push('missing_title');
  }
  if (!entry.featuredImage.trim()) {
    reasons.push('missing_featured_image');
  }
  if (Number.isNaN(Date.parse(entry.publishedDate))) {
    reasons.push('invalid_published_date');
  }

  return {
    publishable: reasons.length === 0,
    reasons,
  };
}

export function fromCmsBlogInput(input: CmsBlogInput): BlogPost {
  return fromCmsBlogInputWithExisting(input);
}

export function fromCmsBlogInputWithExisting(input: CmsBlogInput, existingPost?: BlogPost): BlogPost {
  const title = input.title.trim();
  const slug = normalizeSlug(input.slug, title);
  const fallbackContent = input.content.trim() || 'Contenu à compléter.';
  const excerpt = input.excerpt.trim() || fallbackContent.slice(0, 160) || `Résumé à compléter pour ${title || 'cet article'}.`;

  const category = input.category.trim() || 'Non classé';
  const fallbackFeatured =
    existingPost?.mediaRoles?.featuredImage?.trim() ||
    existingPost?.mediaRoles?.coverImage?.trim() ||
    existingPost?.mediaRoles?.cardImage?.trim() ||
    existingPost?.featuredImage?.trim() ||
    BLOG_MEDIA_FALLBACK_QUERY;
  const featuredImage = input.featuredImage?.trim() || fallbackFeatured;
  const fallbackSocial =
    existingPost?.mediaRoles?.socialImage?.trim() ||
    existingPost?.seo?.socialImage?.trim() ||
    featuredImage;
  const socialImage = input.socialImage?.trim() || fallbackSocial;
  const featuredImageUpdated = Boolean(input.featuredImage?.trim());
  const existingImages = Array.isArray(existingPost?.images)
    ? existingPost.images.map((entry) => entry.trim()).filter(Boolean)
    : [];
  const images = Array.from(new Set([featuredImage, ...existingImages].filter(Boolean)));

  const seen = new Set<string>();
  return {
    id: input.id || existingPost?.id || `post-${Date.now()}`,
    title,
    slug,
    excerpt,
    content: fallbackContent,
    author: input.author.trim() || 'Équipe SMOVE',
    authorRole: 'CMS Editor',
    category,
    tags: (input.tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .filter((tag) => {
        const key = tag.toLocaleLowerCase('fr');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    publishedDate: input.publishedDate || new Date().toISOString(),
    readTime: input.readTime?.trim() || '5 min',
    featuredImage,
    images,
    status: input.status,
    seo: {
      title: input.seoTitle?.trim() || title,
      description: input.seoDescription?.trim() || excerpt,
      canonicalSlug: normalizeSlug(input.canonicalSlug || slug, title),
      socialImage,
    },
    mediaRoles: {
      ...existingPost?.mediaRoles,
      featuredImage,
      socialImage,
      coverImage: featuredImageUpdated ? featuredImage : (existingPost?.mediaRoles?.coverImage?.trim() || featuredImage),
      cardImage: featuredImageUpdated ? featuredImage : (existingPost?.mediaRoles?.cardImage?.trim() || featuredImage),
    },
  };
}
