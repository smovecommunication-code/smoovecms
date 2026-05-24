import { isProjectArray, type Project } from '../domain/contentSchemas';
import { readFromStorage, writeToStorage } from './storage/localStorageStore';
import { PROJECT_MEDIA_FALLBACK_QUERY } from '../features/projects/projectMedia';
import { mediaRepository } from './mediaRepository';
import { hasMinTrimmedLength, isHttpUrl, isValidMediaFieldValue, normalizeSlug, normalizeStringArray, requiredTrimmed } from '../shared/contentContracts';

const PROJECT_STORAGE_KEY = 'smove_projects';

const toIsoOrNow = (value?: string): string => {
  if (!value) return new Date().toISOString();
  const date = Date.parse(value);
  if (Number.isNaN(date)) return new Date().toISOString();
  return new Date(date).toISOString();
};

const normalizeProject = (project: Partial<Project> & { id: string }): Project => {
  const title = requiredTrimmed(project.title);
  const now = new Date().toISOString();
  const slug = normalizeSlug(requiredTrimmed(project.slug), title, project.id);
  const summary = requiredTrimmed(project.summary);
  const description = requiredTrimmed(project.description) || summary || 'Description à compléter.';
  const roleCardImage = requiredTrimmed(project.mediaRoles?.cardImage);
  const roleHeroImage = requiredTrimmed(project.mediaRoles?.heroImage);
  const roleCoverImage = requiredTrimmed(project.mediaRoles?.coverImage);
  const roleSocialImage = requiredTrimmed(project.mediaRoles?.socialImage) || requiredTrimmed(project.seo?.socialImage);
  const roleGalleryImages = Array.isArray(project.mediaRoles?.galleryImages)
    ? normalizeStringArray(project.mediaRoles?.galleryImages)
    : [];
  const featuredImage =
    roleCardImage ||
    roleHeroImage ||
    roleCoverImage ||
    requiredTrimmed(project.featuredImage) ||
    requiredTrimmed(project.mainImage) ||
    PROJECT_MEDIA_FALLBACK_QUERY;
  const heroImage =
    roleHeroImage ||
    roleCoverImage ||
    roleCardImage ||
    requiredTrimmed(project.mainImage) ||
    requiredTrimmed(project.featuredImage) ||
    featuredImage;
  const galleryImages = roleGalleryImages.length > 0
    ? roleGalleryImages
    : Array.isArray(project.images)
      ? normalizeStringArray(project.images)
      : heroImage
        ? [heroImage]
        : [];
  const liveLink = requiredTrimmed(project.links?.live) || requiredTrimmed((project as Project).link) || requiredTrimmed((project as { externalLink?: string }).externalLink);
  const caseStudyLink = requiredTrimmed(project.links?.caseStudy) || requiredTrimmed((project as { caseStudyLink?: string }).caseStudyLink);

  return {
    ...project,
    id: requiredTrimmed(project.id),
    title,
    client: requiredTrimmed(project.client),
    category: requiredTrimmed(project.category),
    year: requiredTrimmed(project.year) || new Date().getFullYear().toString(),
    description,
    challenge: requiredTrimmed(project.challenge) || 'Challenge à compléter.',
    solution: requiredTrimmed(project.solution) || 'Solution à compléter.',
    results: Array.isArray(project.results) ? normalizeStringArray(project.results) : [],
    tags: Array.isArray(project.tags) ? normalizeStringArray(project.tags) : [],
    mainImage: heroImage,
    featuredImage,
    imageAlt: requiredTrimmed(project.imageAlt) || title || 'Projet SMOVE',
    images: galleryImages,
    mediaRoles: {
      cardImage: featuredImage,
      heroImage,
      coverImage: heroImage,
      socialImage: roleSocialImage || featuredImage,
      galleryImages,
    },
    slug,
    summary: summary || undefined,
    featured: Boolean(project.featured),
    status: (project.status === 'draft' || project.status === 'in_review' || project.status === 'published' || project.status === 'archived') ? project.status : 'published',
    createdAt: toIsoOrNow(project.createdAt),
    updatedAt: now,
    link: liveLink || undefined,
    links: liveLink || caseStudyLink
      ? {
          live: liveLink || undefined,
          caseStudy: caseStudyLink || undefined,
        }
      : undefined,
    testimonial:
      project.testimonial &&
      requiredTrimmed(project.testimonial.text) &&
      requiredTrimmed(project.testimonial.author) &&
      requiredTrimmed(project.testimonial.position)
        ? {
            text: requiredTrimmed(project.testimonial.text),
            author: requiredTrimmed(project.testimonial.author),
            position: requiredTrimmed(project.testimonial.position),
          }
        : undefined,
  };
};

