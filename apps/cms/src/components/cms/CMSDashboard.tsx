import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Eye,
  LogOut,
  Menu,
  X,
  Settings,
  Plus,
  Save,
  Trash2,
  Pencil,
  AlertTriangle,
  RotateCcw,
  Archive,
  Users,
  Upload,
  Mail,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useAuth, type AuthAuditEvent } from '../../contexts/AuthContext';
import type { AppUser } from '../../utils/securityPolicy';
import { blogRepository, BlogRepositoryError } from '../../repositories/blogRepository';
import { mediaRepository } from '../../repositories/mediaRepository';
import { projectRepository } from '../../repositories/projectRepository';
import { serviceRepository } from '../../repositories/serviceRepository';
import { pageContentRepository } from '../../repositories/pageContentRepository';
import { defaultHomePageContent, type HomePageContentSettings } from '../../data/pageContentSeed';
import {
  deleteBackendBlogPost,
  deleteBackendMediaFile,
  deleteBackendProject,
  deleteBackendService,
  deleteBackendTeamMember,
  fetchBackendBlogPosts,
  fetchBackendMediaFiles,
  fetchBackendPageContent,
  fetchBackendProjects,
  fetchBackendServices,
  fetchBackendTeamMembers,
  fetchBackendSettings,
  fetchEditorialAnalytics,
  fetchBackendMediaReferences,
  fetchSyncDiagnostics,
  fetchContentHealthSummary,
  fetchConversionMetrics,
  fetchSettingsHistory,
  requestWithRetry,
  rollbackSettingsVersion,
  replaceBackendMediaFile,
  saveBackendBlogPost,
  saveBackendMediaFile,
  saveBackendPageContent,
  saveBackendProject,
  saveBackendService,
  saveBackendTeamMember,
  saveBackendSettings,
  transitionBackendBlogPost,
  transitionBackendProject,
  uploadBackendMediaFile,
  ContentApiError,
  type CmsSettings,
  type EditorialAnalytics,
  type SettingsHistoryEntry,
  type ContentHealthSummary,
  type ConversionMetrics,
} from '../../utils/contentApi';
import { fromCmsBlogInputWithExisting, normalizeSlug } from '../../features/blog/blogEntryAdapter';
import { isMediaReference, resolveBlogMediaReference } from '../../features/blog/mediaReference';
import { isProjectMediaReference, resolveProjectFeaturedImage, resolveProjectHeroMedia } from '../../features/projects/projectMedia';
import { toMediaReferenceValue } from '../../features/media/assetReference';
import { resolveServiceRouteSlug } from '../../features/marketing/serviceRouting';
import { BlogSection, MediaSection, PageContentSection, ProjectsSection, ServicesSection } from './dashboard/CMSMainSections';
import { OverviewSection, SettingsSection, UsersSection } from './dashboard/CMSExtendedSections';
import { NewsletterSection } from './dashboard/NewsletterSection';
import { ContactLeadsSection } from './dashboard/ContactLeadsSection';
import { deriveDashboardCmsStats } from './dashboard/cmsStats';
import { canMutateSensitiveUserFields, filterAdminUsers } from './users/adminUsersViewModel';
import { isValidCmsHref, isValidHttpUrl, isValidMediaField, parseManagedTaxonomyInput, toDateTimeLocalValue, toIsoDateTime } from './dashboard/cmsValidation';
import { deriveDashboardReadinessSnapshot } from './dashboard/contentHealthSummary';
import { isValidSlug } from '../../shared/contentContracts';
import { summarizeReferences, type BackendMediaReference } from './dashboard/mediaGovernance';
import { resolveCmsPreviewReference } from './dashboard/mediaPreview';
import { buildServicePayload, type ServiceFormPayloadState } from './dashboard/servicePayload';
import { appendHeroBackgroundItemWithMedia, assignHeroBackgroundMedia } from './dashboard/pageContentHeroActions';
import type { BlogContentBlock, BlogPost, MediaFile, Project, Service, TeamMember } from '../../domain/contentSchemas';
import { fetchNewsletterSubscribers, updateNewsletterSubscriberStatus, type NewsletterSubscriber } from '../../utils/newsletterApi';
import { fetchContactLeads, type ContactLead } from '../../utils/contactLeadsApi';
import { getPublicSiteUrl } from '../../utils/publicSiteUrl';
import { getCloudinaryVariant } from '../../utils/cloudinaryVariant';
import { getErrorMessage } from '../../utils/errors';
import { BlogContentEditor } from './dashboard/BlogContentEditor';
import {
  AdminActionBar,
  AdminActionCluster,
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminPageHeader,
  AdminPanel,
  AdminStickyFormActions,
  AdminSuccessFeedback,
  AdminWarningState,
} from './adminPrimitives';

interface CMSDashboardProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
}

interface BlogFormState {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  contentBlocks: BlogContentBlock[];
  author: string;
  category: string;
  tags: string;
  featuredImage: string;
  readTime: string;
  status: BlogPost['status'];
  seoTitle: string;
  seoDescription: string;
  canonicalSlug: string;
  socialImage: string;
  publishedDate: string;
}

interface ProjectFormState {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  client: string;
  category: string;
  year: string;
  status: 'draft' | 'in_review' | 'published' | 'archived';
  featured: boolean;
  description: string;
  challenge: string;
  solution: string;
  results: string;
  tags: string;
  cardImage: string;
  heroImage: string;
  socialImage: string;
  imageAlt: string;
  externalLink: string;
  caseStudyLink: string;
  galleryImages: string;
  testimonialText: string;
  testimonialAuthor: string;
  testimonialPosition: string;
}


type ServiceFormState = ServiceFormPayloadState;

const SERVICE_ICONS = new Set(['palette', 'code', 'megaphone', 'video', 'box']);
const SERVICE_COLOR_PATTERN = /^from-\[#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\]\s+to-\[#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\]$/;
const BLOG_MANAGED_CATEGORIES = ['Développement Web', 'Communication', 'Branding', 'Marketing Digital', 'Innovation', 'Études de cas', 'Non classé'];
const BLOG_MANAGED_TAGS = ['React', 'Web Design', 'Performance', 'Innovation', 'Vidéo', 'Branding', 'Corporate', 'BTP', 'Logo Design', 'Identité Visuelle', 'Food', 'SEO', 'Social Media', 'CMS'];
const USER_ROLE_OPTIONS: AppUser['role'][] = ['admin', 'editor', 'author', 'viewer', 'client'];
const USER_ACCOUNT_STATUS_OPTIONS: NonNullable<AppUser['accountStatus']>[] = ['active', 'invited', 'suspended'];
const USER_PROVIDER_OPTIONS: NonNullable<AppUser['authProvider']>[] = ['local', 'google', 'facebook'];

function CMSMediaPicker({ fieldName, label, value, mediaFiles, disabled, onChange, onUpload }: {
  fieldName: string; label: string; value: string; mediaFiles: MediaFile[]; disabled?: boolean;
  onChange: (reference: string) => void; onUpload: (file: File) => Promise<string>;
}) {
  const selected = mediaFiles.find((file) => value === toMediaReferenceValue(file.id));
  const preview = value ? resolveCmsPreviewReference(value, selected?.alt || label, selected?.name) : null;
  const choose = (reference: string) => { if (import.meta.env.DEV) console.debug('[CMS media] selected field', { fieldName, reference }); onChange(reference); };
  return <div className="space-y-3 rounded-[10px] border border-[#e4edf1] bg-[#fcfeff] p-3">
    <div className="flex items-start justify-between gap-3"><div><p className="text-[13px] font-semibold text-[#273a41]">{label}</p><p className="text-[12px] text-[#6f7f85]">{selected ? (selected.label || selected.title || selected.name) : 'Aucun média sélectionné'}</p></div>{value ? <AdminButton type="button" size="sm" onClick={() => choose('')}>Effacer</AdminButton> : null}</div>
    {preview?.kind === 'image' ? <img src={getCloudinaryVariant(preview.src, 'thumbnail')} alt={preview.alt || label} className="h-28 w-40 rounded-[10px] border object-cover" /> : null}
    <div className="grid gap-2 md:grid-cols-[1fr_auto]"><select aria-label={`Choisir ${label}`} value={selected ? value : ''} onChange={(event) => choose(event.target.value)} className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[13px]"><option value="">Choisir depuis la médiathèque…</option>{mediaFiles.filter((file) => file.type === 'image').map((file) => <option key={file.id} value={toMediaReferenceValue(file.id)}>{file.label || file.title || file.name} — {file.filename || file.originalName || file.name}</option>)}</select><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#00b3e8] px-3 py-2 text-[13px] text-[#007fa3]"><Upload size={14} /> {value ? 'Remplacer / uploader' : 'Uploader'}<input type="file" accept="image/*" className="hidden" disabled={disabled} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; if (file) void onUpload(file).then(choose); input.value = ''; }} /></label></div>
    <div className="space-y-0.5 text-[11px] text-[#6f7f85]"><p>Champ: <strong>{fieldName}</strong></p><p>Fichier: {selected?.filename || selected?.originalName || selected?.name || '—'}</p><p>ID / référence: <code>{value || '—'}</code></p></div>
  </div>;
}

const EMPTY_BLOG_FORM: BlogFormState = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  contentBlocks: [],
  author: '',
  category: '',
  tags: '',
  featuredImage: '',
  readTime: '5 min',
  status: 'published',
  seoTitle: '',
  seoDescription: '',
  canonicalSlug: '',
  socialImage: '',
  publishedDate: new Date().toISOString(),
};

const EMPTY_SERVICE_FORM: ServiceFormState = {
  title: '',
  slug: '',
  description: '',
  shortDescription: '',
  icon: 'palette',
  color: 'from-[#00b3e8] to-[#00c0e8]',
  features: '',
  status: 'published',
  featured: false,
  routeSlug: '',
  overviewDescription: '',
  ctaTitle: '',
  ctaDescription: '',
  ctaPrimaryLabel: '',
  ctaPrimaryHref: '',
  processTitle: '',
  processSteps: '',
};

const EMPTY_PROJECT_FORM: ProjectFormState = {
  title: '',
  slug: '',
  summary: '',
  client: '',
  category: '',
  year: new Date().getFullYear().toString(),
  status: 'published',
  featured: false,
  description: '',
  challenge: '',
  solution: '',
  results: '',
  tags: '',
  cardImage: '',
  heroImage: '',
  socialImage: '',
  imageAlt: '',
  externalLink: '',
  caseStudyLink: '',
  galleryImages: '',
  testimonialText: '',
  testimonialAuthor: '',
  testimonialPosition: '',
};

function formatUserDate(value?: string | null): string {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleString('fr-FR');
}

function getUserStatusTone(status?: AppUser['accountStatus']): string {
  if (status === 'suspended') return 'bg-red-50 text-red-700 border-red-200';
  if (status === 'invited') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

function getUserRoleTone(role: AppUser['role']): string {
  if (role === 'admin') return 'bg-[#ecf8ff] text-[#036ea0] border-[#bbe8ff]';
  if (role === 'editor' || role === 'author') return 'bg-[#f4f7ff] text-[#3f5dac] border-[#d6e1ff]';
  return 'bg-[#f4f7f9] text-[#4e5d63] border-[#d9e1e5]';
}


const getBlogPublishabilityErrors = (form: BlogFormState): Partial<Record<keyof BlogFormState, string>> => {
  const errors: Partial<Record<keyof BlogFormState, string>> = {};
  if (!form.title.trim()) errors.title = 'Veuillez saisir le titre de l’article.';
  if (form.featuredImage.trim() && !isValidMediaField(form.featuredImage)) {
    errors.featuredImage = 'Utilisez une URL valide ou une référence media:asset-id existante.';
  }
  return errors;
};

const toBlogFormState = (post: BlogPost): BlogFormState => {
  const featuredImage =
    post.mediaRoles?.featuredImage?.trim() ||
    post.mediaRoles?.coverImage?.trim() ||
    post.mediaRoles?.cardImage?.trim() ||
    post.featuredImage ||
    post.images?.[0] ||
    '';
  const socialImage = post.mediaRoles?.socialImage?.trim() || post.seo?.socialImage?.trim() || featuredImage;
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    contentBlocks: Array.isArray(post.contentBlocks) ? post.contentBlocks : [],
    author: post.author,
    category: post.category,
    tags: post.tags.join(', '),
    featuredImage,
    readTime: post.readTime,
    status: post.status,
    seoTitle: post.seo?.title || '',
    seoDescription: post.seo?.description || '',
    canonicalSlug: post.seo?.canonicalSlug || post.slug,
    socialImage,
    publishedDate: post.publishedDate,
  };
};

const toProjectGalleryLines = (project: Project): string => {
  const roleGallery = Array.isArray(project.mediaRoles?.galleryImages) ? project.mediaRoles.galleryImages : [];
  const legacyGallery = Array.isArray(project.images) ? project.images : [];
  const heroFallback =
    project.mediaRoles?.heroImage ||
    project.mediaRoles?.coverImage ||
    project.mainImage ||
    project.featuredImage ||
    '';
  const gallery = roleGallery.length > 0 ? roleGallery : legacyGallery.length > 0 ? legacyGallery : heroFallback ? [heroFallback] : [];
  return gallery.map((entry) => entry.trim()).filter(Boolean).join('\n');
};

