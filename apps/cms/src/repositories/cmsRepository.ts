import { blogRepository } from './blogRepository';
import { mediaRepository } from './mediaRepository';
import { projectRepository } from './projectRepository';

export interface CmsStats {
  projectCount: number;
  blogPostCount: number;
  mediaCount: number;
  draftCount: number;
  inReviewCount: number;
  publishedCount: number;
  recentlyUpdatedCount: number;
}

export interface CmsRepository {
  getStats(): CmsStats;
}

class DefaultCmsRepository implements CmsRepository {
  getStats(): CmsStats {
    const posts = blogRepository.getAll();
    const recentThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return {
      projectCount: projectRepository.getAll().length,
      blogPostCount: posts.length,
      mediaCount: mediaRepository.getAll().length,
      draftCount: posts.filter((post) => post.status === 'draft').length,
      inReviewCount: posts.filter((post) => post.status === 'in_review').length,
      publishedCount: posts.filter((post) => post.status === 'published').length,
      recentlyUpdatedCount: posts.filter((post) => Date.parse(post.publishedDate) >= recentThreshold).length,
    };
  }
}

export const cmsRepository: CmsRepository = new DefaultCmsRepository();
