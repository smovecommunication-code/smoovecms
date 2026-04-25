import type { BlogPost, Project } from '../../../domain/contentSchemas';

export interface DashboardCmsStats {
  projectCount: number;
  blogPostCount: number;
  mediaCount: number;
  draftCount: number;
  inReviewCount: number;
  publishedCount: number;
  recentlyUpdatedCount: number;
}

export const deriveDashboardCmsStats = ({
  projects,
  posts,
  mediaCount,
  now = Date.now(),
}: {
  projects: Project[];
  posts: BlogPost[];
  mediaCount: number;
  now?: number;
}): DashboardCmsStats => {
  const recentThreshold = now - 7 * 24 * 60 * 60 * 1000;
  return {
    projectCount: projects.length,
    blogPostCount: posts.length,
    mediaCount,
    draftCount: posts.filter((post) => post.status === 'draft').length,
    inReviewCount: posts.filter((post) => post.status === 'in_review').length,
    publishedCount: posts.filter((post) => post.status === 'published').length,
    recentlyUpdatedCount: posts.filter((post) => Date.parse(post.publishedDate) >= recentThreshold).length,
  };
};
