import { isBlogPost, type BlogPost } from '../domain/contentSchemas';
import { defaultBlogPosts } from '../data/blogSeed';
import { readFromStorage, writeToStorage } from './storage/localStorageStore';
import { isMediaReference } from '../features/blog/mediaReference';
import { mediaRepository } from './mediaRepository';
import { normalizeSlug } from '../features/blog/blogEntryAdapter';
import { isValidMediaFieldValue as isValidMediaFieldContract } from '../shared/contentContracts';

const BLOG_STORAGE_KEY = 'smove_blog_posts';

export type BlogRepositoryErrorCode =
  | 'BLOG_VALIDATION_ERROR'
  | 'BLOG_SLUG_CONFLICT'
  | 'BLOG_NOT_FOUND'
  | 'BLOG_INVALID_STATUS_TRANSITION'
  | 'BLOG_INVALID_MEDIA_REFERENCE';

export class BlogRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: BlogRepositoryErrorCode,
  ) {
    super(message);
    this.name = 'BlogRepositoryError';
  }
}

export interface BlogRepository {
  getAll(): BlogPost[];
  getById(id: string): BlogPost | undefined;
  getBySlug(slug: string): BlogPost | undefined;
  save(post: BlogPost): void;
  delete(id: string): void;
  publish(id: string): BlogPost;
  unpublish(id: string): BlogPost;
  archive(id: string): BlogPost;
  getPublished(): BlogPost[];
  getDrafts(): BlogPost[];
  getInReview(): BlogPost[];
  getArchived(): BlogPost[];
  search(query: string): BlogPost[];
}


const LEGACY_STATUS_FALLBACK: BlogPost['status'] = 'draft';

const normalizeLegacyStatus = (status: unknown): BlogPost['status'] =>
  status === 'published' || status === 'draft' || status === 'in_review' || status === 'archived' ? status : LEGACY_STATUS_FALLBACK;

const normalizeSeo = (candidate: Partial<BlogPost>): BlogPost['seo'] => {
  const seo = candidate.seo || {};
  const title = (candidate.title || '').trim();
  const excerpt = (candidate.excerpt || '').trim();
  const slug = normalizeSlug(candidate.slug || '', title);

  return {
    title: seo.title?.trim() || title,
    description: seo.description?.trim() || excerpt || (candidate.content || '').slice(0, 160),
    canonicalSlug: normalizeSlug(seo.canonicalSlug || slug, title),
    socialImage: seo.socialImage?.trim() || candidate.mediaRoles?.socialImage?.trim() || candidate.featuredImage || 'blog article image',
  };
};

const coerceBlogPost = (value: unknown): BlogPost | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<BlogPost> & { status?: unknown };

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.slug !== 'string' ||
    typeof candidate.excerpt !== 'string' ||
    typeof candidate.content !== 'string' ||
    typeof candidate.author !== 'string' ||
    typeof candidate.authorRole !== 'string' ||
    typeof candidate.category !== 'string' ||
    !Array.isArray(candidate.tags) ||
    !candidate.tags.every((tag) => typeof tag === 'string') ||
    typeof candidate.publishedDate !== 'string' ||
    typeof candidate.readTime !== 'string' ||
    typeof candidate.featuredImage !== 'string' ||
    !Array.isArray(candidate.images) ||
    !candidate.images.every((image) => typeof image === 'string')
  ) {
    return null;
  }

  const featuredImage = (candidate.mediaRoles?.featuredImage || candidate.featuredImage || '').trim() || 'blog article image';
  const socialImage = (candidate.mediaRoles?.socialImage || candidate.seo?.socialImage || featuredImage).trim();

  return {
    ...candidate,
    status: normalizeLegacyStatus(candidate.status),
    featuredImage,
    seo: { ...normalizeSeo({ ...candidate, featuredImage }), socialImage },
    mediaRoles: {
      featuredImage,
      socialImage,
    },
  } as BlogPost;
};


const isValidMediaField = (value: string): boolean =>
  isValidMediaFieldContract(value, {
    allowInlineText: true,
    hasMediaById: (mediaId) => Boolean(mediaRepository.getById(mediaId)),
  });

const isMigratableBlogPostArray = (value: unknown): value is BlogPost[] =>
  Array.isArray(value) && value.every((entry) => coerceBlogPost(entry) !== null);

class LocalBlogRepository implements BlogRepository {
  getAll(): BlogPost[] {
    const posts = readFromStorage(BLOG_STORAGE_KEY, isMigratableBlogPostArray, defaultBlogPosts, { persistFallback: true });
    const normalizedPosts = posts
      .map((post) => coerceBlogPost(post))
      .filter((post): post is BlogPost => post !== null);

    const needsRewrite =
      normalizedPosts.length !== posts.length ||
      normalizedPosts.some((post, index) => post.status !== normalizeLegacyStatus((posts[index] as BlogPost).status));

    if (needsRewrite) {
      writeToStorage(BLOG_STORAGE_KEY, normalizedPosts);
    }

    return normalizedPosts;
  }