export default function CMSDashboard({ currentSection, onSectionChange }: CMSDashboardProps) {
  const { user, logout, canAccessCMS, fetchAdminUsers, fetchAdminAuditEvents, updateAdminUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [sectionError, setSectionError] = useState('');
  const [syncDiagnosticsWarning, setSyncDiagnosticsWarning] = useState('');
  const [contentHealth, setContentHealth] = useState<ContentHealthSummary | null>(null);
  const [isHydratingBackend, setIsHydratingBackend] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[cms-navigation]', { activeSection: currentSection });
    }
  }, [currentSection]);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState('');
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [statusTransitioningPostId, setStatusTransitioningPostId] = useState<string | null>(null);
  const [blogEditorMode, setBlogEditorMode] = useState<'list' | 'create' | 'edit'>('list');
  const [blogForm, setBlogForm] = useState<BlogFormState>(EMPTY_BLOG_FORM);
  const [blogFormErrors, setBlogFormErrors] = useState<Partial<Record<keyof BlogFormState, string>>>({});

  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsValues, setSettingsValues] = useState<CmsSettings>({
    siteSettings: {
      siteTitle: 'SMOVE',
      supportEmail: 'contact@smove.africa',
      brandMedia: { logo: '', logoDark: '', favicon: '', defaultSocialImage: '' },
    },
    branding: { logoSize: { desktop: 120, tablet: 100, mobile: 80 } },
    footer: { socialLinks: [] },
    operationalSettings: { instantPublishing: true },
    taxonomySettings: {
      blog: {
        managedCategories: BLOG_MANAGED_CATEGORIES,
        managedTags: BLOG_MANAGED_TAGS,
        enforceManagedTags: true,
      },
    },
  });
  const [settingsHistory, setSettingsHistory] = useState<SettingsHistoryEntry[]>([]);
  const [savedSettingsSnapshot, setSavedSettingsSnapshot] = useState<CmsSettings | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [projectEditorMode, setProjectEditorMode] = useState<'list' | 'create' | 'edit'>('list');
  const [projectForm, setProjectForm] = useState<ProjectFormState>(EMPTY_PROJECT_FORM);
  const [projectFormErrors, setProjectFormErrors] = useState<Partial<Record<keyof ProjectFormState, string>>>({});
  const [services, setServices] = useState<Service[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamForm, setTeamForm] = useState<Partial<TeamMember>>({ name: '', role: '', bio: '', photo: '', status: 'published', order: 0, socialLinks: [] });
  const [teamEditingId, setTeamEditingId] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState('');
  const [isSavingService, setIsSavingService] = useState(false);
  const [serviceEditorMode, setServiceEditorMode] = useState<'list' | 'create' | 'edit'>('list');
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(EMPTY_SERVICE_FORM);
  const [serviceFormErrors, setServiceFormErrors] = useState<Partial<Record<keyof ServiceFormState, string>>>({});
  const [mediaQuery, setMediaQuery] = useState('');
  const [selectedMediaId, setSelectedMediaId] = useState<string>('');
  const [mediaUploadError, setMediaUploadError] = useState('');
  const [mediaFetchError, setMediaFetchError] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [selectedMediaAuthoritativeReferences, setSelectedMediaAuthoritativeReferences] = useState<BackendMediaReference[]>([]);
  const [selectedMediaReferencesLoading, setSelectedMediaReferencesLoading] = useState(false);
  const [selectedMediaReferencesError, setSelectedMediaReferencesError] = useState('');
  const [homeContentForm, setHomeContentForm] = useState<HomePageContentSettings>(() => pageContentRepository.getHomePageContent());
  const [homeContentSaving, setHomeContentSaving] = useState(false);
  const [homeContentError, setHomeContentError] = useState('');
  const [heroMediaUploadError, setHeroMediaUploadError] = useState('');
  const [heroMediaUploadTarget, setHeroMediaUploadTarget] = useState<string | null>(null);
  const [savedHomeContentSnapshot, setSavedHomeContentSnapshot] = useState<HomePageContentSettings | null>(null);
  const [mediaVersion, setMediaVersion] = useState(0);
  const mediaFiles = useMemo(() => mediaRepository.getAll(), [mediaVersion]);
  const cmsStats = useMemo(
    () => deriveDashboardCmsStats({ projects, posts, mediaCount: mediaFiles.length }),
    [mediaFiles.length, posts, projects],
  );
  const canDeleteContent = user?.role === 'admin';
  const filteredMediaFiles = useMemo(() => {
    if (!mediaQuery.trim()) return mediaFiles;
    return mediaRepository.search(mediaQuery.trim());
  }, [mediaFiles, mediaQuery]);
  const selectedMedia = useMemo(() => mediaRepository.getById(selectedMediaId), [selectedMediaId, mediaFiles]);

  const mediaUsageIndex = useMemo(() => {
    const index = new Map<string, string[]>();
    const register = (reference: string | undefined, label: string) => {
      if (!reference || !reference.startsWith('media:')) return;
      const mediaId = reference.slice('media:'.length).trim();
      if (!mediaId) return;
      const entries = index.get(mediaId) || [];
      entries.push(label);
      index.set(mediaId, entries);
    };

    posts.forEach((post) => {
      register(post.featuredImage, `Blog • ${post.title} • featuredImage`);
      register(post.mediaRoles?.featuredImage, `Blog • ${post.title} • mediaRoles.featuredImage`);
      register(post.seo?.socialImage, `Blog • ${post.title} • seo.socialImage`);
      register(post.mediaRoles?.socialImage, `Blog • ${post.title} • mediaRoles.socialImage`);
      post.images.forEach((image) => register(image, `Blog • ${post.title} • images[]`));
    });

    projects.forEach((project) => {
      register(project.featuredImage, `Projet • ${project.title} • featuredImage`);
      register(project.mainImage, `Projet • ${project.title} • mainImage`);
      project.images.forEach((image) => register(image, `Projet • ${project.title} • images[]`));
    });

    register(homeContentForm.aboutImage, 'Home page • aboutImage');
    homeContentForm.heroBackgroundItems.forEach((item, index) => {
      register(item.media, `Home page • heroBackgroundItems[${index}]`);
      register(item.desktopMedia, `Home page • heroBackgroundItems[${index}].desktopMedia`);
      register(item.tabletMedia, `Home page • heroBackgroundItems[${index}].tabletMedia`);
      register(item.mobileMedia, `Home page • heroBackgroundItems[${index}].mobileMedia`);
      register(item.videoMedia, `Home page • heroBackgroundItems[${index}].videoMedia`);
    });
    return index;
  }, [homeContentForm.aboutImage, homeContentForm.heroBackgroundItems, posts, projects]);

  useEffect(() => {
    if (!selectedMediaId) {
      setSelectedMediaAuthoritativeReferences([]);
      setSelectedMediaReferencesLoading(false);
      setSelectedMediaReferencesError('');
      return;
    }

    let isActive = true;
    setSelectedMediaReferencesLoading(true);
    setSelectedMediaReferencesError('');

    void requestWithRetry(() => fetchBackendMediaReferences(selectedMediaId), { retries: 1, retryDelayMs: 250 })
      .then((references) => {
        if (!isActive) return;
        setSelectedMediaAuthoritativeReferences(references);
      })
      .catch(() => {
        if (!isActive) return;
        setSelectedMediaAuthoritativeReferences([]);
        setSelectedMediaReferencesError("Références serveur indisponibles. Vérifiez avant d'archiver.");
      })
      .finally(() => {
        if (!isActive) return;
        setSelectedMediaReferencesLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedMediaId]);
  const readinessSnapshot = useMemo(
    () => (contentHealth ? deriveDashboardReadinessSnapshot(contentHealth) : null),
    [contentHealth],
  );

  const canEditContent = user?.role === 'admin' || user?.role === 'editor' || user?.role === 'author';
  const canReviewContent = user?.role === 'admin' || user?.role === 'editor';
  const canPublishContent = user?.role === 'admin' || user?.role === 'editor';
  const [editorialAnalytics, setEditorialAnalytics] = useState<EditorialAnalytics | null>(null);
  const [conversionMetrics, setConversionMetrics] = useState<ConversionMetrics | null>(null);
  const [adminUsers, setAdminUsers] = useState<AppUser[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [adminUsersNotice, setAdminUsersNotice] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppUser['role']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | NonNullable<AppUser['accountStatus']>>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [providerFilter, setProviderFilter] = useState<'all' | NonNullable<AppUser['authProvider']>>('all');
  const [auditEvents, setAuditEvents] = useState<AuthAuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [newsletterSummary, setNewsletterSummary] = useState({ total: 0, active: 0, unsubscribed: 0 });
  const [newsletterLastRefreshedAt, setNewsletterLastRefreshedAt] = useState<string | null>(null);
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');
  const [newsletterNotice, setNewsletterNotice] = useState('');
  const [newsletterSearch, setNewsletterSearch] = useState('');
  const [newsletterStatusFilter, setNewsletterStatusFilter] = useState('all');
  const [newsletterSourceFilter, setNewsletterSourceFilter] = useState('all');
  const [contactLeads, setContactLeads] = useState<ContactLead[]>([]);
  const [contactLeadsSummary, setContactLeadsSummary] = useState({ total: 0, received: 0, sent: 0, failed: 0, disabled: 0 });
  const [contactLeadsLastRefreshedAt, setContactLeadsLastRefreshedAt] = useState<string | null>(null);
  const [contactLeadsLoading, setContactLeadsLoading] = useState(false);
  const [contactLeadsError, setContactLeadsError] = useState('');
  const [contactLeadsNotice] = useState('');
  const [contactLeadsSearch, setContactLeadsSearch] = useState('');
  const [contactLeadsStatusFilter, setContactLeadsStatusFilter] = useState('all');
  const [contactLeadsSourceFilter, setContactLeadsSourceFilter] = useState('all');

  const instantPublishingEnabled = settingsValues.operationalSettings.instantPublishing;
  const siteSettingsTitle = settingsValues.siteSettings.siteTitle;
  const siteSettingsSupportEmail = settingsValues.siteSettings.supportEmail;
  const siteBrandMedia = settingsValues.siteSettings.brandMedia;
  const managedBlogCategories = settingsValues.taxonomySettings.blog.managedCategories;
  const managedBlogTags = settingsValues.taxonomySettings.blog.managedTags;
  const enforceManagedTags = settingsValues.taxonomySettings.blog.enforceManagedTags;
  const selectedAdminUser = useMemo(
    () => adminUsers.find((entry) => entry.id === selectedUserId) ?? null,
    [adminUsers, selectedUserId],
  );
  const filteredAdminUsers = useMemo(() => {
    return filterAdminUsers(adminUsers, {
      query: userSearch,
      role: roleFilter,
      status: statusFilter,
      verification: verificationFilter,
      provider: providerFilter,
    });
  }, [adminUsers, providerFilter, roleFilter, statusFilter, userSearch, verificationFilter]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setPostsLoading(true);
      try {
        const backendPosts = await requestWithRetry(() => fetchBackendBlogPosts(), { retries: 1, retryDelayMs: 250 });
        if (!active) return;
        setPosts(backendPosts);
        backendPosts.forEach((post) => blogRepository.save(post));
        setPostsError('');
      } catch (error) {
        if (!active) return;
        setPostsError(getErrorMessage(error));
      } finally {
        if (active) setPostsLoading(false);
      }

      try {
        const analytics = await fetchEditorialAnalytics();
        if (active) setEditorialAnalytics(analytics);
      } catch {
        if (active) setEditorialAnalytics(null);
      }

      try {
        const metrics = await fetchConversionMetrics();
        if (active) setConversionMetrics(metrics);
      } catch {
        if (active) setConversionMetrics(null);
      }

      try {
        setProjectsLoading(true);
        const backendProjects = await requestWithRetry(() => fetchBackendProjects(), { retries: 1, retryDelayMs: 250 });
        if (!active) return;

        syncProjectsFromBackend(backendProjects);
      } catch {
        if (active) {
          setProjectsError('Backend indisponible. Impossible de charger les projets depuis l\'API.');
        }
      } finally {
        if (active) setProjectsLoading(false);
      }

      try {
        setServicesLoading(true);
        const backendServices = await requestWithRetry(() => fetchBackendServices(), { retries: 1, retryDelayMs: 250 });
        if (!active) return;

        setServices(serviceRepository.replaceAll(backendServices));
      } catch {
        if (active) {
          setServicesError('Backend indisponible. Impossible de charger les services depuis l\'API.');
        }
      } finally {
        if (active) setServicesLoading(false);
      }

      try {
        setTeamLoading(true);
        const backendTeam = await requestWithRetry(() => fetchBackendTeamMembers(), { retries: 1, retryDelayMs: 250 });
        if (!active) return;
        setTeamMembers(backendTeam);
        setTeamError('');
      } catch {
        if (active) setTeamError("Backend indisponible. Impossible de charger l'équipe depuis l'API.");
      } finally {
        if (active) setTeamLoading(false);
      }

      try {
        const backendMedia = await requestWithRetry(() => fetchBackendMediaFiles(), { retries: 1, retryDelayMs: 250 });
        if (!active) return;
        syncMediaFromBackend(backendMedia);
        setMediaFetchError('');
      } catch (error) {
        if (active) setMediaFetchError(getErrorMessage(error));
      }

      try {
        const home = await requestWithRetry(() => fetchBackendPageContent(), { retries: 1, retryDelayMs: 250 });
        if (!active) return;
        const saved = pageContentRepository.saveHomePageContent(home);
        setHomeContentForm(saved);
        setSavedHomeContentSnapshot(saved);
      } catch {
        if (active) {
        }
      }

      try {
        const settings = await requestWithRetry(() => fetchBackendSettings(), { retries: 1, retryDelayMs: 250 });
        if (active) {
          setSettingsValues(settings);
          setSavedSettingsSnapshot(settings);
        }
      } catch {
      }

      try {
        const history = await requestWithRetry(() => fetchSettingsHistory(20), { retries: 1, retryDelayMs: 250 });
        if (active) setSettingsHistory(history);
      } catch {
      }

      try {
        const diagnostics = await requestWithRetry(() => fetchSyncDiagnostics(), { retries: 1, retryDelayMs: 250 });
        if (!active) return;
        if (diagnostics.summary.invalidMediaReferenceCount > 0) {
          setSyncDiagnosticsWarning(`Synchronisation: ${diagnostics.summary.invalidMediaReferenceCount} référence(s) média invalide(s) détectée(s).`);
        } else {
          setSyncDiagnosticsWarning('');
        }
      } catch {
        if (active) {
          setSyncDiagnosticsWarning('Diagnostics de synchronisation indisponibles (backend non joignable).');
        }
      }

      try {
        const health = await requestWithRetry(() => fetchContentHealthSummary(), { retries: 1, retryDelayMs: 250 });
        if (active) setContentHealth(health);
      } catch {
        if (active) {
          setContentHealth(null);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const stats = [
    {
      label: 'Total Projets',
      value: cmsStats.projectCount,
      icon: FolderOpen,
      color: 'from-[#00b3e8] to-[#00c0e8]',
    },
    {
      label: 'Articles Blog',
      value: posts.length,
      icon: FileText,
      color: 'from-[#a855f7] to-[#9333ea]',
    },
    {
      label: 'Fichiers Média',
      value: cmsStats.mediaCount,
      icon: ImageIcon,
      color: 'from-[#ffc247] to-[#ff9f47]',
    },
    {
      label: 'Leads contact',
      value: contactLeadsSummary.total,
      icon: Mail,
      color: 'from-[#34c759] to-[#2da84a]',
    },
  ];

  const menuItems = [
    { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: 'projects', label: 'Projets', icon: FolderOpen },
    { id: 'services', label: 'Services', icon: Settings },
    { id: 'team', label: 'Équipe', icon: Users },
    { id: 'blog', label: 'Blog', icon: FileText },
    { id: 'media', label: 'Médiathèque', icon: ImageIcon },
    { id: 'content', label: 'Contenus pages', icon: FileText },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'contacts', label: 'Contacts / Leads', icon: Mail },
    { id: 'newsletter', label: 'Newsletter', icon: Mail },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    window.location.hash = 'login';
  };

  const handleSectionChange = async (section: string) => {
    if (section === currentSection) {
      return;
    }

    if (currentSection === 'content' && homeContentHasUnsavedChanges) {
      const shouldSaveBeforeLeaving = window.confirm('Le contenu de page a été modifié. OK = enregistrer avant de quitter, Annuler = choisir ensuite.');
      if (shouldSaveBeforeLeaving) {
        const saved = await saveHomePageContent();
        if (!saved) {
          return;
        }
      } else {
        const shouldDiscard = window.confirm('Quitter sans enregistrer les modifications de contenu de page ?');
        if (!shouldDiscard) {
          return;
        }
      }
    } else if (hasUnsavedChanges && !window.confirm('Des modifications non sauvegardées existent. Quitter cette section ?')) {
      return;
    }

    setSectionError('');

    onSectionChange(section);
  };

  const showSuccess = (message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(''), 2500);
  };

  const mapBlogError = (error: unknown) => {
    if (error instanceof ContentApiError && error.code === 'BLOG_VALIDATION_ERROR') {
      return 'Le format article est invalide (slug/date/image/URL).';
    }
    if (error instanceof ContentApiError && error.code === 'BLOG_NOT_PUBLISHABLE') {
      return 'Article non publiable: vérifiez le titre de l’article.';
    }
    if (error instanceof ContentApiError && error.code === 'BLOG_INVALID_STATUS_TRANSITION') {
      return 'Transition invalide: passez en revue avant publication.';
    }
    if (error instanceof ContentApiError && error.code === 'BLOG_INSTANT_PUBLISHING_DISABLED') {
      return 'Publication instantanée désactivée: utilisez le statut "En revue".';
    }
    if (error instanceof BlogRepositoryError && error.code === 'BLOG_SLUG_CONFLICT') {
      return 'Ce slug existe déjà. Utilisez un slug unique.';
    }
    if (error instanceof BlogRepositoryError && error.code === 'BLOG_NOT_FOUND') {
      return 'Article introuvable. Rechargez la liste puis réessayez.';
    }
    if (error instanceof BlogRepositoryError && error.code === 'BLOG_INVALID_STATUS_TRANSITION') {
      return 'Transition de statut invalide. Repassez en brouillon avant publication.';
    }
    if (error instanceof BlogRepositoryError && error.code === 'BLOG_INVALID_MEDIA_REFERENCE') {
      return 'Le média sélectionné est introuvable. Sélectionnez une autre ressource.';
    }
    if (error instanceof Error) {
      if (error.message.includes('cannot publish')) {
        return 'Publication non autorisée pour votre rôle.';
      }
      if (error.message.includes('Missing required publish fields')) {
        return 'Article non publiable: renseignez le titre de l’article.';
      }
      if (error.message.includes('BLOG_INSTANT_PUBLISHING_DISABLED')) {
        return 'Publication instantanée désactivée: passez par la revue éditoriale et activez la publication pour publier.';
      }
      if (error.message.trim()) {
        return error.message;
      }
    }
    return 'Enregistrement impossible. Vérifiez les champs et réessayez.';
  };

  const startCreatePost = () => {
    setBlogForm(EMPTY_BLOG_FORM);
    setBlogFormErrors({});
    setBlogEditorMode('create');
    setPostsError('');
  };

  const startEditPost = (post: BlogPost) => {
    setBlogForm(toBlogFormState(post));
    setBlogFormErrors({});
    setBlogEditorMode('edit');
  };

  const validateBlogForm = (form: BlogFormState) => {
    const errors: Partial<Record<keyof BlogFormState, string>> = {};
    if (!form.title.trim()) errors.title = 'Veuillez saisir le titre de l’article.';
    if (form.featuredImage.trim() && !isValidMediaField(form.featuredImage)) {
      errors.featuredImage = 'Utilisez une URL valide ou une référence media:asset-id existante.';
    }
    if (form.socialImage.trim() && !isValidMediaField(form.socialImage)) {
      errors.socialImage = 'L’image sociale doit être une URL valide ou media:asset-id existant.';
    }
    if (form.seoDescription && form.seoDescription.trim().length > 320) {
      errors.seoDescription = 'La description SEO doit rester concise (320 caractères max).';
    }
    return errors;
  };


  const getStatusLabel = (status: BlogPost['status']) => {
    if (status === 'published') return 'Publié';
    if (status === 'in_review') return 'En revue';
    if (status === 'archived') return 'Archivé';
    return 'Brouillon';
  };

  const transitionPostStatus = async (post: BlogPost, target: BlogPost['status']) => {
    if (target === 'in_review' && !canEditContent) {
      setPostsError('Soumission en revue non autorisée pour votre rôle.');
      return;
    }
    if (target === 'published' && !canPublishContent) {
      setPostsError('Publication non autorisée: rôle éditeur ou administrateur requis.');
      return;
    }

    const confirmationByTarget: Record<BlogPost['status'], string> = {
      draft: `Repasser "${post.title}" en brouillon ?`,
      in_review: `Soumettre "${post.title}" à la revue éditoriale ?`,
      published: `Publier "${post.title}" sur le blog public ?`,
      archived: `Archiver "${post.title}" ? L’article ne sera plus visible publiquement.`,
    };

    if (!window.confirm(confirmationByTarget[target])) {
      return;
    }

    setStatusTransitioningPostId(post.id);
    setPostsError('');

    try {
      const updated = await transitionBackendBlogPost(post.id, target);
      blogRepository.save(updated);
      setPosts((prev) => prev.map((entry) => (entry.id === post.id ? updated : entry)));
      if (target === 'published') showSuccess('Article publié.');
      else if (target === 'in_review') showSuccess('Article soumis en revue.');
      else if (target === 'draft') showSuccess('Article repassé en brouillon.');
      else showSuccess('Article archivé.');
      if (blogForm.id === post.id) {
        setBlogForm((prev) => ({ ...prev, status: target }));
      }
    } catch (error) {
      setPostsError(mapBlogError(error));
    } finally {
      setStatusTransitioningPostId(null);
    }
  };

  const resetBlogEditor = () => {
    if (blogHasUnsavedChanges && !window.confirm("Des modifications non enregistrées seront perdues. Continuer ?")) {
      return;
    }
    setBlogEditorMode('list');
    setBlogForm(EMPTY_BLOG_FORM);
    setBlogFormErrors({});
  };

  const blogHasUnsavedChanges = useMemo(() => {
    if (blogEditorMode === 'list') return false;
    if (blogEditorMode === 'create') {
      return JSON.stringify(blogForm) !== JSON.stringify(EMPTY_BLOG_FORM);
    }
    const existing = posts.find((post) => post.id === blogForm.id);
    if (!existing) return true;
    const normalizedExisting: BlogFormState = toBlogFormState(existing);
    return JSON.stringify(normalizedExisting) !== JSON.stringify(blogForm);
  }, [blogEditorMode, blogForm, posts]);

  const settingsHasUnsavedChanges = useMemo(() => {
    if (!savedSettingsSnapshot) return false;
    return JSON.stringify(savedSettingsSnapshot) !== JSON.stringify(settingsValues);
  }, [savedSettingsSnapshot, settingsValues]);

  const homeContentHasUnsavedChanges = useMemo(() => {
    if (!savedHomeContentSnapshot) return false;
    return JSON.stringify(savedHomeContentSnapshot) !== JSON.stringify(homeContentForm);
  }, [savedHomeContentSnapshot, homeContentForm]);

  const hasUnsavedChanges = blogHasUnsavedChanges || settingsHasUnsavedChanges || homeContentHasUnsavedChanges;

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const saveBlogPost = async (nextStatus?: BlogPost['status']) => {
    if (!canEditContent) {
      setPostsError('Création/mise à jour non autorisée pour votre rôle.');
      return;
    }

    const formToSave: BlogFormState = nextStatus ? { ...blogForm, status: nextStatus } : blogForm;
    if (nextStatus) {
      setBlogForm(formToSave);
    }

    const errors = validateBlogForm(formToSave);
    setBlogFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setPostsError('Veuillez corriger les erreurs avant d’enregistrer.');
      return;
    }

    setIsSavingPost(true);
    setPostsError('');

    try {
      const existingPost = formToSave.id ? posts.find((entry) => entry.id === formToSave.id) : undefined;
      const payload = { ...fromCmsBlogInputWithExisting(formToSave, existingPost), contentBlocks: formToSave.contentBlocks };
      const saved = await requestWithRetry(() => saveBackendBlogPost(payload), { retries: 1, retryDelayMs: 250 });
      const refreshedPosts = await requestWithRetry(() => fetchBackendBlogPosts(), { retries: 1, retryDelayMs: 250 });
      if (!refreshedPosts.some((entry) => entry.id === saved.id)) {
        throw new Error("L’article enregistré n’apparaît pas encore dans la liste CMS rafraîchie.");
      }
      refreshedPosts.forEach((post) => blogRepository.save(post));
      setPosts(refreshedPosts);
      showSuccess(blogEditorMode === 'create' ? 'Article créé avec succès.' : 'Article mis à jour avec succès.');
      const refreshedSaved = refreshedPosts.find((entry) => entry.id === saved.id) || saved;
      setBlogEditorMode('edit');
      setBlogForm(toBlogFormState(refreshedSaved));
      setBlogFormErrors({});
    } catch (error) {
      setPostsError(mapBlogError(error));
    } finally {
      setIsSavingPost(false);
    }
  };

  const deletePost = async (post: BlogPost) => {
    if (!canDeleteContent) {
      setPostsError('Suppression non autorisée: rôle administrateur requis.');
      return;
    }

    if (!window.confirm(`Supprimer définitivement "${post.title}" ?`)) {
      return;
    }

    try {
      await deleteBackendBlogPost(post.id);
      blogRepository.delete(post.id);
      setPosts((prev) => prev.filter((entry) => entry.id !== post.id));
      showSuccess('Article supprimé.');
      if (blogForm.id === post.id) {
        resetBlogEditor();
      }
    } catch {
      setPostsError('Suppression impossible. Réessayez.');
    }
  };

  const saveSettings = async () => {
    if (!siteSettingsTitle.trim() || !siteSettingsSupportEmail.includes('@')) {
      setSectionError('Renseignez un nom de site et un email de support valide.');
      return;
    }

    const brandMediaFields = [
      settingsValues.siteSettings?.brandMedia?.logo || '',
      settingsValues.siteSettings?.brandMedia?.logoDark || '',
      settingsValues.siteSettings?.brandMedia?.favicon || '',
      settingsValues.siteSettings?.brandMedia?.defaultSocialImage || '',
    ];

    if (brandMediaFields.some((value) => value.trim() && !isValidMediaField(value))) {
      setSectionError('Les médias de marque doivent être des URLs valides ou media:asset-id existants.');
      return;
    }

    if (managedBlogCategories.length === 0 || managedBlogTags.length === 0) {
      setSectionError('La taxonomie blog doit inclure au moins une catégorie et un tag géré.');
      return;
    }

    setSettingsSaving(true);
    setSectionError('');
    try {
      const saved = await requestWithRetry(() => saveBackendSettings(settingsValues), { retries: 1, retryDelayMs: 300 });
      setSettingsValues(saved);
      setSavedSettingsSnapshot(saved);
      const history = await requestWithRetry(() => fetchSettingsHistory(20), { retries: 1, retryDelayMs: 250 });
      setSettingsHistory(history);
      showSuccess('Paramètres enregistrés sur le backend.');
    } catch {
      setSectionError('Sauvegarde backend impossible. Réessayez.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const rollbackSettings = async (versionId: string) => {
    if (!window.confirm('Restaurer cette version des paramètres globaux ?')) {
      return;
    }

    setSettingsSaving(true);
    setSectionError('');
    try {
      const restored = await requestWithRetry(() => rollbackSettingsVersion(versionId), { retries: 1, retryDelayMs: 250 });
      setSettingsValues(restored);
      setSavedSettingsSnapshot(restored);
      const history = await requestWithRetry(() => fetchSettingsHistory(20), { retries: 1, retryDelayMs: 250 });
      setSettingsHistory(history);
      showSuccess('Paramètres restaurés depuis l’historique.');
    } catch {
      setSectionError('Rollback impossible pour cette version.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const saveHomePageContent = async (): Promise<boolean> => {
    if (!homeContentForm.heroTitleLine1.trim() || !homeContentForm.heroTitleLine2.trim()) {
      setHomeContentError('Le titre hero doit être renseigné.');
      return false;
    }
    if (homeContentForm.aboutImage.trim() && !isValidMediaField(homeContentForm.aboutImage)) {
      setHomeContentError('Image À propos invalide. Utilisez une URL valide ou media:asset-id existant.');
      return false;
    }
    const invalidHeroBackground = homeContentForm.heroBackgroundItems.find((item) => {
      const primaryMedia = item.media.trim() || item.desktopMedia.trim() || item.tabletMedia.trim() || item.mobileMedia.trim();
      return (
      !primaryMedia ||
      !isValidMediaField(primaryMedia) ||
      (item.desktopMedia.trim() && !isValidMediaField(item.desktopMedia)) ||
      (item.tabletMedia.trim() && !isValidMediaField(item.tabletMedia)) ||
      (item.mobileMedia.trim() && !isValidMediaField(item.mobileMedia)) ||
      (item.videoMedia.trim() && !isValidMediaField(item.videoMedia)) ||
      (item.ctaHref.trim() && !isValidCmsHref(item.ctaHref))
    );
    });
    if (invalidHeroBackground) {
      setHomeContentError('Un média de background hero est invalide. Sélectionnez des médias depuis la Media Library (fallback URL legacy toléré).');
      return false;
    }
    if (homeContentForm.heroBackgroundIntervalMs < 2000 || homeContentForm.heroBackgroundIntervalMs > 30000) {
      setHomeContentError("L'intervalle du slideshow hero doit être compris entre 2000 et 30000 ms.");
      return false;
    }
    const hrefFields: Array<[string, string]> = [
      [homeContentForm.heroPrimaryCtaHref, 'Lien CTA principal du hero'],
      [homeContentForm.heroSecondaryCtaHref, 'Lien CTA secondaire du hero'],
      [homeContentForm.aboutCtaHref, 'Lien CTA section À propos'],
      [homeContentForm.portfolioCtaHref, 'Lien CTA section projets'],
      [homeContentForm.blogCtaHref, 'Lien CTA section blog'],
    ];
    const invalidHref = hrefFields.find(([href]) => !isValidCmsHref(href));
    if (invalidHref) {
      setHomeContentError(`${invalidHref[1]} invalide. Utilisez une ancre (#section), un chemin (/route) ou une URL https.`);
      return false;
    }

    setHomeContentSaving(true);
    setHomeContentError('');

    try {
      const savedRemote = await requestWithRetry(() => saveBackendPageContent(homeContentForm), { retries: 1, retryDelayMs: 250 });
      const [authoritativeHome, authoritativeMedia] = await Promise.all([
        requestWithRetry(() => fetchBackendPageContent(), { retries: 1, retryDelayMs: 250 }),
        requestWithRetry(() => fetchBackendMediaFiles(), { retries: 1, retryDelayMs: 250 }),
      ]);
      syncMediaFromBackend(authoritativeMedia);
      const saved = pageContentRepository.saveHomePageContent(authoritativeHome);
      setHomeContentForm(saved);
      setSavedHomeContentSnapshot(saved);
      console.info('[cms-page-content] save succeeded', {
        savedHeroBackgroundItems: saved.heroBackgroundItems.length,
        returnedHeroBackgroundItems: savedRemote.heroBackgroundItems.length,
      });
      showSuccess('Contenu de page enregistré via backend CMS.');
      return true;
    } catch {
      setHomeContentError('Backend indisponible: enregistrement annulé pour éviter une divergence de source de vérité.');
      console.warn('[cms-page-content] save failed; authoritative reload unavailable');
      return false;
    } finally {
      setHomeContentSaving(false);
    }
  };

  const resetHomePageContent = () => {
    const snapshot = savedHomeContentSnapshot || pageContentRepository.getHomePageContent() || defaultHomePageContent;
    setHomeContentForm(snapshot);
    setHomeContentError('');
  };

  const retryLoadPosts = async () => {
    setPostsLoading(true);
    setPostsError('');
    try {
      const backendPosts = await fetchBackendBlogPosts();
      setPosts(backendPosts);
      backendPosts.forEach((post) => blogRepository.save(post));
    } catch (error) {
      setPostsError(getErrorMessage(error));
    } finally {
      setPostsLoading(false);
    }
  };

  const startCreateProject = () => {
    setProjectEditorMode('create');
    setProjectForm(EMPTY_PROJECT_FORM);
    setProjectFormErrors({});
    setProjectsError('');
  };

  const startEditProject = (project: (typeof projects)[number]) => {
    const resolvedCard = resolveProjectFeaturedImage(project).reference;
    const resolvedHero = resolveProjectHeroMedia(project).reference;
    const resolvedSocial = project.mediaRoles?.socialImage || project.seo?.socialImage || resolvedCard || resolvedHero;
    setProjectEditorMode('edit');
    setProjectForm({
      id: project.id,
      title: project.title,
      slug: project.slug || '',
      summary: project.summary || '',
      client: project.client,
      category: project.category,
      year: project.year,
      status: project.status ?? 'published',
      featured: Boolean(project.featured),
      description: project.description,
      challenge: project.challenge,
      solution: project.solution,
      results: project.results.join('\n'),
      tags: project.tags.join(', '),
      cardImage: resolvedCard,
      heroImage: resolvedHero,
      socialImage: resolvedSocial,
      imageAlt: project.imageAlt || project.title,
      externalLink: project.links?.live || project.link || '',
      caseStudyLink: project.links?.caseStudy || '',
      galleryImages: toProjectGalleryLines(project),
      testimonialText: project.testimonial?.text || '',
      testimonialAuthor: project.testimonial?.author || '',
      testimonialPosition: project.testimonial?.position || '',
    });
    setProjectFormErrors({});
    setProjectsError('');
  };

  const validateProjectForm = (form: ProjectFormState) => {
    const errors: Partial<Record<keyof ProjectFormState, string>> = {};
    const isValidProjectMediaField = (value: string) => {
      const normalized = value.trim();
      return Boolean(normalized) && (isMediaReference(normalized) || isValidHttpUrl(normalized));
    };
    if (!form.title.trim()) errors.title = 'Veuillez saisir le titre du projet.';
    if (form.slug.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      errors.slug = 'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets.';
    }
    if (form.year.trim() && !/^\d{4}$/.test(form.year.trim())) {
      errors.year = 'L’année doit être sur 4 chiffres (ex: 2026).';
    }
    if (form.cardImage.trim() && !isValidProjectMediaField(form.cardImage)) {
      errors.cardImage = 'Image carte invalide. Utilisez une URL valide ou media:asset-id existant.';
    }
    if (form.heroImage.trim() && !isValidProjectMediaField(form.heroImage)) {
      errors.heroImage = 'Image hero invalide. Utilisez une URL valide ou media:asset-id existant.';
    }
    if (form.socialImage.trim() && !isValidProjectMediaField(form.socialImage)) {
      errors.socialImage = 'Image sociale invalide. Utilisez une URL valide ou media:asset-id existant.';
    }
    if (form.caseStudyLink.trim() && !/^https?:\/\//i.test(form.caseStudyLink.trim())) {
      errors.caseStudyLink = 'Le lien case study doit commencer par http:// ou https://.';
    }
    if (form.externalLink.trim() && !/^https?:\/\//i.test(form.externalLink.trim())) {
      errors.externalLink = 'Le lien externe doit commencer par http:// ou https://.';
    }

    const galleryRefs = form.galleryImages.split('\n').map((line) => line.trim()).filter(Boolean);
    const invalidGallery = galleryRefs.find((entry) => !isValidProjectMediaField(entry));
    if (invalidGallery) {
      errors.galleryImages = `Référence média invalide: ${invalidGallery}`;
    }

    return errors;
  };

  const mapProjectSaveError = (error: unknown) => {
    if (error instanceof ContentApiError) {
      if (error.status === 403) return 'Création/mise à jour non autorisée pour votre rôle.';
      if (error.code === 'PROJECT_SLUG_CONFLICT') return 'Ce slug projet existe déjà. Choisissez un slug unique.';
      if (error.code === 'PROJECT_VALIDATION_ERROR') return 'Le projet ne respecte pas le format attendu par le backend.';
      if (error.code === 'PROJECT_INVALID_STATUS_TRANSITION') return 'Transition de statut projet non autorisée.';
      if (error.code === 'PROJECT_NOT_PUBLISHABLE') return 'Ce projet ne peut pas être publié: complétez les champs requis.';
      if (error.code === 'PROJECT_INVALID_MEDIA_REFERENCE') return 'Le projet référence un média introuvable.';
      if (error.code === 'PROJECT_CREATE_RESPONSE_INVALID') return 'Le backend n’a pas renvoyé le projet créé. Aucun succès affiché sans confirmation.';
      if (error.code === 'PROJECT_CREATE_REFETCH_FAILED') return 'Projet créé mais impossible de recharger la liste.';
      if (error.code === 'PROJECT_CREATE_NOT_VISIBLE_AFTER_REFRESH') return 'Projet créé mais absent du rechargement backend. Réessayez de rafraîchir la liste avant de recréer.';
      if (error.code === 'PROJECT_LIST_RESPONSE_INVALID') return 'La réponse liste projets du backend est invalide.';
      return `Sauvegarde impossible (${error.message}).`;
    }
    return 'Sauvegarde impossible. Vérifiez votre connexion puis réessayez.';
  };

  const loadProjectsFromBackend = async () => {
    setProjectsLoading(true);
    setProjectsError('');
    try {
      const backendProjects = await requestWithRetry(() => fetchBackendProjects(), { retries: 1, retryDelayMs: 250 });
      syncProjectsFromBackend(backendProjects);
    } catch {
      setProjectsError('Impossible de charger les projets depuis le backend.');
    } finally {
      setProjectsLoading(false);
    }
  };

  const syncProjectsFromBackend = (backendProjects: Awaited<ReturnType<typeof fetchBackendProjects>>) => {
    const normalized = projectRepository.replaceAll(backendProjects);
    setProjects(normalized);
  };

  const syncMediaFromBackend = (backendMedia: Awaited<ReturnType<typeof fetchBackendMediaFiles>>) => {
    const normalized = mediaRepository.replaceAll(backendMedia);
    setMediaVersion((version) => version + 1);
    setSelectedMediaId((previousId) => (previousId && !normalized.some((file) => file.id === previousId) ? '' : previousId));
    setMediaFetchError('');
  };


  const loadMediaFromBackend = async () => {
    setMediaFetchError('');
    try {
      const backendMedia = await requestWithRetry(() => fetchBackendMediaFiles(), { retries: 1, retryDelayMs: 250 });
      syncMediaFromBackend(backendMedia);
    } catch (error) {
      setMediaFetchError(getErrorMessage(error));
    }
  };

  const fetchProjectsUntilPresent = async (projectId: string): Promise<Project[]> => {
    const attempts = [0, 250, 500, 1000];
    let latestProjects: Project[] = [];

    for (const delayMs of attempts) {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      try {
        latestProjects = await requestWithRetry(() => fetchBackendProjects(), { retries: 1, retryDelayMs: 250 });
      } catch (error) {
        throw new ContentApiError('Projet créé mais impossible de recharger la liste.', 'PROJECT_CREATE_REFETCH_FAILED', 502, { projectId, cause: error });
      }
      console.info('[cms-projects] refetch project count', { count: latestProjects.length, projectId });
      if (latestProjects.some((project) => project.id === projectId)) {
        return latestProjects;
      }
    }

    throw new ContentApiError('Le backend a accepté la création, mais le projet est absent du rechargement.', 'PROJECT_CREATE_NOT_VISIBLE_AFTER_REFRESH', 502, { projectId, latestCount: latestProjects.length });
  };

  const resetProjectEditor = () => {
    setProjectEditorMode('list');
    setProjectForm(EMPTY_PROJECT_FORM);
    setProjectFormErrors({});
  };

  const saveProject = async () => {
    if (!canEditContent) {
      setProjectsError('Création/mise à jour non autorisée pour votre rôle.');
      return;
    }

    const errors = validateProjectForm(projectForm);
    setProjectFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setProjectsError('Veuillez corriger les erreurs du projet avant d’enregistrer.');
      return;
    }

    setIsSavingProject(true);
    setProjectsError('');

    const normalizedSlug = normalizeSlug(projectForm.slug, projectForm.title);
    if (!isValidSlug(normalizedSlug)) {
      setProjectFormErrors((prev) => ({ ...prev, slug: 'Le slug généré est invalide. Modifiez le titre ou le slug.' }));
      setProjectsError('Slug invalide. Corrigez le titre ou le slug puis réessayez.');
      setIsSavingProject(false);
      return;
    }

    const normalizedGallery = projectForm.galleryImages
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const heroImage = projectForm.heroImage.trim() || projectForm.cardImage.trim();
    const images = normalizedGallery.length > 0 ? normalizedGallery : [heroImage].filter(Boolean);

    const payload = {
      id: projectForm.id || `project-${Date.now()}`,
      title: projectForm.title.trim(),
      slug: normalizedSlug,
      summary: projectForm.summary.trim() || undefined,
      client: projectForm.client.trim(),
      category: projectForm.category.trim(),
      year: projectForm.year.trim() || new Date().getFullYear().toString(),
      status: projectForm.status,
      featured: projectForm.featured,
      description: projectForm.description.trim(),
      challenge: projectForm.challenge.trim(),
      solution: projectForm.solution.trim(),
      results: projectForm.results.split('\n').map((line) => line.trim()).filter(Boolean),
      tags: projectForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      image: projectForm.cardImage.trim() || heroImage,
      imageUrl: projectForm.cardImage.trim() || heroImage,
      media: projectForm.cardImage.trim() || heroImage,
      cardImage: projectForm.cardImage.trim() || heroImage,
      heroImage: heroImage || projectForm.cardImage.trim(),
      featuredImage: projectForm.cardImage.trim() || heroImage,
      mainImage: heroImage || projectForm.cardImage.trim(),
      mediaRoles: {
        cardImage: projectForm.cardImage.trim() || heroImage,
        heroImage: heroImage || projectForm.cardImage.trim(),
        coverImage: heroImage || projectForm.cardImage.trim(),
        socialImage: projectForm.socialImage.trim() || projectForm.cardImage.trim() || heroImage,
        galleryImages: images,
      },
      seo: {
        socialImage: projectForm.socialImage.trim() || projectForm.cardImage.trim() || heroImage,
      },
      imageAlt: projectForm.imageAlt.trim() || projectForm.title.trim(),
      images,
      link: projectForm.externalLink.trim() || undefined,
      links:
        projectForm.externalLink.trim() || projectForm.caseStudyLink.trim()
          ? {
              live: projectForm.externalLink.trim() || undefined,
              caseStudy: projectForm.caseStudyLink.trim() || undefined,
            }
          : undefined,
      testimonial:
        projectForm.testimonialText.trim() && projectForm.testimonialAuthor.trim() && projectForm.testimonialPosition.trim()
          ? {
              text: projectForm.testimonialText.trim(),
              author: projectForm.testimonialAuthor.trim(),
              position: projectForm.testimonialPosition.trim(),
            }
          : undefined,
    };

    try {
      const savedProject = await requestWithRetry(() => saveBackendProject(payload), { retries: 1, retryDelayMs: 250 });
      const backendProjects = await fetchProjectsUntilPresent(savedProject.id);
      syncProjectsFromBackend(backendProjects);
      showSuccess(projectEditorMode === 'create' ? 'Projet créé avec succès.' : 'Projet mis à jour avec succès.');
      resetProjectEditor();
    } catch (error) {
      setProjectsError(mapProjectSaveError(error));
    } finally {
      setIsSavingProject(false);
    }
  };



  const transitionProjectStatus = async (projectId: string, target: ProjectFormState['status']) => {
    if (target === 'in_review' && !canEditContent) {
      setProjectsError('Soumission en revue non autorisée pour votre rôle.');
      return;
    }
    if (target === 'published' && !canPublishContent) {
      setProjectsError('Publication non autorisée pour votre rôle.');
      return;
    }

    try {
      await requestWithRetry(() => transitionBackendProject(projectId, target), { retries: 1, retryDelayMs: 250 });
      const backendProjects = await requestWithRetry(() => fetchBackendProjects(), { retries: 1, retryDelayMs: 250 });
      syncProjectsFromBackend(backendProjects);
      showSuccess(target === 'published' ? 'Projet publié.' : target === 'in_review' ? 'Projet soumis en revue.' : 'Projet archivé.');
    } catch (error) {
      setProjectsError(mapProjectSaveError(error));
    }
  };

  const deleteProject = async (projectId: string, projectTitle: string) => {
    if (!canDeleteContent) {
      setProjectsError('Suppression non autorisée: rôle administrateur requis.');
      return;
    }

    if (!window.confirm(`Supprimer définitivement le projet "${projectTitle}" ?`)) {
      return;
    }

    try {
      await requestWithRetry(() => deleteBackendProject(projectId), { retries: 1, retryDelayMs: 250 });
      const backendProjects = await requestWithRetry(() => fetchBackendProjects(), { retries: 1, retryDelayMs: 250 });
      syncProjectsFromBackend(backendProjects);
      if (projectForm.id === projectId) {
        resetProjectEditor();
      }
      showSuccess('Projet supprimé.');
    } catch (error) {
      if (error instanceof ContentApiError && error.status === 403) {
        setProjectsError('Suppression non autorisée: rôle administrateur requis.');
        return;
      }
      setProjectsError('Suppression impossible. Vérifiez votre connexion puis réessayez.');
    }
  };

  const startCreateService = () => {
    setServiceEditorMode('create');
    setServiceForm(EMPTY_SERVICE_FORM);
    setServiceFormErrors({});
    setServicesError('');
  };

  const startEditService = (service: Service) => {
    setServiceEditorMode('edit');
    setServiceForm({
      id: service.id,
      title: service.title,
      slug: service.slug,
      description: service.description,
      shortDescription: service.shortDescription || '',
      icon: service.icon,
      color: service.color,
      features: service.features.join('\n'),
      status: service.status ?? 'published',
      featured: Boolean(service.featured),
      routeSlug: service.routeSlug || service.slug,
      overviewDescription: service.overviewDescription || '',
      ctaTitle: service.ctaTitle || '',
      ctaDescription: service.ctaDescription || '',
      ctaPrimaryLabel: service.ctaPrimaryLabel || '',
      ctaPrimaryHref: service.ctaPrimaryHref || '',
      processTitle: service.processTitle || '',
      processSteps: (service.processSteps || []).join('\n'),
    });
    setServiceFormErrors({});
    setServicesError('');
  };

  const isValidPublicHref = (value: string): boolean => {
    const href = value.trim();
    if (!href) return false;
    if (href.startsWith('#')) return href.length > 1;
    if (href.startsWith('/')) return true;
    try {
      const parsed = new URL(href);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const validateServiceForm = (form: ServiceFormState, mode: 'create' | 'edit') => {
    const errors: Partial<Record<keyof ServiceFormState, string>> = {};
    if (!form.title.trim()) errors.title = 'Veuillez saisir un titre de service.';
    if (mode === 'create' && !form.description.trim()) errors.description = 'La description est requise à la création.';
    if (mode === 'create' && !form.features.trim()) errors.features = 'Ajoutez au moins une fonctionnalité à la création.';
    if (mode === 'create' && form.icon.trim() && !SERVICE_ICONS.has(form.icon.trim())) {
      errors.icon = 'Icône invalide. Valeurs supportées: palette, code, megaphone, video, box.';
    }
    if (mode === 'create' && form.color.trim() && !SERVICE_COLOR_PATTERN.test(form.color.trim())) {
      errors.color = 'Couleur invalide. Format attendu: from-[#hex] to-[#hex].';
    }
    if (form.slug.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      errors.slug = 'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets.';
    }
    if (form.routeSlug.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.routeSlug.trim())) {
      errors.routeSlug = 'Le routeSlug doit contenir uniquement des lettres minuscules, chiffres et tirets.';
    }
    if (form.ctaPrimaryHref.trim() && !isValidPublicHref(form.ctaPrimaryHref)) {
      errors.ctaPrimaryHref = 'Le CTA doit être une ancre (#contact), une route (/contact) ou une URL https://.';
    }
    if (form.status === 'published') {
      const resolvedRouteSlug = form.routeSlug.trim() || form.slug.trim() || normalizeSlug('', form.title);
      if (!resolvedRouteSlug) {
        errors.routeSlug = 'Un slug de route est requis pour publier.';
      }
      if (!form.description.trim()) {
        errors.description = 'Une description détaillée est requise pour publier.';
      }
      if (!form.features.split('\n').map((entry) => entry.trim()).filter(Boolean).length) {
        errors.features = 'Ajoutez au moins une fonctionnalité pour publier.';
      }
    }
    return errors;
  };

  const mapServiceSaveError = (error: unknown) => {
    if (error instanceof ContentApiError) {
      if (error.status === 403) return 'Création/mise à jour non autorisée pour votre rôle.';
      if (error.code === 'SERVICE_SLUG_CONFLICT') return 'Ce slug service existe déjà. Choisissez un slug unique.';
      if (error.code === 'SERVICE_ROUTE_SLUG_CONFLICT') return 'Ce slug de route publique est déjà utilisé par un autre service.';
      if (error.code === 'SERVICE_VALIDATION_ERROR') {
        const details = error.details && typeof error.details === 'object' ? (error.details as Record<string, unknown>) : {};
        const field = typeof details.field === 'string' ? details.field : '';
        const reason = typeof details.message === 'string' ? details.message : '';
        if (field || reason) {
          const detail = [field ? `champ: ${field}` : '', reason || 'format invalide'].filter(Boolean).join(' — ');
          return `Validation backend du service échouée (${detail}).`;
        }
        return 'Le service ne respecte pas le format attendu par le backend.';
      }
      if (error.code === 'SERVICE_NOT_PUBLISHABLE') return 'Ce service ne peut pas être publié: complétez les champs requis.';
      if (error.code === 'SERVICE_INVALID_MEDIA_REFERENCE') return 'Le visuel service sélectionné est introuvable.';
      return `Sauvegarde impossible (${error.message}).`;
    }
    return 'Sauvegarde impossible. Vérifiez votre connexion puis réessayez.';
  };

  const resetServiceEditor = () => {
    setServiceEditorMode('list');
    setServiceForm(EMPTY_SERVICE_FORM);
    setServiceFormErrors({});
  };

  const loadServicesFromBackend = async () => {
    setServicesLoading(true);
    setServicesError('');
    try {
      const backendServices = await requestWithRetry(() => fetchBackendServices(), { retries: 1, retryDelayMs: 250 });
      setServices(serviceRepository.replaceAll(backendServices));
    } catch {
      setServicesError('Impossible de charger les services depuis le backend.');
    } finally {
      setServicesLoading(false);
    }
  };

  const saveService = async () => {
    if (!canEditContent) {
      setServicesError('Création/mise à jour non autorisée pour votre rôle.');
      return;
    }

    const errors = validateServiceForm(serviceForm, serviceEditorMode === 'create' ? 'create' : 'edit');
    setServiceFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setServicesError('Veuillez corriger les erreurs du service avant d’enregistrer.');
      return;
    }

    setIsSavingService(true);
    setServicesError('');

    const payload: Service = buildServicePayload(serviceForm, serviceEditorMode === 'create' ? 'create' : 'edit');
    try {
      await requestWithRetry(() => saveBackendService(payload), { retries: 1, retryDelayMs: 250 });
      const backendServices = await requestWithRetry(() => fetchBackendServices(), { retries: 1, retryDelayMs: 250 });
      setServices(serviceRepository.replaceAll(backendServices));
      showSuccess(serviceEditorMode === 'create' ? 'Service créé avec succès.' : 'Service mis à jour avec succès.');
      resetServiceEditor();
    } catch (error) {
      setServicesError(mapServiceSaveError(error));
    } finally {
      setIsSavingService(false);
    }
  };

  const transitionServiceStatus = async (service: Service, targetStatus: Service['status']) => {
    if (targetStatus === 'published' && !canPublishContent) {
      setServicesError('Publication non autorisée pour votre rôle.');
      return;
    }
    if (targetStatus !== 'published' && !canEditContent) {
      setServicesError('Modification de statut non autorisée pour votre rôle.');
      return;
    }

    setServicesError('');
    try {
      await requestWithRetry(() => saveBackendService({ ...service, status: targetStatus }), { retries: 1, retryDelayMs: 250 });
      const backendServices = await requestWithRetry(() => fetchBackendServices(), { retries: 1, retryDelayMs: 250 });
      setServices(serviceRepository.replaceAll(backendServices));
      showSuccess(targetStatus === 'published' ? 'Service publié.' : targetStatus === 'archived' ? 'Service archivé.' : 'Service repassé en brouillon.');
    } catch (error) {
      setServicesError(mapServiceSaveError(error));
    }
  };

  const deleteService = async (serviceId: string, serviceTitle: string) => {
    if (!canDeleteContent) {
      setServicesError('Suppression non autorisée: rôle administrateur requis.');
      return;
    }

    if (!window.confirm(`Supprimer définitivement le service "${serviceTitle}" ?`)) {
      return;
    }

    try {
      await requestWithRetry(() => deleteBackendService(serviceId), { retries: 1, retryDelayMs: 250 });
      const backendServices = await requestWithRetry(() => fetchBackendServices(), { retries: 1, retryDelayMs: 250 });
      setServices(serviceRepository.replaceAll(backendServices));
      if (serviceForm.id === serviceId) resetServiceEditor();
      showSuccess('Service supprimé.');
    } catch {
      setServicesError('Suppression impossible: backend indisponible. Réessayez quand la synchronisation serveur est rétablie.');
    }
  };

  const uploadFileToMediaLibrary = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Invalid media payload'));
          return;
        }
        resolve(reader.result);
      };
      reader.onerror = () => reject(new Error('Failed to read media file'));
      reader.readAsDataURL(file);
    });

    const uploaded = await requestWithRetry(
      () =>
        uploadBackendMediaFile({
          filename: file.name,
          title: file.name,
          dataUrl,
          alt: file.name,
        }),
      { retries: 1, retryDelayMs: 250 },
    );

    const refreshedMedia = await requestWithRetry(() => fetchBackendMediaFiles(), { retries: 1, retryDelayMs: 250 }).catch(() => null);
    if (refreshedMedia) {
      syncMediaFromBackend(refreshedMedia);
    } else {
      mediaRepository.save(uploaded);
      setMediaVersion((version) => version + 1);
      setMediaFetchError('Upload enregistré, mais le rechargement complet de la médiathèque a échoué. Cliquez sur Rafraîchir backend.');
    }
    setSelectedMediaId(uploaded.id);
    return uploaded;
  };

  const handleMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input?.files?.[0];
    if (!file) return;

    setMediaUploadError('');
    setIsUploadingMedia(true);

    try {
      await uploadFileToMediaLibrary(file);
      showSuccess('Média uploadé et persisté sur le serveur.');
    } catch (error) {
      setMediaUploadError('Upload média impossible (format/taille ou backend indisponible).');
    } finally {
      setIsUploadingMedia(false);
      if (input) {
        input.value = '';
      }
    }
  };


  const updateSelectedMedia = async (patch: Partial<MediaFile>) => {
    if (!selectedMedia) return;
    if (!canEditContent) {
      setMediaUploadError('Modification média non autorisée pour votre rôle.');
      return;
    }

    setMediaUploadError('');
    try {
      const updated = await requestWithRetry(() => saveBackendMediaFile({ ...selectedMedia, ...patch }), { retries: 1, retryDelayMs: 250 });
      mediaRepository.save(updated);
      setMediaVersion((version) => version + 1);
      setSelectedMediaId(updated.id);
      showSuccess('Métadonnées média enregistrées.');
    } catch (error) {
      setMediaUploadError(getErrorMessage(error));
    }
  };

  const replaceSelectedMediaFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input?.files?.[0];
    if (!file || !selectedMedia) return;
    if (!canEditContent) {
      setMediaUploadError('Remplacement média non autorisé pour votre rôle.');
      return;
    }

    setMediaUploadError('');
    setIsUploadingMedia(true);
    try {
      const uploaded = await uploadFileToMediaLibrary(file);
      const replacement: Partial<MediaFile> = {
        filename: uploaded.filename,
        originalName: uploaded.originalName || file.name,
        mimeType: uploaded.mimeType || file.type,
        type: uploaded.type,
        size: uploaded.size,
        url: uploaded.url,
        publicPath: uploaded.publicPath,
        thumbnailUrl: uploaded.thumbnailUrl || uploaded.url,
        alt: selectedMedia.alt || uploaded.alt || file.name,
        caption: selectedMedia.caption || uploaded.caption || selectedMedia.alt || file.name,
        title: selectedMedia.title || uploaded.title || file.name,
        label: selectedMedia.label || uploaded.label || selectedMedia.name,
        tags: selectedMedia.tags,
        source: uploaded.source || uploaded.storageDriver || 'cloudinary-replacement',
        storageDriver: uploaded.storageDriver,
        publicId: uploaded.publicId,
        assetId: uploaded.assetId,
        resourceType: uploaded.resourceType,
        width: uploaded.width,
        height: uploaded.height,
        metadata: {
          ...(selectedMedia.metadata || {}),
          ...(uploaded.metadata || {}),
          replacedFromMediaId: uploaded.id,
          replacedOriginalName: file.name,
        },
      };
      const replaced = await requestWithRetry(() => replaceBackendMediaFile(selectedMedia.id, replacement), { retries: 1, retryDelayMs: 250 });
      await requestWithRetry(() => deleteBackendMediaFile(uploaded.id), { retries: 1, retryDelayMs: 250 }).catch(() => undefined);
      const refreshed = await requestWithRetry(() => fetchBackendMediaFiles(), { retries: 1, retryDelayMs: 250 }).catch(() => null);
      if (refreshed) syncMediaFromBackend(refreshed);
      else {
        mediaRepository.save(replaced);
        setMediaVersion((version) => version + 1);
      }
      setSelectedMediaId(selectedMedia.id);
      showSuccess('Fichier remplacé en conservant la même référence média.');
    } catch (error) {
      setMediaUploadError(getErrorMessage(error));
    } finally {
      setIsUploadingMedia(false);
      if (input) input.value = '';
    }
  };


  const loadTeamFromBackend = async (): Promise<TeamMember[]> => {
    setTeamLoading(true);
    setTeamError('');
    try {
      const backendTeam = await requestWithRetry(() => fetchBackendTeamMembers(), { retries: 1, retryDelayMs: 250 });
      setTeamMembers(backendTeam);
      return backendTeam;
    } catch (error) {
      setTeamError(getErrorMessage(error));
      return [];
    } finally {
      setTeamLoading(false);
    }
  };

  const saveTeamForm = async () => {
    if (teamLoading) return;
    if (!canEditContent) {
      setTeamError('Modification équipe non autorisée pour votre rôle.');
      return;
    }
    if (!teamForm.name?.trim() || !teamForm.role?.trim()) {
      setTeamError('Le nom et le rôle sont obligatoires.');
      return;
    }
    const socialLinks = `${(teamForm as any).socialLinksText || ''}`
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [platform = '', label = '', url = ''] = line.split('|').map((part) => part.trim());
        return { platform, label: label || platform, url };
      });
    const payload = { ...teamForm, socialLinks };
    console.debug('[cms-team-save]', { payload });
    setTeamLoading(true);
    setTeamError('');
    try {
      const savedMember = await saveBackendTeamMember(payload);
      console.debug('[cms-team-save-response]', savedMember);
      const refreshedTeam = await loadTeamFromBackend();
      console.debug('[cms-team-list-after-save]', { count: refreshedTeam.length });
      if (!savedMember?.id) {
        throw new Error("L’API n’a pas confirmé l’identifiant du membre enregistré.");
      }
      if (!refreshedTeam.some((member) => member.id === savedMember.id)) {
        throw new Error("Le membre enregistré n’apparaît pas encore dans la liste CMS rafraîchie.");
      }
      setTeamForm({ name: '', role: '', bio: '', photo: '', status: 'published', order: 0, socialLinks: [] });
      setTeamEditingId(null);
      showSuccess("Membre de l'équipe enregistré.");
    } catch (error) {
      setTeamError(getErrorMessage(error));
    } finally {
      setTeamLoading(false);
    }
  };

  const handleTeamPhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setIsUploadingMedia(true);
    setTeamError('');
    try {
      const uploaded = await uploadFileToMediaLibrary(file);
      setTeamForm((prev) => ({ ...prev, photo: toMediaReferenceValue(uploaded.id) }));
      showSuccess("Photo uploadée dans Cloudinary et liée au membre.");
    } catch (error) {
      setTeamError(getErrorMessage(error));
    } finally {
      setIsUploadingMedia(false);
      input.value = '';
    }
  };

  const handleProjectMediaUpload = async (field: 'cardImage' | 'heroImage' | 'socialImage' | 'galleryImages', event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input?.files?.[0];
    if (!file) return;

    setMediaUploadError('');
    setIsUploadingMedia(true);

    try {
      const uploaded = await uploadFileToMediaLibrary(file);
      const reference = toMediaReferenceValue(uploaded.id);
      setProjectForm((prev) => {
        if (field === 'galleryImages') {
          const nextGallery = [...prev.galleryImages.split('\n').map((line) => line.trim()).filter(Boolean), reference].join('\n');
          return { ...prev, galleryImages: nextGallery, imageAlt: prev.imageAlt.trim() || uploaded.alt || uploaded.name || prev.title };
        }
        return { ...prev, [field]: reference, imageAlt: prev.imageAlt.trim() || uploaded.alt || uploaded.name || prev.title };
      });
      showSuccess('Média uploadé dans la médiathèque et lié au projet.');
    } catch (error) {
      setMediaUploadError('Upload média projet impossible (format/taille ou backend indisponible).');
    } finally {
      setIsUploadingMedia(false);
      if (input) {
        input.value = '';
      }
    }
  };


  const handleBlogMediaUpload = async (field: 'featuredImage' | 'socialImage', event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input?.files?.[0];
    if (!file) return;

    setMediaUploadError('');
    setIsUploadingMedia(true);

    try {
      const uploaded = await uploadFileToMediaLibrary(file);
      const reference = toMediaReferenceValue(uploaded.id);
      setBlogForm((prev) => ({
        ...prev,
        [field]: reference,
        ...(field === 'featuredImage' && !prev.socialImage.trim() ? { socialImage: reference } : {}),
      }));
      showSuccess('Image uploadée dans la médiathèque et liée à l’article.');
    } catch {
      setMediaUploadError('Upload image blog impossible (format/taille ou backend indisponible).');
    } finally {
      setIsUploadingMedia(false);
      if (input) input.value = '';
    }
  };

  const uploadMediaForField = async (file: File): Promise<string> => {
    const uploaded = await uploadFileToMediaLibrary(file);
    const reference = toMediaReferenceValue(uploaded.id);
    if (import.meta.env.DEV) console.debug('[CMS media] uploaded/selected', { id: uploaded.id, reference });
    return reference;
  };

  const handleBlogBlockUpload = async (blockId: string, event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setMediaUploadError('');
    setIsUploadingMedia(true);
    try {
      const uploaded = await uploadFileToMediaLibrary(file);
      const reference = toMediaReferenceValue(uploaded.id);
      setBlogForm((prev) => ({ ...prev, contentBlocks: prev.contentBlocks.map((block) => block.id === blockId ? { ...block, media: reference, title: block.title || uploaded.label || uploaded.name } : block) }));
      showSuccess('Image secondaire uploadée et ajoutée à l’article.');
    } catch { setMediaUploadError('Upload de l’image secondaire impossible.'); }
    finally { setIsUploadingMedia(false); input.value = ''; }
  };

  const uploadHeroBackgroundMedia = async (
    itemId: string,
    field: 'media' | 'desktopMedia' | 'tabletMedia' | 'mobileMedia' | 'videoMedia',
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const input = event.currentTarget;
    const file = input?.files?.[0];
    if (!file) return;

    setHeroMediaUploadError('');
    setHeroMediaUploadTarget(itemId);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== 'string') {
            reject(new Error('Invalid media payload'));
            return;
          }
          resolve(reader.result);
        };
        reader.onerror = () => reject(new Error('Failed to read media file'));
        reader.readAsDataURL(file);
      });

      const uploaded = await requestWithRetry(
        () =>
          uploadBackendMediaFile({
            filename: file.name,
            title: file.name,
            dataUrl,
            alt: file.name,
          }),
        { retries: 1, retryDelayMs: 250 },
      );

      const mediaReference = toMediaReferenceValue(uploaded.id);
      setHomeContentForm((prev) => {
        if (!prev.heroBackgroundItems.some((item) => item.id === itemId)) {
          return appendHeroBackgroundItemWithMedia(prev, mediaReference);
        }
        return assignHeroBackgroundMedia(prev, itemId, field, mediaReference);
      });
      const refreshedMedia = await requestWithRetry(() => fetchBackendMediaFiles(), { retries: 1, retryDelayMs: 250 });
      syncMediaFromBackend(refreshedMedia);
      showSuccess('Image uploadée dans la médiathèque et liée au background hero.');
    } catch {
      setHeroMediaUploadError("Upload impossible pour cette slide. Vérifiez le format/taille puis réessayez.");
    } finally {
      setHeroMediaUploadTarget(null);
      if (input) {
        input.value = '';
      }
    }
  };

  const deleteMedia = async (targetMedia: MediaFile, knownReferences?: BackendMediaReference[]) => {
    if (!canDeleteContent) {
      setSectionError("Suppression média non autorisée: rôle administrateur requis.");
      return;
    }
    if (targetMedia.id === selectedMedia?.id && selectedMediaReferencesLoading) {
      setSectionError("Analyse des références en cours. Réessayez la suppression dans quelques secondes.");
      return;
    }

    const authoritativeReferences = knownReferences ?? await requestWithRetry(() => fetchBackendMediaReferences(targetMedia.id), { retries: 1, retryDelayMs: 250 }).catch(() => []);
    if (authoritativeReferences.length > 0) {
      const summary = summarizeReferences(authoritativeReferences);
      const scope = summary.byDomain.map((entry) => `${entry.label}:${entry.count}`).join(' • ');
      setSectionError(`Suppression bloquée: ${summary.total} référence(s) active(s) détectée(s)${scope ? ` (${scope})` : ''}.`);
      return;
    }

    const localReferences = mediaUsageIndex.get(targetMedia.id) || [];
    const localHint = localReferences.length > 0 ? `\nIndice local (non bloquant): ${localReferences.slice(0, 3).join(' | ')}` : '';
    const confirmMessage = [
      `Supprimer définitivement le média "${targetMedia.label || targetMedia.name}" ?`,
      'Cette action supprime définitivement le fichier Cloudinary et sa fiche média.',
      'Cette action est irréversible et reste bloquée tant que le média est référencé.',
      localHint,
    ].filter(Boolean).join('\n');
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await requestWithRetry(() => deleteBackendMediaFile(targetMedia.id), { retries: 1, retryDelayMs: 250 });
      const refreshed = await requestWithRetry(() => fetchBackendMediaFiles(), { retries: 1, retryDelayMs: 250 });
      syncMediaFromBackend(refreshed);
      if (selectedMedia?.id === targetMedia.id) setSelectedMediaId('');
      showSuccess('Média supprimé de Cloudinary et de la bibliothèque.');
    } catch (error) {
      if (error instanceof ContentApiError && error.code === 'MEDIA_IN_USE') {
        const references = await requestWithRetry(() => fetchBackendMediaReferences(targetMedia.id), { retries: 1, retryDelayMs: 250 }).catch(() => []);
        setSelectedMediaAuthoritativeReferences(references);
        const summary = summarizeReferences(references);
        const sample = summary.sample.slice(0, 3).join(' | ');
        setSectionError(`Suppression bloquée côté serveur: média référencé${sample ? ` (${sample})` : ''}.`);
        return;
      }
      setSectionError('Suppression média impossible. Réessayez.');
    }
  };

  const previewToneClass = (tone: 'success' | 'warning' | 'neutral'): string => (
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-slate-100 text-slate-600'
  );

  const renderCmsPreviewCard = (label: string, reference: string | undefined, fallbackAlt: string, fallbackQuery: string) => {
    const preview = resolveCmsPreviewReference(reference, fallbackAlt, fallbackQuery);

    return (
      <div className="rounded-[10px] border border-[#e4edf1] bg-[#fcfeff] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[12px] font-semibold text-[#273a41]">{label}</p>
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${previewToneClass(preview.statusTone)}`}>{preview.statusLabel}</span>
            <span className="inline-flex items-center rounded-full border border-[#d9e5ea] bg-[#f4f8fa] px-2 py-0.5 text-[11px] text-[#5d6f76]">{preview.sourceLabel}</span>
          </div>
        </div>
        <div className="overflow-hidden rounded-[8px] border border-[#e4edf1] bg-[#f5f9fa]">
          {preview.state === 'resolvable' ? (
            <img src={getCloudinaryVariant(preview.src, 'contain')} alt={preview.alt} className="max-h-[280px] w-full object-contain" loading="lazy" />
          ) : (
            <div className="flex h-[120px] items-center justify-center px-3 text-center text-[12px] text-[#6f7f85]">
              Référence non résolue (média manquant/archivé ou URL invalide).
            </div>
          )}
        </div>
        <p className="mt-2 break-all text-[11px] text-[#6f7f85]">{preview.reference || 'Aucune source configurée.'}</p>
      </div>
    );
  };


  const renderProjectMediaPicker = (
    field: 'cardImage' | 'heroImage' | 'socialImage' | 'galleryImages',
    label: string,
    value: string,
    previewLabel: string,
  ) => {
    const isGallery = field === 'galleryImages';
    const assignReference = (reference: string) => {
      setProjectForm((prev) => {
        if (isGallery) {
          const nextGallery = reference
            ? [...prev.galleryImages.split('\n').map((line) => line.trim()).filter(Boolean), reference].join('\n')
            : '';
          return { ...prev, galleryImages: nextGallery };
        }
        return { ...prev, [field]: reference };
      });
    };

    return (
      <div className="rounded-[10px] border border-[#e4edf1] bg-[#fcfeff] p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-[#273a41]">{label}</p>
            <p className="text-[12px] text-[#6f7f85]">Choisissez un média existant, uploadez un fichier local, ou videz ce champ optionnel.</p>
          </div>
          <AdminButton type="button" size="sm" onClick={() => assignReference('')}>Effacer</AdminButton>
        </div>
        {isGallery ? (
          <textarea value={value} onChange={(event) => setProjectForm((prev) => ({ ...prev, galleryImages: event.target.value }))} className="w-full min-h-[80px] rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder="media:asset-1\nmedia:asset-2" />
        ) : (
          <input value={value} onChange={(event) => setProjectForm((prev) => ({ ...prev, [field]: event.target.value }))} className="w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder="media:asset-id" />
        )}
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <select value="" onChange={(event) => { if (event.target.value) assignReference(event.target.value); }} className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[13px]">
            <option value="">Choisir depuis la médiathèque…</option>
            {mediaFiles.filter((file) => file.type === 'image').map((file) => (
              <option key={file.id} value={toMediaReferenceValue(file.id)}>{file.label || file.name}</option>
            ))}
          </select>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#00b3e8] px-3 py-2 text-[13px] text-[#007fa3] hover:bg-[#f0fbff]">
            <Upload size={14} /> Uploader
            <input type="file" accept="image/*" onChange={(event) => { void handleProjectMediaUpload(field, event); }} className="hidden" disabled={isUploadingMedia} />
          </label>
        </div>
        {!isGallery ? renderCmsPreviewCard(previewLabel, value, projectForm.imageAlt || projectForm.title || 'Projet', 'project cover image') : null}
        {field === 'cardImage' && projectFormErrors.cardImage ? <p className="text-[12px] text-red-600">{projectFormErrors.cardImage}</p> : null}
        {field === 'heroImage' && projectFormErrors.heroImage ? <p className="text-[12px] text-red-600">{projectFormErrors.heroImage}</p> : null}
        {field === 'socialImage' && projectFormErrors.socialImage ? <p className="text-[12px] text-red-600">{projectFormErrors.socialImage}</p> : null}
        {field === 'galleryImages' && projectFormErrors.galleryImages ? <p className="text-[12px] text-red-600">{projectFormErrors.galleryImages}</p> : null}
      </div>
    );
  };

  const renderProjectForm = () => {
    const title = projectEditorMode === 'create' ? 'Créer un projet' : 'Modifier un projet';
    const projectGroupHasErrors = (keys: Array<keyof ProjectFormState>) => keys.some((key) => Boolean(projectFormErrors[key]));

    return (
      <AdminPanel title={title}>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void saveProject();
          }}
        >
          <div className="rounded-[12px] border border-[#eef3f5] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-[16px] font-semibold text-[#273a41]">Identité & routage</h4>
                <p className="text-[12px] text-[#6f7f85]">Base du projet pour les listes portfolio et l’URL publique.</p>
              </div>
              {projectGroupHasErrors(['title', 'slug', 'client', 'category', 'year']) ? <span className="text-[12px] text-red-600">Champs requis à corriger</span> : null}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {(['title', 'slug', 'client', 'category', 'year'] as const).map((fieldKey) => (
                <label key={fieldKey} className="block">
                  <span className="text-[14px] text-[#6f7f85]">{fieldKey}</span>
                  <input
                    value={projectForm[fieldKey]}
                    onChange={(event) => setProjectForm((prev) => ({ ...prev, [fieldKey]: event.target.value }))}
                    className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2"
                  />
                  {projectFormErrors[fieldKey] ? <p className="text-[12px] text-red-600 mt-1">{projectFormErrors[fieldKey]}</p> : null}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-[12px] border border-[#eef3f5] p-4 space-y-3">
            <h4 className="text-[16px] font-semibold text-[#273a41]">Médias optionnels</h4>
            <p className="text-[12px] text-[#6f7f85]">Chaque champ accepte une référence stable <code>media:&lt;id&gt;</code>, un choix médiathèque, ou un upload local automatiquement enregistré dans la médiathèque.</p>
            {renderProjectMediaPicker('cardImage', 'Image carte / principale (optionnelle)', projectForm.cardImage, 'Carte projet')}
            {renderProjectMediaPicker('heroImage', 'Image hero détail (optionnelle)', projectForm.heroImage, 'Hero détail projet')}
            {renderProjectMediaPicker('socialImage', 'Image sociale (optionnelle)', projectForm.socialImage, 'Social / partage')}
            <label className="block">
              <span className="text-[14px] text-[#6f7f85]">Texte alternatif image</span>
              <input value={projectForm.imageAlt} onChange={(event) => setProjectForm((prev) => ({ ...prev, imageAlt: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" />
            </label>
            {renderProjectMediaPicker('galleryImages', 'Galerie d’images (optionnelle)', projectForm.galleryImages, 'Galerie')}
            {projectForm.galleryImages.trim() ? (
              <div className="rounded-[10px] border border-[#e4edf1] bg-[#fcfeff] p-3">
                <p className="mb-2 text-[12px] font-semibold text-[#273a41]">Galerie (ordre actuel)</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {projectForm.galleryImages
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((entry, index) => (
                      <div key={`${entry}-${index}`} className="space-y-1">
                        {renderCmsPreviewCard(`Galerie #${index + 1}`, entry, projectForm.imageAlt || projectForm.title || `Projet ${index + 1}`, 'project gallery image')}
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
            {isProjectMediaReference(projectForm.cardImage) ? <p className="text-[12px] text-[#6f7f85]">Référence média liée (carte): {projectForm.cardImage}</p> : null}
          </div>

          <div className="rounded-[12px] border border-[#eef3f5] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-[16px] font-semibold text-[#273a41]">Narratif & résultats</h4>
                <p className="text-[12px] text-[#6f7f85]">Contenu utilisé sur les pages détail projet.</p>
              </div>
              {projectGroupHasErrors(['summary', 'description', 'challenge', 'solution', 'testimonialText']) ? <span className="text-[12px] text-red-600">Vérifier ce bloc</span> : null}
            </div>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Résumé court (carte)</span><textarea value={projectForm.summary} onChange={(event) => setProjectForm((prev) => ({ ...prev, summary: event.target.value }))} className="mt-1 w-full min-h-[80px] rounded-[10px] border border-[#d8e4e8] px-3 py-2" />{projectFormErrors.summary ? <p className="text-[12px] text-red-600 mt-1">{projectFormErrors.summary}</p> : null}</label>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Description complète</span><textarea value={projectForm.description} onChange={(event) => setProjectForm((prev) => ({ ...prev, description: event.target.value }))} className="mt-1 w-full min-h-[90px] rounded-[10px] border border-[#d8e4e8] px-3 py-2" />{projectFormErrors.description ? <p className="text-[12px] text-red-600 mt-1">{projectFormErrors.description}</p> : null}</label>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Challenge</span><textarea value={projectForm.challenge} onChange={(event) => setProjectForm((prev) => ({ ...prev, challenge: event.target.value }))} className="mt-1 w-full min-h-[90px] rounded-[10px] border border-[#d8e4e8] px-3 py-2" />{projectFormErrors.challenge ? <p className="text-[12px] text-red-600 mt-1">{projectFormErrors.challenge}</p> : null}</label>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Solution</span><textarea value={projectForm.solution} onChange={(event) => setProjectForm((prev) => ({ ...prev, solution: event.target.value }))} className="mt-1 w-full min-h-[90px] rounded-[10px] border border-[#d8e4e8] px-3 py-2" />{projectFormErrors.solution ? <p className="text-[12px] text-red-600 mt-1">{projectFormErrors.solution}</p> : null}</label>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Résultats (une ligne par résultat)</span><textarea value={projectForm.results} onChange={(event) => setProjectForm((prev) => ({ ...prev, results: event.target.value }))} className="mt-1 w-full min-h-[90px] rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Tags (séparés par virgule)</span><input value={projectForm.tags} onChange={(event) => setProjectForm((prev) => ({ ...prev, tags: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label>
          </div>

          <div className="rounded-[12px] border border-[#eef3f5] p-4 space-y-3">
            <h4 className="text-[16px] font-semibold text-[#273a41]">CTA, témoignage & publication</h4>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Lien projet live (CTA détail)</span><input value={projectForm.externalLink} onChange={(event) => setProjectForm((prev) => ({ ...prev, externalLink: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder="https://..." />{projectFormErrors.externalLink ? <p className="text-[12px] text-red-600 mt-1">{projectFormErrors.externalLink}</p> : null}</label>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Lien Case Study</span><input value={projectForm.caseStudyLink} onChange={(event) => setProjectForm((prev) => ({ ...prev, caseStudyLink: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder="https://..." />{projectFormErrors.caseStudyLink ? <p className="text-[12px] text-red-600 mt-1">{projectFormErrors.caseStudyLink}</p> : null}</label>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Témoignage client</span><textarea value={projectForm.testimonialText} onChange={(event) => setProjectForm((prev) => ({ ...prev, testimonialText: event.target.value }))} className="mt-1 w-full min-h-[90px] rounded-[10px] border border-[#d8e4e8] px-3 py-2" />{projectFormErrors.testimonialText ? <p className="text-[12px] text-red-600 mt-1">{projectFormErrors.testimonialText}</p> : null}</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block"><span className="text-[14px] text-[#6f7f85]">Auteur du témoignage</span><input value={projectForm.testimonialAuthor} onChange={(event) => setProjectForm((prev) => ({ ...prev, testimonialAuthor: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label>
              <label className="block"><span className="text-[14px] text-[#6f7f85]">Poste / rôle</span><input value={projectForm.testimonialPosition} onChange={(event) => setProjectForm((prev) => ({ ...prev, testimonialPosition: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="block"><span className="text-[14px] text-[#6f7f85]">Statut de publication</span><select value={projectForm.status} onChange={(event) => setProjectForm((prev) => ({ ...prev, status: event.target.value as ProjectFormState['status'] }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2"><option value="draft">Brouillon</option><option value="in_review">En revue</option><option value="published">Publié</option><option value="archived">Archivé</option></select></label>
              <label className="inline-flex items-center gap-2 text-[14px] text-[#6f7f85] mt-7"><input type="checkbox" checked={projectForm.featured} onChange={(event) => setProjectForm((prev) => ({ ...prev, featured: event.target.checked }))} />Afficher en projet mis en avant</label>
            </div>
          </div>
          <AdminStickyFormActions>
            <AdminActionCluster>
              <AdminButton type="button" onClick={resetProjectEditor}>
                Annuler
              </AdminButton>
            </AdminActionCluster>
            <AdminActionCluster>
              <AdminButton type="submit" disabled={isSavingProject} intent="primary">
                <Save size={16} /> {isSavingProject ? 'Validation...' : projectEditorMode === 'create' ? 'Valider et créer le projet' : 'Valider et enregistrer'}
              </AdminButton>
            </AdminActionCluster>
          </AdminStickyFormActions>
        </form>
      </AdminPanel>
    );
  };

  const renderServiceForm = () => {
    const title = serviceEditorMode === 'create' ? 'Créer un service' : 'Modifier un service';
    const serviceGroupHasErrors = (keys: Array<keyof ServiceFormState>) => keys.some((key) => Boolean(serviceFormErrors[key]));

    return (
      <AdminPanel title={title}>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void saveService();
          }}
        >
          <div className="rounded-[12px] border border-[#eef3f5] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-[16px] font-semibold text-[#273a41]">Identité & routage</h4>
                <p className="text-[12px] text-[#6f7f85]">Infos visibles sur la page services et utilisées pour la route détail.</p>
              </div>
              {serviceGroupHasErrors(['title', 'slug', 'routeSlug', 'icon', 'color']) ? <span className="text-[12px] text-red-600">Bloc à corriger</span> : null}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {(['title', 'slug', 'routeSlug', 'icon', 'color'] as const).map((fieldKey) => (
                <label key={fieldKey} className="block">
                  <span className="text-[14px] text-[#6f7f85]">{fieldKey === 'routeSlug' ? 'Slug de route publique' : fieldKey}</span>
                  <input value={serviceForm[fieldKey]} onChange={(event) => setServiceForm((prev) => ({ ...prev, [fieldKey]: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" />
                  {serviceFormErrors[fieldKey] ? <p className="text-[12px] text-red-600 mt-1">{serviceFormErrors[fieldKey]}</p> : null}
                  {fieldKey === 'routeSlug' ? <p className="text-[12px] text-[#6f7f85] mt-1">Prévisualisation: <code>#service/{resolveServiceRouteSlug({ id: serviceForm.id || 'service', slug: serviceForm.slug, routeSlug: serviceForm.routeSlug })}</code>.</p> : null}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-[12px] border border-[#eef3f5] p-4 space-y-3">
            <h4 className="text-[16px] font-semibold text-[#273a41]">Contenu principal</h4>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Description courte (carte)</span><input value={serviceForm.shortDescription} onChange={(event) => setServiceForm((prev) => ({ ...prev, shortDescription: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Description détaillée</span><textarea value={serviceForm.description} onChange={(event) => setServiceForm((prev) => ({ ...prev, description: event.target.value }))} className="mt-1 w-full min-h-[90px] rounded-[10px] border border-[#d8e4e8] px-3 py-2" />{serviceFormErrors.description ? <p className="text-[12px] text-red-600 mt-1">{serviceFormErrors.description}</p> : null}</label>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Résumé d’introduction</span><textarea value={serviceForm.overviewDescription} onChange={(event) => setServiceForm((prev) => ({ ...prev, overviewDescription: event.target.value }))} className="mt-1 w-full min-h-[90px] rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Fonctionnalités (une ligne par item)</span><textarea value={serviceForm.features} onChange={(event) => setServiceForm((prev) => ({ ...prev, features: event.target.value }))} className="mt-1 w-full min-h-[90px] rounded-[10px] border border-[#d8e4e8] px-3 py-2" />{serviceFormErrors.features ? <p className="text-[12px] text-red-600 mt-1">{serviceFormErrors.features}</p> : null}</label>
          </div>

          <div className="rounded-[12px] border border-[#eef3f5] p-4 space-y-3">
            <h4 className="text-[16px] font-semibold text-[#273a41]">CTA</h4>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Titre CTA</span><input value={serviceForm.ctaTitle} onChange={(event) => setServiceForm((prev) => ({ ...prev, ctaTitle: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Description CTA</span><textarea value={serviceForm.ctaDescription} onChange={(event) => setServiceForm((prev) => ({ ...prev, ctaDescription: event.target.value }))} className="mt-1 w-full min-h-[80px] rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="block"><span className="text-[14px] text-[#6f7f85]">Libellé CTA primaire</span><input value={serviceForm.ctaPrimaryLabel} onChange={(event) => setServiceForm((prev) => ({ ...prev, ctaPrimaryLabel: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label>
              <label className="block"><span className="text-[14px] text-[#6f7f85]">Lien CTA primaire</span><input value={serviceForm.ctaPrimaryHref} onChange={(event) => setServiceForm((prev) => ({ ...prev, ctaPrimaryHref: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder="#contact, /contact ou https://..." />{serviceFormErrors.ctaPrimaryHref ? <p className="text-[12px] text-red-600 mt-1">{serviceFormErrors.ctaPrimaryHref}</p> : null}</label>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#eef3f5] p-4 space-y-3">
            <h4 className="text-[16px] font-semibold text-[#273a41]">Processus & publication</h4>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Titre processus</span><input value={serviceForm.processTitle} onChange={(event) => setServiceForm((prev) => ({ ...prev, processTitle: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Étapes du processus (une ligne par étape)</span><textarea value={serviceForm.processSteps} onChange={(event) => setServiceForm((prev) => ({ ...prev, processSteps: event.target.value }))} className="mt-1 w-full min-h-[90px] rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="block"><span className="text-[14px] text-[#6f7f85]">Statut</span><select value={serviceForm.status} onChange={(event) => setServiceForm((prev) => ({ ...prev, status: event.target.value as ServiceFormState['status'] }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2"><option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option></select></label>
              <label className="inline-flex items-center gap-2 text-[14px] text-[#6f7f85] mt-7"><input type="checkbox" checked={serviceForm.featured} onChange={(event) => setServiceForm((prev) => ({ ...prev, featured: event.target.checked }))} />Service mis en avant (cartes)</label>
            </div>
          </div>

          <AdminStickyFormActions>
            <AdminActionCluster>
              <AdminButton onClick={resetServiceEditor}>Annuler</AdminButton>
            </AdminActionCluster>
            <AdminActionCluster>
              <AdminButton type="submit" disabled={isSavingService} intent="primary">
                <Save size={16} /> {isSavingService ? 'Enregistrement...' : serviceEditorMode === 'create' ? 'Créer le service' : 'Mettre à jour le service'}
              </AdminButton>
            </AdminActionCluster>
          </AdminStickyFormActions>
        </form>
      </AdminPanel>
    );
  };


  const renderBlogMediaPicker = (
    field: 'featuredImage' | 'socialImage',
    label: string,
    value: string,
    previewLabel: string,
  ) => {
    const assignReference = (reference: string) => {
      setBlogForm((prev) => ({ ...prev, [field]: reference }));
    };

    return (
      <div>
        <CMSMediaPicker fieldName={field} label={label} value={value} mediaFiles={mediaFiles} disabled={isUploadingMedia} onUpload={uploadMediaForField} onChange={assignReference} />
        {field === 'featuredImage' && blogFormErrors.featuredImage ? <p className="text-[12px] text-red-600 mt-1">{blogFormErrors.featuredImage}</p> : null}
        {renderCmsPreviewCard(previewLabel, value, blogForm.title || 'Article', 'blog article image')}
      </div>
    );
  };

  const renderBlogContentBlocksEditor = () => {
    const updateBlock = (id: string, patch: Partial<BlogContentBlock>) => setBlogForm((prev) => ({ ...prev, contentBlocks: prev.contentBlocks.map((block) => block.id === id ? { ...block, ...patch } : block) }));
    const moveBlock = (index: number, offset: number) => setBlogForm((prev) => { const next = [...prev.contentBlocks]; const target = index + offset; if (target < 0 || target >= next.length) return prev; [next[index], next[target]] = [next[target], next[index]]; return { ...prev, contentBlocks: next }; });
    const addBlock = (type: BlogContentBlock['type']) => setBlogForm((prev) => ({ ...prev, contentBlocks: [...prev.contentBlocks, { id: `block-${Date.now()}`, type, layout: 'full', text: '' }] }));
    return <div className="rounded-[12px] border border-[#dce9ed] bg-[#f8fbfc] p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-[16px] font-semibold text-[#273a41]">Blocs secondaires — mise en page journal</h4><p className="mt-1 text-[12px] text-[#6f7f85]">Ajoutez des intertitres, textes et images légendées, puis réorganisez-les.</p></div><div className="flex flex-wrap gap-2"><AdminButton type="button" size="sm" onClick={() => addBlock('heading')}>+ Intertitre</AdminButton><AdminButton type="button" size="sm" onClick={() => addBlock('paragraph')}>+ Paragraphe</AdminButton><AdminButton type="button" size="sm" onClick={() => addBlock('image')}>+ Image</AdminButton></div></div>
      {blogForm.contentBlocks.length === 0 ? <div className="rounded-[10px] border border-dashed border-[#cbdde2] bg-white p-5 text-center text-[13px] text-[#6f7f85]">Aucun bloc secondaire. Le contenu principal reste affiché normalement.</div> : <div className="space-y-4">{blogForm.contentBlocks.map((block, index) => <div key={block.id} className="rounded-[12px] border border-[#dce8ec] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-[#0088ad]">{block.type === 'image' ? 'Image secondaire' : block.type === 'heading' ? 'Intertitre' : 'Paragraphe'}</span><div className="flex gap-1"><AdminButton type="button" size="sm" onClick={() => moveBlock(index, -1)} disabled={index === 0} title="Monter"><ArrowUp size={14} /></AdminButton><AdminButton type="button" size="sm" onClick={() => moveBlock(index, 1)} disabled={index === blogForm.contentBlocks.length - 1} title="Descendre"><ArrowDown size={14} /></AdminButton><AdminButton type="button" size="sm" intent="danger" onClick={() => setBlogForm((prev) => ({ ...prev, contentBlocks: prev.contentBlocks.filter((entry) => entry.id !== block.id) }))}><Trash2 size={14} /></AdminButton></div></div>
        {block.type !== 'image' ? <textarea value={block.text || ''} onChange={(event) => updateBlock(block.id, { text: event.target.value })} className="min-h-[90px] w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder={block.type === 'heading' ? 'Titre de section' : 'Texte du paragraphe'} /> : <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.8fr)]"><div className="space-y-3"><input value={block.media || ''} onChange={(event) => updateBlock(block.id, { media: event.target.value })} className="w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder="media:asset-id ou URL" /><div className="grid gap-2 sm:grid-cols-[1fr_auto]"><select value="" onChange={(event) => event.target.value && updateBlock(block.id, { media: event.target.value })} className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[13px]"><option value="">Choisir dans la médiathèque…</option>{mediaFiles.filter((file) => file.type === 'image').map((file) => <option key={file.id} value={toMediaReferenceValue(file.id)}>{file.label || file.name}</option>)}</select><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#00b3e8] px-3 py-2 text-[13px] text-[#007fa3] hover:bg-[#f0fbff]"><Upload size={14} /> Uploader<input type="file" accept="image/*" className="hidden" disabled={isUploadingMedia} onChange={(event) => void handleBlogBlockUpload(block.id, event)} /></label></div><input value={block.title || ''} onChange={(event) => updateBlock(block.id, { title: event.target.value })} className="w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder="Titre de l’image" /><input value={block.caption || ''} onChange={(event) => updateBlock(block.id, { caption: event.target.value })} className="w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder="Légende sous l’image" /><textarea value={block.text || ''} onChange={(event) => updateBlock(block.id, { text: event.target.value })} className="min-h-[80px] w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder="Paragraphe sous ou à côté de l’image" /><select value={block.layout || 'full'} onChange={(event) => updateBlock(block.id, { layout: event.target.value as BlogContentBlock['layout'] })} className="w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2"><option value="full">Pleine largeur</option><option value="left">Image alignée à gauche</option><option value="right">Image alignée à droite</option></select></div><div>{renderCmsPreviewCard(block.title || 'Aperçu journal', block.media || '', block.caption || blogForm.title || 'Article', 'secondary article image')}</div></div>}
      </div>)}</div>}
    </div>;
  };

  const renderBlogForm = () => {
    const title = blogEditorMode === 'create' ? 'Créer un article' : 'Modifier un article';
    const blogGroupHasErrors = (keys: Array<keyof BlogFormState>) => keys.some((key) => Boolean(blogFormErrors[key]));
    const publishabilityErrors = getBlogPublishabilityErrors(blogForm);
    const isPublishReady = Object.keys(publishabilityErrors).length === 0;
    const publishabilityLabels: Record<keyof BlogFormState, string> = {
      id: 'ID',
      title: 'titre',
      slug: 'slug',
      excerpt: 'résumé',
      content: 'contenu',
      author: 'auteur',
      category: 'catégorie',
      tags: 'tags',
      featuredImage: 'image vedette',
      readTime: 'temps de lecture',
      status: 'statut',
      seoTitle: 'SEO title',
      seoDescription: 'SEO description',
      canonicalSlug: 'canonical slug',
      socialImage: 'image sociale',
      publishedDate: 'date de publication',
    };

    return (
      <AdminPanel title={title}>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void saveBlogPost();
          }}
        >
          <div className="rounded-[12px] border border-[#eef3f5] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-[16px] font-semibold text-[#273a41]">Informations de base</h4>
                <p className="text-[12px] text-[#6f7f85]">Champs visibles en carte blog et pour le classement éditorial.</p>
              </div>
              {blogGroupHasErrors(['title', 'slug', 'author', 'readTime', 'category']) ? <span className="text-[12px] text-red-600">Bloc à corriger</span> : null}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {(['title', 'slug', 'author', 'readTime'] as const).map((fieldKey) => (
                <label key={fieldKey} className="block">
                  <span className="text-[14px] text-[#6f7f85]">{fieldKey}</span>
                  <input value={blogForm[fieldKey]} onChange={(event) => setBlogForm((prev) => ({ ...prev, [fieldKey]: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" />
                  {blogFormErrors[fieldKey] ? <p className="text-[12px] text-red-600 mt-1">{blogFormErrors[fieldKey]}</p> : null}
                </label>
              ))}
            </div>
            <label className="block">
              <span className="text-[14px] text-[#6f7f85]">Catégorie (taxonomie gérée)</span>
              <input list="blog-managed-categories" value={blogForm.category} onChange={(event) => setBlogForm((prev) => ({ ...prev, category: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" />
              <datalist id="blog-managed-categories">{managedBlogCategories.map((category) => (<option key={category} value={category} />))}</datalist>
              <p className="text-[12px] text-[#6f7f85] mt-1">Préférer les catégories gérées pour la cohérence du blog.</p>
            </label>
            <label className="block">
              <span className="text-[14px] text-[#6f7f85]">Tags (séparés par virgules)</span>
              <input value={blogForm.tags} onChange={(event) => setBlogForm((prev) => ({ ...prev, tags: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder={managedBlogTags.slice(0, 5).join(', ')} />
              <p className="text-[12px] text-[#6f7f85] mt-1">Tags gérés: {managedBlogTags.join(', ')}</p>
            </label>
          </div>


          <div className="rounded-[12px] border border-[#eef3f5] p-4 space-y-3">
            <div><h4 className="text-[16px] font-semibold text-[#273a41]">Image principale</h4><p className="text-[12px] text-[#6f7f85]">La relation peut être remplacée ou effacée sans supprimer le fichier de la médiathèque.</p></div>
            {renderBlogMediaPicker('featuredImage', 'Image vedette (hero détail)', blogForm.featuredImage, 'Image vedette (hero)')}
          </div>

          <div className="rounded-[12px] border border-[#eef3f5] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-[16px] font-semibold text-[#273a41]">Contenu</h4>
              {blogGroupHasErrors(['excerpt', 'content']) ? <span className="text-[12px] text-red-600">Résumé / contenu requis</span> : null}
            </div>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Résumé (affiché en carte)</span><textarea value={blogForm.excerpt} onChange={(event) => setBlogForm((prev) => ({ ...prev, excerpt: event.target.value }))} className="mt-1 w-full min-h-[90px] rounded-[10px] border border-[#d8e4e8] px-3 py-2" />{blogFormErrors.excerpt ? <p className="text-[12px] text-red-600 mt-1">{blogFormErrors.excerpt}</p> : null}</label>
            <div><span className="mb-1 block text-[14px] text-[#6f7f85]">Contenu complet</span><BlogContentEditor value={blogForm.content} onChange={(content) => setBlogForm((prev) => ({ ...prev, content }))} error={blogFormErrors.content} /></div>
            {renderBlogContentBlocksEditor()}
          </div>

          <div className="rounded-[12px] border border-[#eef3f5] p-4 space-y-3">
            <h4 className="text-[16px] font-semibold text-[#273a41]">SEO / aperçu social</h4>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">SEO title</span><input value={blogForm.seoTitle} onChange={(event) => setBlogForm((prev) => ({ ...prev, seoTitle: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" /><p className="text-[12px] text-[#6f7f85] mt-1">Utilisé dans les résultats de recherche et partages.</p></label>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">SEO description</span><textarea value={blogForm.seoDescription} onChange={(event) => setBlogForm((prev) => ({ ...prev, seoDescription: event.target.value }))} className="mt-1 w-full min-h-[80px] rounded-[10px] border border-[#d8e4e8] px-3 py-2" />{blogFormErrors.seoDescription ? <p className="text-[12px] text-red-600 mt-1">{blogFormErrors.seoDescription}</p> : null}</label>
            <label className="block"><span className="text-[14px] text-[#6f7f85]">Canonical slug (optionnel)</span><input value={blogForm.canonicalSlug} onChange={(event) => setBlogForm((prev) => ({ ...prev, canonicalSlug: event.target.value }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label>
          {renderBlogMediaPicker('socialImage', 'Image sociale (aperçus)', blogForm.socialImage, 'Image sociale (partage)')}
          {mediaUploadError ? <AdminWarningState label={mediaUploadError} /> : null}

          {(blogForm.featuredImage || blogForm.socialImage) ? (
            <div className="rounded-[10px] border border-[#eef3f5] px-3 py-3 text-[12px] text-[#6f7f85] space-y-3">
              <p className="text-[12px] text-[#5f7178]">
                Aperçu contractuel blog: {resolveBlogMediaReference(blogForm.featuredImage, blogForm.title || 'Article').caption}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {renderCmsPreviewCard('Image vedette (carte + hero)', blogForm.featuredImage, blogForm.title || 'Article', 'blog article image')}
                {renderCmsPreviewCard('Image sociale (partage)', blogForm.socialImage || blogForm.featuredImage, blogForm.title || 'Article', 'blog article image')}
              </div>
            </div>
          ) : null}
          </div>

          <div className="rounded-[12px] border border-[#eef3f5] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-[16px] font-semibold text-[#273a41]">Publication</h4>
              {blogGroupHasErrors(['publishedDate']) ? <span className="text-[12px] text-red-600">Date invalide</span> : null}
            </div>
            {!isPublishReady ? (
              <p className="text-[12px] text-amber-700">
                Prêt brouillon/revue, mais pas publiable: compléter{' '}
                {Object.keys(publishabilityErrors)
                  .map((key) => publishabilityLabels[key as keyof BlogFormState] || key)
                  .join(', ')}.
              </p>
            ) : (
              <p className="text-[12px] text-emerald-700">Contrat de publication valide (titre requis uniquement).</p>
            )}
            <label className="block">
              <span className="text-[14px] text-[#6f7f85]">Statut</span>
              <select value={blogForm.status} onChange={(event) => setBlogForm((prev) => ({ ...prev, status: event.target.value as BlogPost['status'] }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2">
                <option value="draft">Brouillon</option>
                <option value="in_review">En revue</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[14px] text-[#6f7f85]">Date de publication</span>
              <input type="datetime-local" value={toDateTimeLocalValue(blogForm.publishedDate)} onChange={(event) => setBlogForm((prev) => ({ ...prev, publishedDate: toIsoDateTime(event.target.value) || prev.publishedDate }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" />
              {blogFormErrors.publishedDate ? <p className="text-[12px] text-red-600 mt-1">{blogFormErrors.publishedDate}</p> : null}
            </label>
          </div>
          <AdminStickyFormActions>
            <AdminActionCluster>
              <AdminButton type="button" onClick={resetBlogEditor}>Annuler</AdminButton>
              <AdminButton
                type="button"
                onClick={() => {
                  void saveBlogPost('draft');
                }}
                disabled={isSavingPost}
              >
                Enregistrer en brouillon
              </AdminButton>
            </AdminActionCluster>
            <AdminActionCluster>
              <AdminButton
                type="button"
                onClick={() => {
                  void saveBlogPost('in_review');
                }}
                disabled={isSavingPost || !canEditContent || !instantPublishingEnabled}
                intent="workflow"
              >
                Soumettre en revue
              </AdminButton>
              <AdminButton type="submit" disabled={isSavingPost} intent="primary">
                <Save size={16} /> {isSavingPost ? 'Enregistrement...' : blogEditorMode === 'create' ? 'Valider et créer l’article' : 'Valider et enregistrer'}
              </AdminButton>
            </AdminActionCluster>
          </AdminStickyFormActions>
          {!canEditContent ? (
            <p className="text-[12px] text-amber-700">Soumission en revue réservée aux rôles auteur/éditeur/administrateur.</p>
          ) : null}
          {blogHasUnsavedChanges ? (
            <p className="text-[12px] text-amber-700">Modifications non enregistrées en cours.</p>
          ) : null}
        </form>
      </AdminPanel>
    );
  };


  const hydrateBackendFromLocalSnapshot = async () => {
    setSectionError('Hydratation locale supprimée: le backend et la base de données sont la seule source de vérité.');
  };

  const loadAdminUsers = async () => {
    setAdminUsersLoading(true);
    setAdminUsersError('');
    try {
      const users = await fetchAdminUsers();
      setAdminUsers(users);
      setSelectedUserId((current) => (current && users.some((entry) => entry.id === current) ? current : users[0]?.id ?? null));
    } catch (error) {
      setAdminUsersError(error instanceof Error ? error.message : 'Impossible de charger les utilisateurs.');
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const loadAuditEvents = async () => {
    setAuditLoading(true);
    try {
      const events = await fetchAdminAuditEvents();
      setAuditEvents(events);
    } catch (error) {
      setAdminUsersError(error instanceof Error ? error.message : 'Impossible de charger les événements d’audit.');
    } finally {
      setAuditLoading(false);
    }
  };

  const patchAdminUser = async (targetUserId: string, patch: Partial<Pick<AppUser, 'role' | 'accountStatus' | 'emailVerified'>>) => {
    if (user?.role !== 'admin') {
      setAdminUsersError('Action réservée aux administrateurs.');
      return;
    }
    if (!canMutateSensitiveUserFields(user, targetUserId, patch)) {
      setAdminUsersError('Sécurité active: impossible de rétrograder ou suspendre votre propre compte.');
      return;
    }
    if (patch.accountStatus === 'suspended' && !window.confirm('Confirmer la suspension de ce compte ?')) {
      return;
    }
    setUpdatingUserId(targetUserId);
    setAdminUsersError('');
    setAdminUsersNotice('');
    try {
      const result = await updateAdminUser(targetUserId, patch);
      if (!result.success) {
        setAdminUsersError(result.error ?? 'Mise à jour impossible.');
        return;
      }
      setAdminUsersNotice('Profil utilisateur mis à jour.');
      await loadAdminUsers();
      if (user?.role === 'admin') {
        await loadAuditEvents();
      }
      showSuccess('Utilisateur mis à jour.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const loadNewsletterSubscribers = async () => {
    setNewsletterLoading(true);
    setNewsletterError('');
    try {
      const result = await fetchNewsletterSubscribers({
        q: newsletterSearch,
        status: newsletterStatusFilter,
        source: newsletterSourceFilter,
      });
      setNewsletterSubscribers(result.items);
      setNewsletterSummary(result.summary);
      setNewsletterLastRefreshedAt(new Date().toISOString());
    } catch (error) {
      setNewsletterError(error instanceof Error ? error.message : 'Impossible de charger les abonnés newsletter.');
    } finally {
      setNewsletterLoading(false);
    }
  };

  const loadContactLeads = async () => {
    setContactLeadsLoading(true);
    setContactLeadsError('');
    try {
      const result = await fetchContactLeads({
        q: contactLeadsSearch,
        source: contactLeadsSourceFilter,
        deliveryStatus: contactLeadsStatusFilter,
      });
      setContactLeads(result.items);
      setContactLeadsSummary(result.summary);
      setContactLeadsLastRefreshedAt(new Date().toISOString());
    } catch (error) {
      setContactLeadsError(error instanceof Error ? error.message : 'Impossible de charger les messages contact.');
    } finally {
      setContactLeadsLoading(false);
    }
  };

  const patchNewsletterStatus = async (id: string, status: 'active' | 'unsubscribed') => {
    setNewsletterNotice('');
    setNewsletterError('');
    try {
      await updateNewsletterSubscriberStatus(id, status);
      setNewsletterNotice(status === 'active' ? 'Abonnement réactivé.' : 'Abonné désinscrit.');
      await loadNewsletterSubscribers();
      showSuccess('Statut newsletter mis à jour.');
    } catch (error) {
      setNewsletterError(error instanceof Error ? error.message : 'Mise à jour newsletter impossible.');
    }
  };

  useEffect(() => {
    if (currentSection === 'newsletter' && canAccessCMS) {
      void loadNewsletterSubscribers();
    }
  }, [currentSection, canAccessCMS, newsletterSearch, newsletterStatusFilter, newsletterSourceFilter]);

  useEffect(() => {
    if (currentSection === 'contacts' && canAccessCMS) {
      void loadContactLeads();
    }
  }, [currentSection, canAccessCMS, contactLeadsSearch, contactLeadsSourceFilter, contactLeadsStatusFilter]);

  useEffect(() => {
    if (currentSection === 'users' && canAccessCMS) {
      void loadAdminUsers();
      if (user?.role === 'admin') {
        void loadAuditEvents();
      }
    }
  }, [currentSection, canAccessCMS, user?.role]);

  if (!canAccessCMS) {
    return (
      <div className="min-h-screen bg-[#f5f9fa] flex items-center justify-center px-6">
        <div className="max-w-xl w-full bg-white rounded-[20px] shadow-sm border border-[#eef3f5] p-8 text-center">
          <h1 className="font-['Medula_One:Regular',sans-serif] text-[32px] tracking-[2px] uppercase text-[#273a41] mb-4">
            Accès refusé
          </h1>
          <p className="font-['Abhaya_Libre:Regular',sans-serif] text-[16px] text-[#38484e] mb-6">
            Seuls les comptes administrateurs, éditeurs ou auteurs peuvent accéder au CMS.
          </p>
          <a
            href={getPublicSiteUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center bg-[#00b3e8] text-white px-6 py-3 rounded-[12px] font-['Abhaya_Libre:Bold',sans-serif]"
          >
            Retour au site
          </a>
        </div>
      </div>
    );
  }

  const renderSectionContent = () => {
    if (currentSection === 'projects') {
      return (
        <ProjectsSection
          canEditContent={canEditContent}
          canDeleteContent={canDeleteContent}
          canPublishContent={canPublishContent}
          projectsError={projectsError}
          projectsLoading={projectsLoading}
          projects={projects}
          projectEditorMode={projectEditorMode}
          renderProjectForm={renderProjectForm}
          startCreateProject={startCreateProject}
          startEditProject={startEditProject}
          transitionProjectStatus={transitionProjectStatus}
          deleteProject={deleteProject}
          loadProjectsFromBackend={loadProjectsFromBackend}
        />
      );
    }


    if (currentSection === 'team') {
      if (import.meta.env.DEV) {
        console.debug('[cms-team]', 'rendered');
      }

      return (
        <div className="space-y-6">
          <AdminPageHeader title="Gestion de l'équipe" subtitle="Créez, publiez, modifiez ou supprimez les profils affichés sur /equipe." />
          {teamError ? <AdminErrorState label={teamError} /> : null}
          <AdminPanel title={teamEditingId ? 'Modifier un membre' : 'Nouveau membre'}>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void saveTeamForm();
              }}
            >
              <input className="rounded-xl border border-[#dce7ec] px-4 py-3" placeholder="Nom complet" value={teamForm.name || ''} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} />
              <input className="rounded-xl border border-[#dce7ec] px-4 py-3" placeholder="Rôle / poste" value={teamForm.role || ''} onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value })} />
              <div className="space-y-2 md:col-span-2">
                <input className="w-full rounded-xl border border-[#dce7ec] px-4 py-3" placeholder="Photo (media:id ou URL)" value={teamForm.photo || ''} onChange={(e) => setTeamForm({ ...teamForm, photo: e.target.value })} />
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <select className="rounded-xl border border-[#dce7ec] px-4 py-3" value={mediaFiles.some((file) => teamForm.photo === toMediaReferenceValue(file.id)) ? teamForm.photo || '' : ''} onChange={(e) => setTeamForm({ ...teamForm, photo: e.target.value })}>
                    <option value="">Choisir une photo Cloudinary depuis la médiathèque…</option>
                    {mediaFiles.filter((file) => file.type === 'image').map((file) => <option key={file.id} value={toMediaReferenceValue(file.id)}>{file.label || file.title || file.name}</option>)}
                  </select>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#00b3e8] px-4 py-3 text-sm font-semibold text-[#007fa3]"><Upload size={14} /> Uploader photo<input type="file" accept="image/*" className="hidden" disabled={isUploadingMedia} onChange={handleTeamPhotoUpload} /></label>
                </div>
                {teamForm.photo ? <img src={resolveCmsPreviewReference(teamForm.photo, teamForm.name || 'Photo équipe').src} alt="Aperçu photo équipe" className="h-24 w-24 rounded-xl object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <p className="text-xs text-[#6f7f85]">Les nouvelles photos doivent utiliser une référence <code>media:&lt;id&gt;</code> Cloudinary.</p>}
              </div>
              <input className="rounded-xl border border-[#dce7ec] px-4 py-3" placeholder="Email" value={teamForm.email || ''} onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })} />
              <input className="rounded-xl border border-[#dce7ec] px-4 py-3" placeholder="Téléphone" value={teamForm.phone || ''} onChange={(e) => setTeamForm({ ...teamForm, phone: e.target.value })} />
              <input className="rounded-xl border border-[#dce7ec] px-4 py-3" type="number" placeholder="Ordre" value={teamForm.order || 0} onChange={(e) => setTeamForm({ ...teamForm, order: Number(e.target.value) })} />
              <select className="rounded-xl border border-[#dce7ec] px-4 py-3" value={teamForm.status || 'published'} onChange={(e) => setTeamForm({ ...teamForm, status: e.target.value as TeamMember['status'] })}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option></select>
              <label className="flex items-center gap-2 text-sm text-[#52666d]"><input type="checkbox" checked={Boolean(teamForm.featured)} onChange={(e) => setTeamForm({ ...teamForm, featured: e.target.checked })} /> Mis en avant</label>
              <textarea className="rounded-xl border border-[#dce7ec] px-4 py-3 md:col-span-2" rows={4} placeholder="Bio courte" value={teamForm.bio || ''} onChange={(e) => setTeamForm({ ...teamForm, bio: e.target.value })} />
              <textarea className="rounded-xl border border-[#dce7ec] px-4 py-3 md:col-span-2" rows={3} placeholder="Liens sociaux: platform | Label | https://... (un par ligne)" value={(teamForm as any).socialLinksText || ''} onChange={(e) => setTeamForm({ ...(teamForm as any), socialLinksText: e.target.value })} />
              <div className="mt-1 flex gap-2 md:col-span-2"><AdminButton type="submit" intent="primary" disabled={teamLoading || !canEditContent}><Save size={15} /> {teamLoading ? 'Enregistrement…' : 'Enregistrer'}</AdminButton><AdminButton type="button" disabled={teamLoading} onClick={() => void loadTeamFromBackend()}><RotateCcw size={15} /> Rafraîchir</AdminButton></div>
            </form>
          </AdminPanel>
          <AdminPanel title={`Membres (${teamMembers.length})`}>
            {teamLoading ? <AdminLoadingState label="Chargement de l'équipe..." /> : null}
            {!teamLoading && teamMembers.length === 0 ? <AdminEmptyState label="Aucun membre créé." /> : null}
            <div className="space-y-3">{teamMembers.map((member) => (<div key={member.id} className="rounded-xl border border-[#e4edf1] bg-white p-4 md:flex md:items-center md:justify-between"><div><p className="font-semibold text-[#273a41]">{member.name}</p><p className="text-sm text-[#6f7f85]">{member.role} • {member.status}</p></div><div className="mt-3 flex gap-2 md:mt-0"><AdminButton size="sm" onClick={() => { setTeamEditingId(member.id); setTeamForm({ ...member, socialLinksText: (member.socialLinks || []).map((l) => `${l.platform} | ${l.label} | ${l.url}`).join('\n') } as any); }}><Pencil size={14} /> Modifier</AdminButton><AdminButton size="sm" intent="danger" disabled={!canDeleteContent} onClick={async () => { await deleteBackendTeamMember(member.id); const refreshedTeam = await loadTeamFromBackend(); if (!refreshedTeam.some((entry) => entry.id === member.id)) showSuccess("Membre de l'équipe supprimé."); }}><Trash2 size={14} /> Supprimer</AdminButton></div></div>))}</div>
          </AdminPanel>
        </div>
      );
    }

    if (currentSection === 'services') {
      return (
        <ServicesSection
          canEditContent={canEditContent}
          canDeleteContent={canDeleteContent}
          canPublishContent={canPublishContent}
          servicesError={servicesError}
          servicesLoading={servicesLoading}
          services={services}
          serviceEditorMode={serviceEditorMode}
          renderServiceForm={renderServiceForm}
          startCreateService={startCreateService}
          startEditService={startEditService}
          transitionServiceStatus={transitionServiceStatus}
          deleteService={deleteService}
          loadServicesFromBackend={loadServicesFromBackend}
        />
      );
    }

    if (currentSection === 'blog') {
      return (
        <BlogSection
          canEditContent={canEditContent}
          canDeleteContent={canDeleteContent}
          canPublishContent={canPublishContent}
          canReviewContent={canReviewContent}
          postsError={postsError}
          postsLoading={postsLoading}
          posts={posts}
          blogEditorMode={blogEditorMode}
          renderBlogForm={renderBlogForm}
          startCreatePost={startCreatePost}
          retryLoadPosts={retryLoadPosts}
          getStatusLabel={getStatusLabel}
          transitionPostStatus={transitionPostStatus}
          statusTransitioningPostId={statusTransitioningPostId}
          instantPublishingEnabled={instantPublishingEnabled}
          startEditPost={startEditPost}
          deletePost={deletePost}
          recentlyUpdatedCount={editorialAnalytics?.recentlyUpdated.length ?? cmsStats.recentlyUpdatedCount}
        />
      );
    }

    if (currentSection === 'media') {
      return (
        <MediaSection
          mediaQuery={mediaQuery}
          setMediaQuery={setMediaQuery}
          setSelectedMediaId={setSelectedMediaId}
          isUploadingMedia={isUploadingMedia}
          handleMediaUpload={handleMediaUpload}
          canEditContent={canEditContent}
          mediaUploadError={mediaFetchError || mediaUploadError}
          filteredMediaFiles={filteredMediaFiles}
          loadMediaFromBackend={loadMediaFromBackend}
          selectedMediaId={selectedMediaId}
          selectedMedia={selectedMedia}
          authoritativeReferences={selectedMediaAuthoritativeReferences}
          authoritativeReferencesLoading={selectedMediaReferencesLoading}
          authoritativeReferencesError={selectedMediaReferencesError}
          localFallbackUsages={selectedMedia ? (mediaUsageIndex.get(selectedMedia.id) || []) : []}
          canDeleteContent={canDeleteContent}
          updateSelectedMedia={updateSelectedMedia}
          replaceSelectedMediaFile={replaceSelectedMediaFile}
          deleteMedia={deleteMedia}
        />
      );
    }

    if (currentSection === 'content') {
      return (
        <PageContentSection
          homeContentError={homeContentError}
          saveHomePageContent={saveHomePageContent}
          homeContentSaving={homeContentSaving}
          hasUnsavedChanges={homeContentHasUnsavedChanges}
          canEditContent={canEditContent}
          resetHomePageContent={resetHomePageContent}
          openMediaLibrary={() => {
            void handleSectionChange('media');
          }}
          heroMediaUploadError={heroMediaUploadError}
          heroMediaUploadTarget={heroMediaUploadTarget}
          uploadHeroBackgroundMedia={uploadHeroBackgroundMedia}
          homeContentForm={homeContentForm}
          setHomeContentForm={setHomeContentForm}
          mediaFiles={mediaFiles}
        />
      );
    }

    if (currentSection === 'users') {
      return (
        <UsersSection
          user={user}
          adminUsersNotice={adminUsersNotice}
          adminUsersError={adminUsersError}
          adminUsersLoading={adminUsersLoading}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          verificationFilter={verificationFilter}
          setVerificationFilter={setVerificationFilter}
          providerFilter={providerFilter}
          setProviderFilter={setProviderFilter}
          roleOptions={USER_ROLE_OPTIONS}
          accountStatusOptions={USER_ACCOUNT_STATUS_OPTIONS}
          providerOptions={USER_PROVIDER_OPTIONS}
          adminUsers={adminUsers}
          filteredAdminUsers={filteredAdminUsers}
          selectedUserId={selectedUserId}
          setSelectedUserId={setSelectedUserId}
          selectedAdminUser={selectedAdminUser}
          updatingUserId={updatingUserId}
          patchAdminUser={patchAdminUser}
          formatUserDate={formatUserDate}
          getUserRoleTone={getUserRoleTone}
          getUserStatusTone={getUserStatusTone}
          refresh={() => {
            void loadAdminUsers();
            if (user?.role === 'admin') void loadAuditEvents();
          }}
          auditLoading={auditLoading}
          auditEvents={auditEvents}
        />
      );
    }

    if (currentSection === 'newsletter') {
      return (
        <NewsletterSection
          canManage={user?.role === 'admin'}
          loading={newsletterLoading}
          error={newsletterError}
          notice={newsletterNotice}
          subscribers={newsletterSubscribers}
          search={newsletterSearch}
          setSearch={setNewsletterSearch}
          statusFilter={newsletterStatusFilter}
          setStatusFilter={setNewsletterStatusFilter}
          sourceFilter={newsletterSourceFilter}
          setSourceFilter={setNewsletterSourceFilter}
          summary={newsletterSummary}
          lastRefreshedAt={newsletterLastRefreshedAt}
          refresh={() => {
            void loadNewsletterSubscribers();
          }}
          updateStatus={patchNewsletterStatus}
        />
      );
    }

    if (currentSection === 'contacts') {
      return (
        <ContactLeadsSection
          loading={contactLeadsLoading}
          error={contactLeadsError}
          notice={contactLeadsNotice}
          leads={contactLeads}
          search={contactLeadsSearch}
          setSearch={setContactLeadsSearch}
          sourceFilter={contactLeadsSourceFilter}
          setSourceFilter={setContactLeadsSourceFilter}
          statusFilter={contactLeadsStatusFilter}
          setStatusFilter={setContactLeadsStatusFilter}
          summary={contactLeadsSummary}
          lastRefreshedAt={contactLeadsLastRefreshedAt}
          refresh={() => {
            void loadContactLeads();
          }}
        />
      );
    }

    if (currentSection === 'settings') {
      return (
        <SettingsSection
          sectionError={sectionError}
          instantPublishingEnabled={instantPublishingEnabled}
          isHydratingBackend={isHydratingBackend}
          hydrateBackendFromLocalSnapshot={hydrateBackendFromLocalSnapshot}
          saveSettings={saveSettings}
          settingsHasUnsavedChanges={settingsHasUnsavedChanges}
          settingsSaving={settingsSaving}
          settingsValues={settingsValues}
          setSettingsValues={setSettingsValues}
          mediaFiles={mediaFiles}
          uploadFileToMediaLibrary={uploadFileToMediaLibrary}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#f5f9fa] flex">
      <aside
        className={`fixed left-0 top-0 h-full bg-white shadow-xl z-50 flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300`}
      >
        <div className="p-6 border-b border-[#eef3f5] flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-[#00b3e8] to-[#34c759] rounded-[10px] flex items-center justify-center">
                <span className="text-white font-['ABeeZee:Regular',sans-serif] text-[20px]">S</span>
              </div>
              <div>
                <h2 className="font-['ABeeZee:Regular',sans-serif] text-[18px] text-[#273a41]">SMOVE</h2>
                <p className="font-['Abhaya_Libre:Regular',sans-serif] text-[12px] text-[#9ba1a4]">CMS Admin</p>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-[#f5f9fa] rounded-[8px] transition-colors">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="p-6 border-b border-[#eef3f5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#00b3e8] to-[#34c759] rounded-full flex items-center justify-center">
              <span className="text-white font-['Abhaya_Libre:Bold',sans-serif] text-[16px]">{user?.name?.charAt(0) ?? 'A'}</span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-['Abhaya_Libre:Bold',sans-serif] text-[14px] text-[#273a41] truncate">{user?.name}</p>
                <p className="font-['Abhaya_Libre:Regular',sans-serif] text-[12px] text-[#9ba1a4] truncate">{user?.email}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                void handleSectionChange(item.id);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-[12px] transition-all ${
                currentSection === item.id ? 'bg-[#00b3e8] text-white' : 'text-[#273a41] hover:bg-[#f5f9fa]'
              }`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span className="font-['Abhaya_Libre:Regular',sans-serif] text-[16px]">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#eef3f5] bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="font-['Abhaya_Libre:Regular',sans-serif] text-[16px]">Déconnexion</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        <header className="bg-white border-b border-[#eef3f5] px-8 py-6 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-['Medula_One:Regular',sans-serif] text-[28px] tracking-[2.8px] uppercase text-[#273a41]">
                {menuItems.find((m) => m.id === currentSection)?.label || 'Dashboard'}
              </h1>
              <p className="font-['Abhaya_Libre:Regular',sans-serif] text-[14px] text-[#9ba1a4] mt-1">Bienvenue, {user?.name}</p>
            </div>
            <a
              href={getPublicSiteUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px] text-[#273a41] hover:bg-[#f5f9fa]"
            >
              <Eye size={15} /> Voir le site
            </a>
          </div>
        </header>

        <div className="p-8 space-y-6">
          {syncDiagnosticsWarning ? (
            <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-4 text-blue-800">
              <p className="font-['Abhaya_Libre:Bold',sans-serif] text-[14px]">Observabilité CMS/public</p>
              <p className="text-[13px]">{syncDiagnosticsWarning}</p>
            </div>
          ) : null}
          {feedback ? <AdminSuccessFeedback label={feedback} /> : null}
          {currentSection === 'overview' ? (
            <OverviewSection
              contentHealth={contentHealth}
              readinessSnapshot={readinessSnapshot}
              stats={stats}
              conversionMetrics={conversionMetrics}
              handleSectionChange={handleSectionChange}
            >
              <div className="bg-white rounded-[20px] p-6 shadow-sm">
                <h3 className="font-['Abhaya_Libre:Bold',sans-serif] text-[20px] text-[#273a41] mb-2">Activité récente</h3>
                <p className="text-[12px] text-[#6f7f85]">Source: timeline backend non encore connectée.</p>
                <div className="mt-4 rounded-[12px] border border-dashed border-[#d6e4ea] bg-[#f9fcfd] p-4 text-[13px] text-[#5e7077]">
                  Le flux d’activité est momentanément indisponible. Cette zone sera réactivée dès que la source d’événements CMS (sauvegardes, transitions, uploads, settings) sera branchée côté backend.
                </div>
              </div>
            </OverviewSection>
          ) : (
            <section
              key={currentSection}
              className="relative isolate min-h-[calc(100vh-12rem)] overflow-x-hidden"
              aria-live="polite"
            >
              {renderSectionContent()}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