const compareProjects = (a: Project, b: Project): number => {
  const featuredCompare = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  if (featuredCompare !== 0) return featuredCompare;

  const yearCompare = Number.parseInt(b.year, 10) - Number.parseInt(a.year, 10);
  if (!Number.isNaN(yearCompare) && yearCompare !== 0) return yearCompare;

  const updatedCompare = Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || '');
  if (!Number.isNaN(updatedCompare) && updatedCompare !== 0) return updatedCompare;

  return a.title.localeCompare(b.title, 'fr');
};

export interface ProjectRepository {
  getAll(): Project[];
  getPublished(): Project[];
  getCategories(): string[];
  getById(id: string): Project | undefined;
  getBySlug(slug: string): Project | undefined;
  getByCategory(category: string): Project[];
  getFeatured(count?: number): Project[];
  replaceAll(projects: Project[]): Project[];
  save(project: Project): Project;
  delete(id: string): void;
}

class LocalProjectRepository implements ProjectRepository {
  private readonly defaults: Project[] = [];

  private validateProjects(input: unknown): Project[] {
    if (!isProjectArray(input)) {
      if (import.meta.env.DEV) {
        console.warn('[projectRepository] invalid project seed data, using empty array');
      }
      return [];
    }

    return input.map((project) => normalizeProject(project)).sort(compareProjects);
  }

  private read(): Project[] {
    const projects = readFromStorage(PROJECT_STORAGE_KEY, isProjectArray, this.defaults);
    return projects.map((project) => normalizeProject(project)).sort(compareProjects);
  }

  getAll(): Project[] {
    return this.read();
  }

  getPublished(): Project[] {
    return this.getAll().filter((project) => project.status === 'published');
  }

  getCategories(): string[] {
    const categories = new Set<string>(['Tous']);
    this.getPublished().forEach((project) => categories.add(project.category));
    return [...categories];
  }

  getById(id: string): Project | undefined {
    return this.getAll().find((project) => project.id === id);
  }

  getBySlug(slug: string): Project | undefined {
    return this.getAll().find((project) => project.slug === slug);
  }

  getByCategory(category: string): Project[] {
    const projects = this.getPublished();
    if (category === 'Tous') return projects;
    return projects.filter((project) => project.category === category);
  }

  getFeatured(count: number = 3): Project[] {
    return this.getPublished().slice(0, count);
  }

  replaceAll(projects: Project[]): Project[] {
    const normalized = this.validateProjects(projects);
    writeToStorage(PROJECT_STORAGE_KEY, normalized);
    return normalized;
  }

  save(project: Project): Project {
    const trustedProject = normalizeProject(project);
    const projects = this.getAll();

    if (!trustedProject.id.trim() || !trustedProject.title || !trustedProject.featuredImage.trim()) {
      throw new Error('Invalid project payload');
    }

    if (trustedProject.status === 'published') {
      const summarySource = trustedProject.summary?.trim() || trustedProject.description.trim();
      if (!hasMinTrimmedLength(summarySource, 24)) {
        throw new Error('Project cannot publish: summary/content too short');
      }
    }

    if (!isValidMediaFieldValue(trustedProject.featuredImage, { allowInlineText: true, hasMediaById: (mediaId) => Boolean(mediaRepository.getById(mediaId)) }) || trustedProject.images.some((image) => !isValidMediaFieldValue(image, { allowInlineText: true, hasMediaById: (mediaId) => Boolean(mediaRepository.getById(mediaId)) }))) {
      throw new Error('Invalid project media payload');
    }

    if (
      (trustedProject.link && !isHttpUrl(trustedProject.link)) ||
      (trustedProject.links?.live && !isHttpUrl(trustedProject.links.live)) ||
      (trustedProject.links?.caseStudy && !isHttpUrl(trustedProject.links.caseStudy))
    ) {
      throw new Error('Invalid project link payload');
    }

    const slugConflict = projects.find((candidate) => candidate.slug === trustedProject.slug && candidate.id !== trustedProject.id);
    if (slugConflict) {
      throw new Error('Project slug already exists');
    }

    const index = projects.findIndex((candidate) => candidate.id === trustedProject.id);

    if (index >= 0) {
      trustedProject.createdAt = projects[index].createdAt || trustedProject.createdAt;
      projects[index] = trustedProject;
    } else {
      projects.push(trustedProject);
    }

    const ordered = projects.sort(compareProjects);
    writeToStorage(PROJECT_STORAGE_KEY, ordered);
    return trustedProject;
  }

  delete(id: string): void {
    writeToStorage(
      PROJECT_STORAGE_KEY,
      this.getAll().filter((project) => project.id !== id),
    );
  }
}

export const projectRepository: ProjectRepository = new LocalProjectRepository();
