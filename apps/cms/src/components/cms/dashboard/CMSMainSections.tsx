import { Archive, Pencil, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useMemo, type ChangeEvent, type ReactNode } from 'react';
import type { BlogPost, MediaFile, Project, Service } from '../../../domain/contentSchemas';
import {
  AdminActionBar,
  AdminActionCluster,
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  ADMIN_FIELD_LABEL_CLASS,
  ADMIN_HELPER_TEXT_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_SECTION_SUBCARD,
  ADMIN_TEXTAREA_CLASS,
  AdminLoadingState,
  AdminPageHeader,
  AdminPanel,
  AdminStickyFormActions,
  AdminWarningState,
} from '../adminPrimitives';
import { toMediaReferenceValue } from '../../../features/media/assetReference';
import type { HomePageContentSettings } from '../../../data/pageContentSeed';
import { getMetadataCompleteness, summarizeReferences, type BackendMediaReference } from './mediaGovernance';
import { resolveCmsPreviewReference, resolveMediaLibraryThumbnail } from './mediaPreview';
import { assignHeroBackgroundMedia, handleAddHeroMediaClick } from './pageContentHeroActions';

const ROW_CONTAINER = 'rounded-[14px] border border-[#e4edf1] bg-[#fcfeff] px-4 py-3.5 shadow-[0_4px_14px_rgba(20,51,63,0.04)]';
const ROW_TITLE = "font-['Abhaya_Libre:Bold',sans-serif] text-[17px] text-[#273a41] leading-tight";
const ROW_META = "font-['Abhaya_Libre:Regular',sans-serif] text-[13px] text-[#688088]";
const ROW_ACTIONS = 'flex flex-wrap items-center justify-start gap-2 lg:justify-end';
const previewToneClass = (tone?: 'success' | 'warning' | 'neutral' | null): string => (
  tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-slate-100 text-slate-600'
);