  getById(id: string): BlogPost | undefined {
    return this.getAll().find((post) => post.id === id);
  }

  getBySlug(slug: string): BlogPost | undefined {
    return this.getAll().find((post) => post.slug === slug);
  }

  save(post: BlogPost): void {
    if (!isBlogPost(post)) {
      throw new BlogRepositoryError('Invalid blog post payload', 'BLOG_VALIDATION_ERROR');
    }

    const trustedPost = post;

    if (!isValidMediaField(trustedPost.featuredImage)) {
      throw new BlogRepositoryError('Le média sélectionné est invalide ou supprimé.', 'BLOG_INVALID_MEDIA_REFERENCE');
    }

    if (trustedPost.seo?.socialImage && !isValidMediaField(trustedPost.seo.socialImage)) {
      throw new BlogRepositoryError('L’image sociale SEO est invalide ou supprimée.', 'BLOG_INVALID_MEDIA_REFERENCE');
    }

    if (trustedPost.images.some((image) => !isValidMediaField(image))) {
      throw new BlogRepositoryError('Une image secondaire référence un média invalide.', 'BLOG_INVALID_MEDIA_REFERENCE');
    }

    const posts = this.getAll();

    const slugOwner = posts.find(
      (candidate) => candidate.slug === trustedPost.slug && candidate.id !== trustedPost.id,
    );

    if (slugOwner) {
      throw new BlogRepositoryError('Ce slug est déjà utilisé par un autre article.', 'BLOG_SLUG_CONFLICT');
    }

    const index = posts.findIndex((candidate) => candidate.id === trustedPost.id);

    if (index >= 0) {
      posts[index] = { ...trustedPost, seo: normalizeSeo(trustedPost), mediaRoles: { featuredImage: trustedPost.featuredImage, socialImage: trustedPost.seo?.socialImage || trustedPost.featuredImage } };
    } else {
      posts.push({ ...trustedPost, seo: normalizeSeo(trustedPost), mediaRoles: { featuredImage: trustedPost.featuredImage, socialImage: trustedPost.seo?.socialImage || trustedPost.featuredImage } });
    }

    writeToStorage(BLOG_STORAGE_KEY, posts);
  }


  private requireById(id: string): { posts: BlogPost[]; index: number } {
    const posts = this.getAll();
    const index = posts.findIndex((post) => post.id === id);

    if (index < 0) {
      throw new BlogRepositoryError('Article introuvable.', 'BLOG_NOT_FOUND');
    }

    return { posts, index };
  }

  private persistStatus(id: string, status: BlogPost['status']): BlogPost {
    const { posts, index } = this.requireById(id);
    const current = posts[index];

    const transitions: Record<BlogPost['status'], BlogPost['status'][]> = {
      draft: ['in_review', 'archived'],
      in_review: ['draft', 'published', 'archived'],
      published: ['draft', 'archived'],
      archived: ['draft'],
    };

    if (!transitions[current.status].includes(status)) {
      throw new BlogRepositoryError('Transition de statut invalide.', 'BLOG_INVALID_STATUS_TRANSITION');
    }

    const updated = { ...current, status };
    posts[index] = updated;
    writeToStorage(BLOG_STORAGE_KEY, posts);
    return updated;
  }

  delete(id: string): void {
    writeToStorage(
      BLOG_STORAGE_KEY,
      this.getAll().filter((post) => post.id !== id),
    );
  }

  publish(id: string): BlogPost {
    return this.persistStatus(id, 'published');
  }

  unpublish(id: string): BlogPost {
    return this.persistStatus(id, 'draft');
  }

  archive(id: string): BlogPost {
    return this.persistStatus(id, 'archived');
  }

  getPublished(): BlogPost[] {
    return this.getAll().filter((post) => post.status === 'published');
  }

  getDrafts(): BlogPost[] {
    return this.getAll().filter((post) => post.status === 'draft');
  }

  getInReview(): BlogPost[] {
    return this.getAll().filter((post) => post.status === 'in_review');
  }

  getArchived(): BlogPost[] {
    return this.getAll().filter((post) => post.status === 'archived');
  }

  search(query: string): BlogPost[] {
    const normalizedQuery = query.toLowerCase();

    return this.getAll().filter(
      (post) =>
        post.title.toLowerCase().includes(normalizedQuery) ||
        post.excerpt.toLowerCase().includes(normalizedQuery) ||
        post.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)),
    );
  }
}

export const blogRepository: BlogRepository = new LocalBlogRepository();