function renderStatusChip(status: string) {
  const styles =
    status === 'published'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'in_review'
        ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
        : status === 'archived'
          ? 'border-slate-200 bg-slate-100 text-slate-600'
          : 'border-amber-200 bg-amber-50 text-amber-700';

  const label =
    status === 'published' ? 'Publié' : status === 'in_review' ? 'En revue' : status === 'archived' ? 'Archivé' : 'Brouillon';

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium ${styles}`}>{label}</span>;
}

interface ProjectsSectionProps {
  canEditContent: boolean;
  canDeleteContent: boolean;
  canPublishContent: boolean;
  projectsError: string;
  projectsLoading: boolean;
  projects: Project[];
  projectEditorMode: 'list' | 'create' | 'edit';
  renderProjectForm: () => ReactNode;
  startCreateProject: () => void;
  startEditProject: (project: Project) => void;
  transitionProjectStatus: (projectId: string, targetStatus: Project['status']) => Promise<void>;
  deleteProject: (projectId: string, title: string) => Promise<void>;
  loadProjectsFromBackend: () => Promise<void>;
}

export function ProjectsSection(props: ProjectsSectionProps) {
  const {
    canEditContent,
    canDeleteContent,
    canPublishContent,
    projectsError,
    projectsLoading,
    projects,
    projectEditorMode,
    renderProjectForm,
    startCreateProject,
    startEditProject,
    transitionProjectStatus,
    deleteProject,
    loadProjectsFromBackend,
  } = props;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gestion des projets"
        subtitle="Liste, édition et statut de vos projets portfolio."
        actions={
          <AdminButton onClick={startCreateProject} disabled={!canEditContent} intent="primary">
            Nouveau projet
          </AdminButton>
        }
      />

      {projectsError ? <AdminErrorState label={projectsError} /> : null}
      {projectEditorMode !== 'list' ? renderProjectForm() : null}

      <AdminPanel title={`Projets (${projects.length})`}>
        {projectsLoading ? <AdminLoadingState label="Chargement des projets..." /> : null}
        {!projectsLoading ? (
          <div className="mb-2 flex justify-end">
            <AdminButton type="button" onClick={() => void loadProjectsFromBackend()} size="sm">
              <RotateCcw size={15} /> Rafraîchir
            </AdminButton>
          </div>
        ) : null}
        {!projectsLoading && projects.length === 0 ? <AdminEmptyState label="Aucun projet trouvé. Créez votre premier projet pour commencer." /> : null}
        {!projectsLoading && projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.id} className={`${ROW_CONTAINER} grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_auto_minmax(280px,1fr)] lg:items-center`}>
                <div className="space-y-1">
                  <p className={ROW_TITLE}>{project.title}</p>
                  <p className={ROW_META}>{project.client} • {project.year} • {project.category}</p>
                </div>
                <div>{renderStatusChip(project.status)}</div>
                <div className={ROW_ACTIONS}>
                  <AdminActionCluster>
                    {project.status === 'draft' ? (<AdminButton onClick={() => void transitionProjectStatus(project.id, 'in_review')} disabled={!canEditContent} intent="workflow" size="sm">En revue</AdminButton>) : null}
                    {project.status === 'in_review' ? (<AdminButton onClick={() => void transitionProjectStatus(project.id, 'published')} disabled={!canPublishContent} intent="workflow" size="sm">Publier</AdminButton>) : null}
                    {project.status !== 'archived' ? (<AdminButton onClick={() => void transitionProjectStatus(project.id, 'archived')} disabled={!canPublishContent} size="sm"><Archive size={14} /> Archiver</AdminButton>) : null}
                  </AdminActionCluster>
                  <AdminActionCluster>
                    <AdminButton onClick={() => startEditProject(project)} size="sm"><Pencil size={15} /> Modifier</AdminButton>
                  </AdminActionCluster>
                  <AdminActionCluster danger>
                    <AdminButton onClick={() => void deleteProject(project.id, project.title)} disabled={!canDeleteContent} intent="danger" size="sm"><Trash2 size={15} /> Supprimer</AdminButton>
                  </AdminActionCluster>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </AdminPanel>
    </div>
  );
}

interface ServicesSectionProps {
  canEditContent: boolean;
  canDeleteContent: boolean;
  canPublishContent: boolean;
  servicesError: string;
  servicesLoading: boolean;
  services: Service[];
  serviceEditorMode: 'list' | 'create' | 'edit';
  renderServiceForm: () => ReactNode;
  startCreateService: () => void;
  startEditService: (service: Service) => void;
  transitionServiceStatus: (service: Service, targetStatus: Service['status']) => Promise<void>;
  deleteService: (serviceId: string, title: string) => Promise<void>;
  loadServicesFromBackend: () => Promise<void>;
}

export function ServicesSection({
  canEditContent,
  canDeleteContent,
  canPublishContent,
  servicesError,
  servicesLoading,
  services,
  serviceEditorMode,
  renderServiceForm,
  startCreateService,
  startEditService,
  transitionServiceStatus,
  deleteService,
  loadServicesFromBackend,
}: ServicesSectionProps) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gestion des services"
        subtitle="Liste, édition et publication de vos services."
        actions={<AdminButton onClick={startCreateService} disabled={!canEditContent} intent="primary">Nouveau service</AdminButton>}
      />

      {servicesError ? <AdminErrorState label={servicesError} /> : null}
      {serviceEditorMode !== 'list' ? renderServiceForm() : null}

      <AdminPanel title={`Services (${services.length})`}>
        {servicesLoading ? <AdminLoadingState label="Chargement des services…" /> : null}
        {!servicesLoading ? (
          <div className="mb-2 flex justify-end">
            <AdminButton type="button" onClick={() => void loadServicesFromBackend()} size="sm">
              <RotateCcw size={15} /> Rafraîchir
            </AdminButton>
          </div>
        ) : null}
        {!servicesLoading && services.length === 0 ? (
          <AdminEmptyState label="Aucun service trouvé. Créez votre premier service pour commencer." />
        ) : !servicesLoading ? (
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.id} className={`${ROW_CONTAINER} grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_auto_minmax(220px,1fr)] lg:items-center`}>
                <div className="space-y-1">
                  <p className={ROW_TITLE}>{service.title}</p>
                  <p className={ROW_META}>/{service.slug}</p>
                </div>
                <div>{renderStatusChip(service.status)}</div>
                <div className={ROW_ACTIONS}>
                  <AdminActionCluster>
                    {service.status === 'draft' ? (<AdminButton onClick={() => void transitionServiceStatus(service, 'published')} disabled={!canPublishContent} intent="workflow" size="sm">Publier</AdminButton>) : null}
                    {service.status === 'published' ? (<AdminButton onClick={() => void transitionServiceStatus(service, 'archived')} disabled={!canPublishContent} size="sm"><Archive size={14} /> Archiver</AdminButton>) : null}
                    {service.status === 'archived' ? (<AdminButton onClick={() => void transitionServiceStatus(service, 'draft')} disabled={!canEditContent} intent="workflow" size="sm">Repasser brouillon</AdminButton>) : null}
                  </AdminActionCluster>
                  <AdminActionCluster>
                    <AdminButton onClick={() => startEditService(service)} size="sm"><Pencil size={15} /> Modifier</AdminButton>
                  </AdminActionCluster>
                  <AdminActionCluster danger>
                    <AdminButton onClick={() => void deleteService(service.id, service.title)} disabled={!canDeleteContent} intent="danger" size="sm"><Trash2 size={15} /> Supprimer</AdminButton>
                  </AdminActionCluster>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </AdminPanel>
      {(!canDeleteContent || !canPublishContent) ? <AdminWarningState label={`${!canPublishContent ? 'Publication/archivage réservés aux éditeurs/administrateurs. ' : ''}Les suppressions définitives sont réservées au rôle administrateur.`} /> : null}
    </div>
  );
}

interface BlogSectionProps {
  canEditContent: boolean;
  canDeleteContent: boolean;
  canPublishContent: boolean;
  canReviewContent: boolean;
  postsError: string;
  postsLoading: boolean;
  posts: BlogPost[];
  blogEditorMode: 'list' | 'create' | 'edit';
  renderBlogForm: () => ReactNode;
  startCreatePost: () => void;
  retryLoadPosts: () => void;
  getStatusLabel: (status: BlogPost['status']) => string;
  transitionPostStatus: (post: BlogPost, nextStatus: BlogPost['status']) => Promise<void>;
  statusTransitioningPostId: string | null;
  instantPublishingEnabled: boolean;
  startEditPost: (post: BlogPost) => void;
  deletePost: (post: BlogPost) => Promise<void>;
  recentlyUpdatedCount: number;
}

export function BlogSection(props: BlogSectionProps) {
  const { canEditContent, canDeleteContent, canPublishContent, canReviewContent, postsError, postsLoading, posts, blogEditorMode, renderBlogForm, startCreatePost, retryLoadPosts, getStatusLabel, transitionPostStatus, statusTransitioningPostId, instantPublishingEnabled, startEditPost, deletePost, recentlyUpdatedCount } = props;
  return <div className="space-y-6">{/* intentionally compact - behavior preserved */}
    <AdminPageHeader title="Gestion du blog" subtitle="Liste, édition, validation et publication des articles." actions={<AdminButton onClick={startCreatePost} disabled={!canEditContent} intent="primary">Nouvel article</AdminButton>} />
    {postsError ? <AdminActionBar><AdminErrorState label={postsError} /><AdminButton onClick={retryLoadPosts}><RotateCcw size={15} /> Réessayer</AdminButton></AdminActionBar> : null}
    {postsLoading ? <AdminLoadingState label="Chargement des articles..." /> : null}
    {blogEditorMode !== 'list' ? renderBlogForm() : null}
    <AdminPanel title="Synthèse éditoriale"><div className="grid grid-cols-1 gap-3 md:grid-cols-5">{[['draft', 'Brouillons'], ['in_review', 'En revue'], ['published', 'Publiés'], ['archived', 'Archivés']].map(([status, label]) => (<div key={status} className="rounded-[14px] border border-[#e4edf1] bg-[#fcfeff] p-3.5"><p className="text-[12px] text-[#6f7f85]">{label}</p><p className="font-['Abhaya_Libre:Bold',sans-serif] text-[24px] text-[#273a41]">{posts.filter((post) => post.status === status).length}</p></div>))}<div className="rounded-[14px] border border-[#e4edf1] bg-[#fcfeff] p-3.5"><p className="text-[12px] text-[#6f7f85]">MAJ 7j</p><p className="font-['Abhaya_Libre:Bold',sans-serif] text-[24px] text-[#273a41]">{recentlyUpdatedCount}</p></div></div></AdminPanel>
    <AdminPanel title="Articles">{posts.length === 0 ? <AdminEmptyState label="Aucun article disponible." /> : <div className="space-y-3">{posts.map((post) => (<div key={post.id} className={`${ROW_CONTAINER} grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_auto_minmax(320px,1fr)] lg:items-center`}><div className="space-y-1"><p className={ROW_TITLE}>{post.title}</p><p className={ROW_META}>/{post.slug} • {getStatusLabel(post.status)}</p></div><div>{renderStatusChip(post.status)}</div><div className={ROW_ACTIONS}><AdminActionCluster>{post.status === 'draft' ? <AdminButton onClick={() => void transitionPostStatus(post, 'in_review')} disabled={statusTransitioningPostId === post.id || !canEditContent} intent="workflow" size="sm">Soumettre revue</AdminButton> : null}{post.status !== 'published' ? <AdminButton onClick={() => void transitionPostStatus(post, 'published')} disabled={statusTransitioningPostId === post.id || !canPublishContent || post.status === 'archived' || !instantPublishingEnabled} intent="workflow" size="sm">Publier</AdminButton> : <AdminButton onClick={() => void transitionPostStatus(post, 'draft')} disabled={statusTransitioningPostId === post.id || !canReviewContent} intent="workflow" size="sm">Dépublier</AdminButton>}{post.status !== 'archived' ? <AdminButton onClick={() => void transitionPostStatus(post, 'archived')} disabled={statusTransitioningPostId === post.id} size="sm"><Archive size={14} /> Archiver</AdminButton> : null}</AdminActionCluster><AdminActionCluster><AdminButton onClick={() => startEditPost(post)} size="sm"><Pencil size={15} /> Modifier</AdminButton></AdminActionCluster><AdminActionCluster danger><AdminButton onClick={() => void deletePost(post)} disabled={!canDeleteContent} intent="danger" size="sm" title={canDeleteContent ? 'Supprimer cet article' : 'Réservé aux administrateurs'}><Trash2 size={15} /> Supprimer</AdminButton></AdminActionCluster></div></div>))}</div>}</AdminPanel>
    {(!canDeleteContent || !canPublishContent) ? <AdminWarningState label={`${!canPublishContent ? 'Publication réservée aux éditeurs/administrateurs. ' : ''}Les suppressions définitives sont réservées au rôle administrateur.`} /> : null}
  </div>;
}

interface MediaSectionProps {
  mediaQuery: string;
  setMediaQuery: (value: string) => void;
  setSelectedMediaId: (value: string) => void;
  isUploadingMedia: boolean;
  handleMediaUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  canEditContent: boolean;
  mediaUploadError: string;
  filteredMediaFiles: MediaFile[];
  selectedMediaId: string;
  selectedMedia?: MediaFile;
  authoritativeReferences: BackendMediaReference[];
  authoritativeReferencesLoading: boolean;
  authoritativeReferencesError: string;
  localFallbackUsages: string[];
  canDeleteContent: boolean;
  deleteSelectedMedia: (references: BackendMediaReference[]) => void;
}

export function MediaSection({
  mediaQuery,
  setMediaQuery,
  setSelectedMediaId,
  isUploadingMedia,
  handleMediaUpload,
  canEditContent,
  mediaUploadError,
  filteredMediaFiles,
  selectedMediaId,
  selectedMedia,
  authoritativeReferences,
  authoritativeReferencesLoading,
  authoritativeReferencesError,
  localFallbackUsages,
  canDeleteContent,
  deleteSelectedMedia,
}: MediaSectionProps) {
  const selectedReferenceSummary = summarizeReferences(authoritativeReferences);
  const selectedMetadataCompleteness = selectedMedia ? getMetadataCompleteness(selectedMedia) : null;
  const selectedAssetPreview = selectedMedia
    ? resolveCmsPreviewReference(toMediaReferenceValue(selectedMedia.id), selectedMedia.alt || selectedMedia.name, selectedMedia.name)
    : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Médiathèque" subtitle="Fichiers validés et prêts à être utilisés dans le contenu CMS." />
      <AdminActionBar>
        <input value={mediaQuery} onChange={(event) => setMediaQuery(event.target.value)} placeholder="Rechercher un média (nom, alt, tag)…" className={`w-full max-w-[420px] ${ADMIN_INPUT_CLASS}`} />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#00b3e8] bg-[#00b3e8] px-4 py-2 text-[14px] text-white transition-colors hover:bg-[#009dcd]"><Upload size={14} /> {isUploadingMedia ? 'Upload…' : 'Uploader un fichier'}<input type="file" className="hidden" onChange={(event) => { void handleMediaUpload(event); }} disabled={!canEditContent || isUploadingMedia} /></label>
        <AdminButton type="button" onClick={() => { setMediaQuery(''); setSelectedMediaId(''); }}>Réinitialiser</AdminButton>
      </AdminActionBar>
      {mediaUploadError ? <AdminErrorState label={mediaUploadError} /> : null}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]"><AdminPanel title="Ressources médias">{filteredMediaFiles.length === 0 ? <AdminEmptyState label="Aucun média correspondant. Ajoutez des ressources ou modifiez la recherche." /> : <div className="grid gap-3 md:grid-cols-2">{filteredMediaFiles.map((file) => { const thumb = resolveMediaLibraryThumbnail(file); return (<button type="button" key={file.id} onClick={() => setSelectedMediaId(file.id)} className={`rounded-[14px] border p-3 text-left transition ${selectedMediaId === file.id ? 'border-[#00b3e8] bg-[#f0fbff] shadow-[0_0_0_1px_rgba(0,179,232,0.15)]' : 'border-[#e4edf1] bg-[#fcfeff] hover:border-[#d6e4ea]'}`}><div className="mb-2 overflow-hidden rounded-[10px] border border-[#e5edf1] bg-[#f5f9fa]">{thumb.kind === 'image' && thumb.src ? <img src={thumb.src} alt={file.alt || file.name} className="h-[124px] w-full object-cover" loading="lazy" /> : <div className="flex h-[124px] items-center justify-center text-[12px] text-[#6f7f85]">{thumb.kind === 'missing' ? 'Image non résolue' : file.type === 'video' ? 'Aperçu vidéo' : 'Fichier document'}</div>}</div><div className="space-y-1"><p className="font-['Abhaya_Libre:Bold',sans-serif] text-[#273a41]">{file.label || file.name}</p><p className="font-['Abhaya_Libre:Regular',sans-serif] text-[13px] text-[#6f7f85]">{file.type} • {Math.round(file.size / 1024)} KB</p><p className="text-[12px] text-[#8a969b]">{file.alt || 'alt non renseigné'}</p></div></button>); })}</div>}</AdminPanel><AdminPanel title="Détails du média">{!selectedMedia ? <AdminEmptyState label="Sélectionnez une ressource pour inspecter et gouverner cet asset." /> : <div className="space-y-4 text-[14px] text-[#4b5a60]"><div className={ADMIN_SECTION_SUBCARD}><div className="mb-2 flex items-center justify-between gap-2"><p className="text-[13px] font-semibold text-[#273a41]">Aperçu asset</p>{selectedAssetPreview ? <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${previewToneClass(selectedAssetPreview.statusTone)}`}>{selectedAssetPreview.statusLabel}</span> : null}</div><div className="overflow-hidden rounded-[10px] border border-[#e4edf1] bg-[#f5f9fa]">{selectedAssetPreview?.state === 'resolvable' ? <img src={selectedAssetPreview.src} alt={selectedAssetPreview.alt} className="h-[180px] w-full object-cover" loading="lazy" /> : <div className="flex h-[180px] items-center justify-center px-4 text-center text-[12px] text-[#6f7f85]">Prévisualisation non résolue. Vérifiez la disponibilité du média.</div>}</div><p className="mt-2 text-[12px] text-[#5f7178]">{selectedAssetPreview?.sourceLabel} · {selectedAssetPreview?.reference || 'Aucune référence'}</p></div><div className={ADMIN_SECTION_SUBCARD}><p className="mb-2 text-[13px] font-semibold text-[#273a41]">Métadonnées</p><p><span className={ADMIN_FIELD_LABEL_CLASS}>ID:</span> {selectedMedia.id}</p><p><span className={ADMIN_FIELD_LABEL_CLASS}>Source:</span> {selectedMedia.source || 'local-storage'}</p><p><span className={ADMIN_FIELD_LABEL_CLASS}>Titre:</span> {selectedMedia.title || selectedMedia.name}</p><p><span className={ADMIN_FIELD_LABEL_CLASS}>Créé:</span> {selectedMedia.createdAt || selectedMedia.uploadedDate}</p><p><span className={ADMIN_FIELD_LABEL_CLASS}>Mis à jour:</span> {selectedMedia.updatedAt || selectedMedia.uploadedDate}</p><p><span className={ADMIN_FIELD_LABEL_CLASS}>Référence:</span> <code className="rounded bg-[#f5f9fa] px-2 py-1 text-[12px]">{toMediaReferenceValue(selectedMedia.id)}</code></p></div><div className={ADMIN_SECTION_SUBCARD}><p className="mb-2 text-[13px] font-semibold text-[#273a41]">Gouvernance • Où utilisé (source serveur)</p>{authoritativeReferencesLoading ? <p className="text-[12px] text-[#6f7f85]">Analyse des références actives…</p> : null}{authoritativeReferencesError ? <p className="text-[12px] text-amber-700">{authoritativeReferencesError}</p> : null}{!authoritativeReferencesLoading ? <p className="text-[12px] text-[#5e7077]">{selectedReferenceSummary.total === 0 ? 'Aucune référence active détectée par le graphe backend.' : `${selectedReferenceSummary.total} référence(s) active(s) détectée(s).`}</p> : null}{selectedReferenceSummary.byDomain.length > 0 ? <ul className="mt-2 space-y-1 text-[12px] text-[#4b5a60]">{selectedReferenceSummary.byDomain.map((domain) => (<li key={domain.domain}>• {domain.label}: {domain.count}</li>))}</ul> : null}{selectedReferenceSummary.sample.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-[#5b6a70]">{selectedReferenceSummary.sample.map((usage) => (<li key={usage}>{usage}</li>))}</ul> : null}{!authoritativeReferencesLoading && authoritativeReferences.length === 0 && localFallbackUsages.length > 0 ? <p className="mt-2 text-[12px] text-amber-700">Indice local non-bloquant: {localFallbackUsages.slice(0, 3).join(' | ')}</p> : null}</div><div className={ADMIN_SECTION_SUBCARD}><p className="mb-2 text-[13px] font-semibold text-[#273a41]">Complétude métadonnées</p>{selectedMetadataCompleteness ? <ul className="space-y-1 text-[12px]"><li>Alt: {selectedMetadataCompleteness.alt ? 'présent' : 'manquant'}</li><li>Caption: {selectedMetadataCompleteness.caption ? 'présente' : 'manquante'}</li><li>Tags: {selectedMetadataCompleteness.tags ? 'présents' : 'manquants'}</li></ul> : null}</div><div className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-3 text-[12px] text-rose-800"><p className="mb-2 font-semibold">Danger zone</p><p>Action d’archivage protégée: impossible si des références actives existent.</p><p className="mt-1">{selectedReferenceSummary.total > 0 ? 'État actuel: archivage bloqué (références actives).' : 'État actuel: archivage autorisé (aucune référence active).'}</p><AdminActionCluster danger><AdminButton type="button" onClick={() => deleteSelectedMedia(authoritativeReferences)} disabled={!canDeleteContent || authoritativeReferencesLoading} intent="danger" size="sm">Archiver ce média</AdminButton></AdminActionCluster></div></div>}</AdminPanel></div>
    </div>
  );
}

interface PageContentSectionProps {
  homeContentError: string;
  saveHomePageContent: () => void;
  homeContentSaving: boolean;
  hasUnsavedChanges: boolean;
  canEditContent: boolean;
  resetHomePageContent: () => void;
  openMediaLibrary: () => void;
  heroMediaUploadError: string;
  heroMediaUploadTarget: string | null;
  uploadHeroBackgroundMedia: (itemId: string, field: 'media' | 'desktopMedia' | 'tabletMedia' | 'mobileMedia' | 'videoMedia', event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  homeContentForm: HomePageContentSettings;
  setHomeContentForm: (updater: (prev: HomePageContentSettings) => HomePageContentSettings) => void;
  mediaFiles: MediaFile[];
}

export function PageContentSection({
  homeContentError,
  saveHomePageContent,
  homeContentSaving,
  hasUnsavedChanges,
  canEditContent,
  resetHomePageContent,
  openMediaLibrary,
  heroMediaUploadError,
  heroMediaUploadTarget,
  uploadHeroBackgroundMedia,
  homeContentForm,
  setHomeContentForm,
  mediaFiles,
}: PageContentSectionProps) {
  const imageMediaOptions = useMemo(() => mediaFiles.filter((file) => file.type === 'image'), [mediaFiles]);
  const videoMediaOptions = useMemo(() => mediaFiles.filter((file) => file.type === 'video'), [mediaFiles]);
  const documentMediaOptions = useMemo(() => mediaFiles.filter((file) => file.type === 'document'), [mediaFiles]);
  const heroBackgroundItems = useMemo(() => (Array.isArray(homeContentForm.heroBackgroundItems) ? homeContentForm.heroBackgroundItems : []), [homeContentForm.heroBackgroundItems]);
  const imageMediaReferenceSet = useMemo(() => new Set(imageMediaOptions.map((file) => toMediaReferenceValue(file.id))), [imageMediaOptions]);
  const videoMediaReferenceSet = useMemo(() => new Set(videoMediaOptions.map((file) => toMediaReferenceValue(file.id))), [videoMediaOptions]);
  const documentMediaReferenceSet = useMemo(() => new Set(documentMediaOptions.map((file) => toMediaReferenceValue(file.id))), [documentMediaOptions]);
  const unresolvedHeroMediaCount = useMemo(
    () =>
      heroBackgroundItems.reduce((count, item) => {
        const preview = resolveCmsPreviewReference(item.desktopMedia || item.media, item.alt || item.label || 'Hero background', item.label || 'Hero background');
        return preview.state === 'resolvable' ? count : count + 1;
      }, 0),
    [heroBackgroundItems],
  );
  const configuredHeroMediaCount = heroBackgroundItems.length - unresolvedHeroMediaCount;
  const heroRotationSummary = homeContentForm.heroBackgroundRotationEnabled && heroBackgroundItems.length > 1
    ? `Rotation active • ${homeContentForm.heroBackgroundAutoplay ? 'Autoplay on' : 'Autoplay off'}`
    : 'Rotation inactive';
  const sections = [
    { id: 'hero', title: 'Hero', description: 'Contenu de première impression visible au chargement.' },
    { id: 'about', title: 'À propos & services', description: 'Storytelling, promesse et image de marque.' },
    { id: 'highlights', title: 'Projets, blog, contact', description: 'Blocs de conversion et de navigation éditoriale.' },
  ] as const;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Contenus pages" subtitle="Édition structurée de la homepage publique: section par section, avec sauvegarde fiable." />
      {homeContentError ? <AdminErrorState label={homeContentError} /> : null}
      <AdminStickyFormActions>
        <AdminActionCluster>
          <AdminButton type="button" onClick={resetHomePageContent}>Annuler / Recharger</AdminButton>
        </AdminActionCluster>
        <AdminActionCluster>
          {hasUnsavedChanges ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[12px] text-amber-800">Modifié • non sauvegardé</span> : <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[12px] text-emerald-800">Synchronisé</span>}
          <AdminButton type="button" onClick={saveHomePageContent} disabled={homeContentSaving || !canEditContent} intent="primary">{homeContentSaving ? 'Sauvegarde…' : 'Enregistrer'}</AdminButton>
        </AdminActionCluster>
      </AdminStickyFormActions>
      <p className={ADMIN_HELPER_TEXT_CLASS}>Les liens CTA acceptent <code>#ancre</code>, <code>/route</code> ou <code>https://</code>. Les changements sont envoyés vers l’API CMS au moment de l’enregistrement.</p>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-[14px] border border-[#e4edf1] bg-white p-3 space-y-2 h-fit sticky top-24">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="block rounded-[10px] border border-[#e9f0f3] bg-[#fbfdfe] px-3 py-2 hover:border-[#cfe2ea]">
              <p className="text-[13px] font-semibold text-[#273a41]">{section.title}</p>
              <p className="text-[11px] text-[#6f7f85]">{section.description}</p>
            </a>
          ))}
        </aside>
        <div className="space-y-4">
          <AdminPanel title="Hero">
            <div id="hero" className="space-y-3">
              <p className={ADMIN_HELPER_TEXT_CLASS}>Section d’accueil (titre principal, promesse, CTA).</p>
              <div className="grid gap-3 md:grid-cols-2">
                <input value={homeContentForm.heroBadge} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBadge: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="Badge hero (ex: Studio digital)" />
                <input value={homeContentForm.heroTitleLine1} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroTitleLine1: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="Titre ligne 1 (hero)" />
                <input value={homeContentForm.heroTitleLine2} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroTitleLine2: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="Titre ligne 2 (hero)" />
                <input value={homeContentForm.heroPrimaryCtaLabel} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroPrimaryCtaLabel: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="CTA principal (label)" />
                <input value={homeContentForm.heroPrimaryCtaHref} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroPrimaryCtaHref: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="CTA principal (lien)" />
                <input value={homeContentForm.heroSecondaryCtaLabel} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroSecondaryCtaLabel: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="CTA secondaire (label)" />
                <input value={homeContentForm.heroSecondaryCtaHref} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroSecondaryCtaHref: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="CTA secondaire (lien)" />
                <textarea value={homeContentForm.heroDescription} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroDescription: event.target.value }))} className={`${ADMIN_TEXTAREA_CLASS} md:col-span-2`} placeholder="Description hero (paragraphe introductif)" />
              </div>
              <div className={ADMIN_SECTION_SUBCARD}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold text-[#273a41]">Background media (CMS)</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminButton
                      type="button"
                      size="sm"
                      data-testid="hero-add-media-button"
                      onClick={(event) => {
                        setHomeContentForm((prev) => handleAddHeroMediaClick(event, prev));
                      }}
                    >
                      Ajouter une diapositive
                    </AdminButton>
                    <AdminButton type="button" size="sm" data-testid="hero-open-media-library-button" onClick={openMediaLibrary}>
                      Ouvrir la médiathèque CMS
                    </AdminButton>
                    <AdminButton type="button" size="sm" onClick={() => { window.open('/', '_blank', 'noopener,noreferrer'); }}>
                      Prévisualiser le site
                    </AdminButton>
                  </div>
                </div>
                <p className={ADMIN_HELPER_TEXT_CLASS}>
                  Workflow recommandé : 1) ajouter une slide, 2) choisir un média depuis la médiathèque ou uploader, 3) régler responsive/overlay, 4) enregistrer.
                </p>
                <div className="mt-2 grid gap-2 md:grid-cols-4">
                  <div className="rounded-[10px] border border-[#d8e7ee] bg-[#f5fbfe] px-3 py-2">
                    <p className="text-[11px] text-[#5f7178]">Slides configurées</p>
                    <p className="text-[13px] font-semibold text-[#225062]">{heroBackgroundItems.length}</p>
                  </div>
                  <div className="rounded-[10px] border border-[#d8e7ee] bg-[#f5fbfe] px-3 py-2">
                    <p className="text-[11px] text-[#5f7178]">Médias résolus</p>
                    <p className="text-[13px] font-semibold text-[#225062]">{configuredHeroMediaCount}</p>
                  </div>
                  <div className="rounded-[10px] border border-[#d8e7ee] bg-[#f5fbfe] px-3 py-2">
                    <p className="text-[11px] text-[#5f7178]">Transition / intervalle</p>
                    <p className="text-[13px] font-semibold text-[#225062]">{homeContentForm.heroBackgroundTransitionStyle} • {homeContentForm.heroBackgroundIntervalMs}ms</p>
                  </div>
                  <div className="rounded-[10px] border border-[#d8e7ee] bg-[#f5fbfe] px-3 py-2">
                    <p className="text-[11px] text-[#5f7178]">Rotation</p>
                    <p className="text-[13px] font-semibold text-[#225062]">{heroRotationSummary}</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="inline-flex items-center gap-2 text-[13px] text-[#3c4f56]">
                    <input type="checkbox" checked={homeContentForm.heroBackgroundRotationEnabled} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundRotationEnabled: event.target.checked }))} />
                    Rotation activée
                  </label>
                  <label className="inline-flex items-center gap-2 text-[13px] text-[#3c4f56]">
                    <input type="checkbox" checked={homeContentForm.heroBackgroundAutoplay} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundAutoplay: event.target.checked }))} />
                    Autoplay
                  </label>
                  <label className="space-y-1">
                    <span className={ADMIN_FIELD_LABEL_CLASS}>Intervalle (ms)</span>
                    <input type="number" min={2000} max={30000} step={500} value={homeContentForm.heroBackgroundIntervalMs} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundIntervalMs: Number(event.target.value) || 6000 }))} className={ADMIN_INPUT_CLASS} />
                  </label>
                  <label className="space-y-1">
                    <span className={ADMIN_FIELD_LABEL_CLASS}>Transition</span>
                    <select value={homeContentForm.heroBackgroundTransitionStyle} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundTransitionStyle: event.target.value === 'slide' ? 'slide' : 'fade' }))} className={ADMIN_INPUT_CLASS}>
                      <option value="fade">Fade premium</option>
                      <option value="slide">Slide latéral</option>
                    </select>
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className={ADMIN_FIELD_LABEL_CLASS}>Overlay global ({homeContentForm.heroBackgroundOverlayOpacity.toFixed(2)})</span>
                    <input type="range" min={0.1} max={0.9} step={0.05} value={homeContentForm.heroBackgroundOverlayOpacity} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundOverlayOpacity: Number(event.target.value) }))} className="w-full accent-[#00b3e8]" />
                  </label>
                  <label className="inline-flex items-center gap-2 text-[13px] text-[#3c4f56]">
                    <input type="checkbox" checked={homeContentForm.heroBackgroundEnable3DEffects} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundEnable3DEffects: event.target.checked }))} />
                    Effets 3D globaux activés
                  </label>
                  <label className="inline-flex items-center gap-2 text-[13px] text-[#3c4f56]">
                    <input type="checkbox" checked={homeContentForm.heroBackgroundEnableParallax} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundEnableParallax: event.target.checked }))} />
                    Parallax global activé
                  </label>
                </div>

                <div className="mt-3 space-y-3">
                  {heroMediaUploadError ? <AdminWarningState label={heroMediaUploadError} /> : null}
                  {unresolvedHeroMediaCount > 0 ? <AdminWarningState label={`${unresolvedHeroMediaCount} slide(s) utilisent un média non résolu. Corrigez avant publication.`} /> : null}
                  {heroBackgroundItems.length === 0 ? <p className={ADMIN_HELPER_TEXT_CLASS}>Aucun média configuré: le hero utilise son fond premium par défaut.</p> : null}
                  {heroBackgroundItems.map((item, index) => (
                    <div key={item.id} className="rounded-[12px] border border-[#dbe7ec] bg-white p-3 shadow-[0_8px_22px_rgba(12,42,60,0.06)]">
                      {(() => {
                        const preview = resolveCmsPreviewReference(item.desktopMedia || item.media, item.alt || `Hero slide ${index + 1}`, `Hero slide ${index + 1}`);
                        return (
                          <div className="mb-3 rounded-[10px] border border-[#e4edf1] bg-[#f8fbfd] p-2.5">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-[12px] font-semibold text-[#273a41]">Aperçu rendu public (desktop)</p>
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${previewToneClass(preview.statusTone)}`}>{preview.statusLabel}</span>
                            </div>
                            {preview.state === 'resolvable' ? (
                              <img src={preview.src} alt={preview.alt} className="h-[140px] w-full rounded-[8px] border border-[#e4edf1] object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-[140px] items-center justify-center rounded-[8px] border border-dashed border-amber-300 bg-amber-50 px-3 text-center text-[12px] text-amber-800">
                                Média non résolu: cette slide risque de ne pas apparaître sur le site public.
                              </div>
                            )}
                            <p className="mt-2 text-[11px] text-[#5f7178]">{preview.sourceLabel} · {preview.reference || 'Aucune référence'}</p>
                          </div>
                        );
                      })()}
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-[#273a41]">Slide {index + 1} {item.label?.trim() ? `• ${item.label.trim()}` : ''}</p>
                        <div className="flex gap-2">
                          <AdminButton type="button" size="sm" disabled={index === 0} onClick={() => setHomeContentForm((prev) => {
                            const items = [...prev.heroBackgroundItems];
                            [items[index - 1], items[index]] = [items[index], items[index - 1]];
                            return { ...prev, heroBackgroundItems: items.map((entry, position) => ({ ...entry, sortOrder: position })) };
                          })}>Monter</AdminButton>
                          <AdminButton type="button" size="sm" disabled={index === heroBackgroundItems.length - 1} onClick={() => setHomeContentForm((prev) => {
                            const items = [...prev.heroBackgroundItems];
                            [items[index + 1], items[index]] = [items[index], items[index + 1]];
                            return { ...prev, heroBackgroundItems: items.map((entry, position) => ({ ...entry, sortOrder: position })) };
                          })}>Descendre</AdminButton>
                          <AdminButton type="button" size="sm" onClick={() => setHomeContentForm((prev) => {
                            const duplicate = { ...item, id: `${item.id}-copy-${Date.now()}` };
                            const items = [...prev.heroBackgroundItems];
                            items.splice(index + 1, 0, duplicate);
                            return { ...prev, heroBackgroundItems: items.map((entry, position) => ({ ...entry, sortOrder: position })), heroBackgroundRotationEnabled: items.length > 1 ? true : prev.heroBackgroundRotationEnabled };
                          })}>Dupliquer</AdminButton>
                          <AdminButton type="button" size="sm" intent="danger" onClick={() => setHomeContentForm((prev) => ({ ...prev, heroBackgroundItems: prev.heroBackgroundItems.filter((entry) => entry.id !== item.id).map((entry, position) => ({ ...entry, sortOrder: position })) }))}>Supprimer</AdminButton>
                        </div>
                      </div>
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="rounded-full border border-[#dce8ed] bg-[#f7fbfd] px-2 py-0.5 text-[#48606a]">Desktop: {item.desktopMedia || item.media || 'auto'}</span>
                        <span className="rounded-full border border-[#dce8ed] bg-[#f7fbfd] px-2 py-0.5 text-[#48606a]">Tablet: {item.tabletMedia || item.desktopMedia || item.media || 'auto'}</span>
                        <span className="rounded-full border border-[#dce8ed] bg-[#f7fbfd] px-2 py-0.5 text-[#48606a]">Mobile: {item.mobileMedia || item.tabletMedia || item.desktopMedia || item.media || 'auto'}</span>
                        {item.videoMedia ? <span className="rounded-full border border-[#dce8ed] bg-[#f7fbfd] px-2 py-0.5 text-[#48606a]">Video: {item.videoMedia}</span> : null}
                      </div>
                      <div className="mb-2 rounded-[10px] border border-[#e4edf1] bg-[#f9fcfe] p-2.5">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#55727d]">Contenu de slide</p>
                        <div className="grid gap-2 md:grid-cols-2">
                        <input value={item.label} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundItems: prev.heroBackgroundItems.map((entry) => (entry.id === item.id ? { ...entry, label: event.target.value } : entry)) }))} className={ADMIN_INPUT_CLASS} placeholder="Label interne (optionnel)" />
                        <input value={item.title} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundItems: prev.heroBackgroundItems.map((entry) => (entry.id === item.id ? { ...entry, title: event.target.value } : entry)) }))} className={ADMIN_INPUT_CLASS} placeholder="Titre de la diapositive (optionnel)" />
                        <textarea value={item.description} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundItems: prev.heroBackgroundItems.map((entry) => (entry.id === item.id ? { ...entry, description: event.target.value } : entry)) }))} className={`${ADMIN_TEXTAREA_CLASS} md:col-span-2`} placeholder="Description de la diapositive (optionnel)" />
                        <input value={item.ctaLabel} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundItems: prev.heroBackgroundItems.map((entry) => (entry.id === item.id ? { ...entry, ctaLabel: event.target.value } : entry)) }))} className={ADMIN_INPUT_CLASS} placeholder="CTA slide (label, optionnel)" />
                        <input value={item.ctaHref} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundItems: prev.heroBackgroundItems.map((entry) => (entry.id === item.id ? { ...entry, ctaHref: event.target.value } : entry)) }))} className={ADMIN_INPUT_CLASS} placeholder="CTA slide (lien #ancre, /route ou https://)" />
                        <select value={item.type} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundItems: prev.heroBackgroundItems.map((entry) => (entry.id === item.id ? { ...entry, type: event.target.value === 'video' ? 'video' : 'image' } : entry)) }))} className={ADMIN_INPUT_CLASS}>
                          <option value="image">Image</option>
                          <option value="video">Vidéo (optionnel)</option>
                        </select>
                        </div>
                      </div>
                      <div className="rounded-[10px] border border-[#e4edf1] bg-[#f9fcfe] p-2.5">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#55727d]">Médias & responsive</p>
                        <div className="grid gap-2 md:grid-cols-2">
                        <select value={item.media} onChange={(event) => setHomeContentForm((prev) => assignHeroBackgroundMedia(prev, item.id, 'media', event.target.value))} className={ADMIN_INPUT_CLASS}>
                          <option value="">Image principale (required)</option>
                          {!item.media || imageMediaReferenceSet.has(item.media) ? null : (
                            <option value={item.media}>Référence actuelle (introuvable): {item.media}</option>
                          )}
                          {imageMediaOptions.map((file) => (<option key={file.id} value={toMediaReferenceValue(file.id)}>{file.label || file.name}</option>))}
                        </select>
                        {documentMediaReferenceSet.has(item.media) ? (
                          <p className={`${ADMIN_HELPER_TEXT_CLASS} md:col-span-2 text-amber-700`}>
                            Document détecté sur média principal: il sera ignoré côté site pour le fond hero. Utilisez une image ou une vidéo.
                          </p>
                        ) : null}
                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#00b3e8] bg-[#f0fbff] px-3 py-2 text-[13px] text-[#006b89] transition-colors hover:bg-[#dff6ff]">
                          Upload image principale
                          <input type="file" accept="image/*" className="hidden" onChange={(event) => { void uploadHeroBackgroundMedia(item.id, 'media', event); }} />
                        </label>
                        <select value={item.desktopMedia} onChange={(event) => setHomeContentForm((prev) => assignHeroBackgroundMedia(prev, item.id, 'desktopMedia', event.target.value))} className={ADMIN_INPUT_CLASS}>
                          <option value="">Desktop override (&gt;=1024)</option>
                          {!item.desktopMedia || imageMediaReferenceSet.has(item.desktopMedia) ? null : (
                            <option value={item.desktopMedia}>Référence actuelle (introuvable): {item.desktopMedia}</option>
                          )}
                          {imageMediaOptions.map((file) => (<option key={file.id} value={toMediaReferenceValue(file.id)}>{file.label || file.name}</option>))}
                        </select>
                        <select value={item.tabletMedia} onChange={(event) => setHomeContentForm((prev) => assignHeroBackgroundMedia(prev, item.id, 'tabletMedia', event.target.value))} className={ADMIN_INPUT_CLASS}>
                          <option value="">Tablet override (768-1023)</option>
                          {!item.tabletMedia || imageMediaReferenceSet.has(item.tabletMedia) ? null : (
                            <option value={item.tabletMedia}>Référence actuelle (introuvable): {item.tabletMedia}</option>
                          )}
                          {imageMediaOptions.map((file) => (<option key={file.id} value={toMediaReferenceValue(file.id)}>{file.label || file.name}</option>))}
                        </select>
                        <select value={item.mobileMedia} onChange={(event) => setHomeContentForm((prev) => assignHeroBackgroundMedia(prev, item.id, 'mobileMedia', event.target.value))} className={ADMIN_INPUT_CLASS}>
                          <option value="">Mobile override (&lt;768)</option>
                          {!item.mobileMedia || imageMediaReferenceSet.has(item.mobileMedia) ? null : (
                            <option value={item.mobileMedia}>Référence actuelle (introuvable): {item.mobileMedia}</option>
                          )}
                          {imageMediaOptions.map((file) => (<option key={file.id} value={toMediaReferenceValue(file.id)}>{file.label || file.name}</option>))}
                        </select>
                        <select value={item.videoMedia} onChange={(event) => setHomeContentForm((prev) => assignHeroBackgroundMedia(prev, item.id, 'videoMedia', event.target.value))} className={ADMIN_INPUT_CLASS}>
                          <option value="">Video source (optional)</option>
                          {!item.videoMedia || videoMediaReferenceSet.has(item.videoMedia) ? null : (
                            <option value={item.videoMedia}>Référence actuelle (introuvable): {item.videoMedia}</option>
                          )}
                          {videoMediaOptions.map((file) => (<option key={file.id} value={toMediaReferenceValue(file.id)}>{file.label || file.name}</option>))}
                        </select>
                        </div>
                      </div>
                      <div className="mt-2 rounded-[10px] border border-[#e4edf1] bg-[#f9fcfe] p-2.5">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#55727d]">Overlay, position et effets</p>
                        <div className="grid gap-2 md:grid-cols-2">
                        <input value={item.alt} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundItems: prev.heroBackgroundItems.map((entry) => (entry.id === item.id ? { ...entry, alt: event.target.value } : entry)) }))} className={ADMIN_INPUT_CLASS} placeholder="Alt (optionnel)" />
                        <input value={item.position} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundItems: prev.heroBackgroundItems.map((entry) => (entry.id === item.id ? { ...entry, position: event.target.value } : entry)) }))} className={ADMIN_INPUT_CLASS} placeholder="Position (center, top, 65% 30%)" />
                        <select value={item.size} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundItems: prev.heroBackgroundItems.map((entry) => (entry.id === item.id ? { ...entry, size: event.target.value === 'contain' ? 'contain' : 'cover' } : entry)) }))} className={ADMIN_INPUT_CLASS}>
                          <option value="cover">Cover</option>
                          <option value="contain">Contain</option>
                        </select>
                        <input value={item.overlayColor} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundItems: prev.heroBackgroundItems.map((entry) => (entry.id === item.id ? { ...entry, overlayColor: event.target.value } : entry)) }))} className={ADMIN_INPUT_CLASS} placeholder="Couleur overlay (#04111f)" />
                        <label className="space-y-1 md:col-span-2">
                          <span className={ADMIN_FIELD_LABEL_CLASS}>Overlay slide ({item.overlayOpacity.toFixed(2)})</span>
                          <input type="range" min={0} max={0.9} step={0.05} value={item.overlayOpacity} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundItems: prev.heroBackgroundItems.map((entry) => (entry.id === item.id ? { ...entry, overlayOpacity: Number(event.target.value) } : entry)) }))} className="w-full accent-[#00b3e8]" />
                        </label>
                        <label className="inline-flex items-center gap-2 text-[13px] text-[#3c4f56]">
                          <input type="checkbox" checked={item.enable3DEffects} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundItems: prev.heroBackgroundItems.map((entry) => (entry.id === item.id ? { ...entry, enable3DEffects: event.target.checked } : entry)) }))} />
                          Effets 3D pour cette slide
                        </label>
                        <label className="inline-flex items-center gap-2 text-[13px] text-[#3c4f56]">
                          <input type="checkbox" checked={item.enableParallax} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, heroBackgroundItems: prev.heroBackgroundItems.map((entry) => (entry.id === item.id ? { ...entry, enableParallax: event.target.checked } : entry)) }))} />
                          Parallax pour cette slide
                        </label>
                        <p className={`${ADMIN_HELPER_TEXT_CLASS} md:col-span-2`}>
                          Recommandé: Desktop 2400×1400, Tablet 1600×1000, Mobile 1080×1600, format WebP.
                        </p>
                        {heroMediaUploadTarget === item.id ? <p className={ADMIN_HELPER_TEXT_CLASS}>Upload en cours… l’image sera ajoutée à la médiathèque puis liée automatiquement.</p> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AdminPanel>
          <AdminPanel title="À propos & services">
            <div id="about" className="space-y-3">
              <p className={ADMIN_HELPER_TEXT_CLASS}>Section storytelling + crédibilité de marque (texte et visuel).</p>
              <div className="grid gap-3 md:grid-cols-2">
                <input value={homeContentForm.servicesIntroTitle} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, servicesIntroTitle: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="Titre section services" />
                <input value={homeContentForm.servicesIntroSubtitle} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, servicesIntroSubtitle: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="Sous-titre services" />
                <input value={homeContentForm.aboutBadge} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, aboutBadge: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="Badge à propos" />
                <input value={homeContentForm.aboutTitle} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, aboutTitle: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="Titre à propos" />
                <textarea value={homeContentForm.aboutParagraphOne} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, aboutParagraphOne: event.target.value }))} className={`${ADMIN_TEXTAREA_CLASS} md:col-span-2`} placeholder="Paragraphe 1" />
                <textarea value={homeContentForm.aboutParagraphTwo} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, aboutParagraphTwo: event.target.value }))} className={`${ADMIN_TEXTAREA_CLASS} md:col-span-2`} placeholder="Paragraphe 2" />
                <input value={homeContentForm.aboutCtaLabel} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, aboutCtaLabel: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="CTA à propos (label)" />
                <input value={homeContentForm.aboutCtaHref} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, aboutCtaHref: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="CTA à propos (lien)" />
                <select value={homeContentForm.aboutImage} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, aboutImage: event.target.value }))} className={`${ADMIN_INPUT_CLASS} md:col-span-2`}>
                  <option value="">Image about par défaut</option>
                  {mediaFiles.map((file) => (<option key={file.id} value={toMediaReferenceValue(file.id)}>{file.label || file.name}</option>))}
                </select>
              </div>
            </div>
          </AdminPanel>
          <AdminPanel title="Projets, blog, contact">
            <div id="highlights" className="space-y-4">
              <div className={ADMIN_SECTION_SUBCARD}>
                <p className="mb-2 text-[13px] font-semibold text-[#273a41]">Bloc Projets (portfolio)</p>
                <div className="grid gap-3 md:grid-cols-2"><input value={homeContentForm.portfolioBadge} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, portfolioBadge: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="Badge portfolio (au-dessus du titre)" /><input value={homeContentForm.portfolioTitle} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, portfolioTitle: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="Titre portfolio" /><textarea value={homeContentForm.portfolioSubtitle} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, portfolioSubtitle: event.target.value }))} className={`${ADMIN_TEXTAREA_CLASS} min-h-[70px] md:col-span-2`} placeholder="Sous-titre portfolio" /><input value={homeContentForm.portfolioCtaLabel} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, portfolioCtaLabel: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="CTA projets (label)" /><input value={homeContentForm.portfolioCtaHref} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, portfolioCtaHref: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="CTA projets (lien)" /></div>
              </div>
              <div className={ADMIN_SECTION_SUBCARD}>
                <p className="mb-2 text-[13px] font-semibold text-[#273a41]">Bloc Blog</p>
                <div className="grid gap-3 md:grid-cols-2"><input value={homeContentForm.blogBadge} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, blogBadge: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="Badge blog" /><input value={homeContentForm.blogTitle} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, blogTitle: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="Titre blog" /><textarea value={homeContentForm.blogSubtitle} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, blogSubtitle: event.target.value }))} className={`${ADMIN_TEXTAREA_CLASS} min-h-[70px] md:col-span-2`} placeholder="Sous-titre blog" /><input value={homeContentForm.blogCtaLabel} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, blogCtaLabel: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="CTA blog (label)" /><input value={homeContentForm.blogCtaHref} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, blogCtaHref: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="CTA blog (lien)" /></div>
              </div>
              <div className={ADMIN_SECTION_SUBCARD}>
                <p className="mb-2 text-[13px] font-semibold text-[#273a41]">Bloc Contact</p>
                <div className="grid gap-3 md:grid-cols-2"><input value={homeContentForm.contactTitle} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, contactTitle: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="Titre contact" /><input value={homeContentForm.contactSubmitLabel} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, contactSubmitLabel: event.target.value }))} className={ADMIN_INPUT_CLASS} placeholder="Libellé bouton contact" /><textarea value={homeContentForm.contactSubtitle} onChange={(event) => setHomeContentForm((prev) => ({ ...prev, contactSubtitle: event.target.value }))} className={`${ADMIN_TEXTAREA_CLASS} md:col-span-2`} placeholder="Sous-titre contact" /></div>
              </div>
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
