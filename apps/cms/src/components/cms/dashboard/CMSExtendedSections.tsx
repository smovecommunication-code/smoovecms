import { ArrowDown, ArrowUp, Globe2, ImagePlus, Plus, Trash2, Upload } from 'lucide-react';
import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { AppUser } from '../../../utils/securityPolicy';
import type { CmsSettings, ContentHealthSummary, ConversionMetrics, SettingsHistoryEntry, SocialLink } from '../../../utils/contentApi';
import type { MediaFile } from '../../../domain/contentSchemas';
import { resolveMediaUrl } from '../../../utils/mediaResolver';
import type { AuthAuditEvent } from '../../../contexts/AuthContext';
import type { DashboardCmsStats } from './cmsStats';
import type { DashboardReadinessSnapshot } from './contentHealthSummary';
import {
  AdminActionBar,
  AdminActionCluster,
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminPageHeader,
  AdminPanel,
  AdminSuccessFeedback,
  AdminWarningState,
} from '../adminPrimitives';

interface UsersSectionProps {
  user: AppUser | null;
  adminUsersNotice: string;
  adminUsersError: string;
  adminUsersLoading: boolean;
  userSearch: string;
  setUserSearch: (value: string) => void;
  roleFilter: string;
  setRoleFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  verificationFilter: string;
  setVerificationFilter: (value: string) => void;
  providerFilter: string;
  setProviderFilter: (value: string) => void;
  roleOptions: AppUser['role'][];
  accountStatusOptions: NonNullable<AppUser['accountStatus']>[];
  providerOptions: NonNullable<AppUser['authProvider']>[];
  adminUsers: AppUser[];
  filteredAdminUsers: AppUser[];
  selectedUserId: string | null;
  setSelectedUserId: (id: string) => void;
  selectedAdminUser: AppUser | null;
  updatingUserId: string | null;
  patchAdminUser: (targetUserId: string, patch: Partial<Pick<AppUser, 'role' | 'accountStatus' | 'emailVerified'>>) => Promise<void>;
  formatUserDate: (value?: string | null) => string;
  getUserRoleTone: (role: AppUser['role']) => string;
  getUserStatusTone: (status?: AppUser['accountStatus']) => string;
  refresh: () => void;
  auditLoading: boolean;
  auditEvents: AuthAuditEvent[];
}

export function UsersSection(props: UsersSectionProps) {
  const {
    user,
    adminUsersNotice,
    adminUsersError,
    adminUsersLoading,
    userSearch,
    setUserSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    verificationFilter,
    setVerificationFilter,
    providerFilter,
    setProviderFilter,
    roleOptions,
    accountStatusOptions,
    providerOptions,
    adminUsers,
    filteredAdminUsers,
    selectedUserId,
    setSelectedUserId,
    selectedAdminUser,
    updatingUserId,
    patchAdminUser,
    formatUserDate,
    getUserRoleTone,
    getUserStatusTone,
    refresh,
    auditLoading,
    auditEvents,
  } = props;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Utilisateurs" subtitle="Administration des identités, rôles, statuts et audit." actions={<AdminButton type="button" onClick={refresh} size="sm">Rafraîchir</AdminButton>} />
      {adminUsersNotice ? <AdminSuccessFeedback label={adminUsersNotice} /> : null}
      {adminUsersError ? <AdminErrorState label={adminUsersError} /> : null}
      {adminUsersLoading ? <AdminLoadingState label="Chargement des utilisateurs..." /> : null}
      {user?.role !== 'admin' ? <AdminWarningState label="Les modifications sensibles sont réservées aux administrateurs." /> : null}

      <AdminPanel title="Filtres & recherche">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Rechercher par nom ou email" className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px]" />
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px]"><option value="all">Tous les rôles</option>{roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px]"><option value="all">Tous les statuts</option>{accountStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select>
          <select value={verificationFilter} onChange={(event) => setVerificationFilter(event.target.value)} className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px]"><option value="all">Toutes vérifications</option><option value="verified">Email vérifié</option><option value="unverified">Email non vérifié</option></select>
          <select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)} className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px]"><option value="all">Tous les fournisseurs</option>{providerOptions.map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select>
        </div>
      </AdminPanel>

      <AdminPanel title="Comptes">
        {!adminUsersLoading && adminUsers.length === 0 ? <AdminEmptyState label="Aucun utilisateur trouvé." /> : null}
        {!adminUsersLoading && adminUsers.length > 0 && filteredAdminUsers.length === 0 ? <AdminEmptyState label="Aucun compte ne correspond aux filtres actifs." /> : null}
        {filteredAdminUsers.length > 0 ? <div className="overflow-x-auto"><table className="min-w-full divide-y divide-[#e4edf1] text-left text-[14px]"><thead><tr className="text-[#5f727a]"><th className="px-3 py-2 font-semibold">Utilisateur</th><th className="px-3 py-2 font-semibold">Rôle</th><th className="px-3 py-2 font-semibold">Statut</th><th className="px-3 py-2 font-semibold">Vérification</th><th className="px-3 py-2 font-semibold">Provider</th><th className="px-3 py-2 font-semibold">Dernière activité</th></tr></thead><tbody className="divide-y divide-[#eef3f5]">{filteredAdminUsers.map((entry) => <tr key={entry.id} className={`cursor-pointer hover:bg-[#f8fbfc] ${entry.id === selectedUserId ? 'bg-[#f3f9fd]' : ''}`} onClick={() => setSelectedUserId(entry.id)}><td className="px-3 py-3"><p className="font-['Abhaya_Libre:Bold',sans-serif] text-[#273a41]">{entry.name || 'Utilisateur sans nom'}</p><p className="text-[13px] text-[#6f7f85]">{entry.email || 'Email manquant'}</p><p className="text-[12px] text-[#8a9ba2]">Créé: {formatUserDate(entry.createdAt)} · MAJ: {formatUserDate(entry.updatedAt)}</p></td><td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[12px] font-medium capitalize ${getUserRoleTone(entry.role)}`}>{entry.role}</span></td><td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[12px] font-medium capitalize ${getUserStatusTone(entry.accountStatus)}`}>{entry.accountStatus ?? 'active'}</span></td><td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[12px] font-medium ${entry.emailVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{entry.emailVerified ? 'Vérifié' : 'Non vérifié'}</span></td><td className="px-3 py-3 text-[13px] text-[#4b5a60]">{entry.authProvider ?? 'local'}</td><td className="px-3 py-3 text-[13px] text-[#4b5a60]">{formatUserDate(entry.lastLoginAt)}</td></tr>)}</tbody></table></div> : null}
      </AdminPanel>

      {selectedAdminUser ? <AdminPanel title="Détail & gestion du compte"><div className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><div className="rounded-[12px] border border-[#eef3f5] p-3"><p className="text-[12px] text-[#7b868c]">Nom complet</p><p className="text-[14px] text-[#273a41] font-medium">{selectedAdminUser.name || 'n/a'}</p></div><div className="rounded-[12px] border border-[#eef3f5] p-3"><p className="text-[12px] text-[#7b868c]">Email</p><p className="text-[14px] text-[#273a41] font-medium">{selectedAdminUser.email || 'n/a'}</p></div></div>{user?.id === selectedAdminUser.id ? <AdminWarningState label="Vous consultez votre propre compte. Les opérations sensibles restent bloquées." /> : null}<div className="grid gap-3 md:grid-cols-3"><select value={selectedAdminUser.role} disabled={updatingUserId === selectedAdminUser.id || user?.role !== 'admin' || user?.id === selectedAdminUser.id} onChange={(event) => void patchAdminUser(selectedAdminUser.id, { role: event.target.value as AppUser['role'] })} className="rounded-[10px] border border-[#d8e4e8] px-2 py-2 text-[14px]">{roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}</select><select value={selectedAdminUser.accountStatus ?? 'active'} disabled={updatingUserId === selectedAdminUser.id || user?.role !== 'admin' || user?.id === selectedAdminUser.id} onChange={(event) => void patchAdminUser(selectedAdminUser.id, { accountStatus: event.target.value as AppUser['accountStatus'] })} className="rounded-[10px] border border-[#d8e4e8] px-2 py-2 text-[14px]">{accountStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select><button type="button" disabled={updatingUserId === selectedAdminUser.id || user?.role !== 'admin'} onClick={() => void patchAdminUser(selectedAdminUser.id, { emailVerified: !selectedAdminUser.emailVerified })} className="rounded-[10px] border border-[#d8e4e8] px-2 py-2 text-[14px]">{selectedAdminUser.emailVerified ? 'Marquer non vérifié' : 'Marquer vérifié'}</button></div></div></AdminPanel> : null}

      {user?.role === 'admin' ? <AdminPanel title="Journal d’audit (identité)">{auditLoading ? <AdminLoadingState label="Chargement du journal d’audit..." /> : null}{!auditLoading && auditEvents.length === 0 ? <AdminEmptyState label="Aucun événement disponible." /> : null}{!auditLoading && auditEvents.length > 0 ? <div className="space-y-2">{auditEvents.slice(0, 20).map((event, index) => <div key={`${String(event.at ?? index)}-${index}`} className="rounded-[10px] border border-[#eef3f5] px-3 py-2 text-[13px] text-[#4b5a60]"><span className="font-['Abhaya_Libre:Bold',sans-serif] text-[#273a41]">{String(event.event ?? 'event')}</span> · <span>{String(event.outcome ?? 'unknown')}</span> · <span>{event.at ? new Date(String(event.at)).toLocaleString('fr-FR') : 'n/a'}</span></div>)}</div> : null}</AdminPanel> : null}
    </div>
  );
}

interface SettingsSectionProps {
  sectionError: string;
  instantPublishingEnabled: boolean;
  isHydratingBackend: boolean;
  hydrateBackendFromLocalSnapshot: () => void;
  saveSettings: () => void;
  settingsHasUnsavedChanges: boolean;
  settingsSaving: boolean;
  settingsValues: CmsSettings;
  setSettingsValues: Dispatch<SetStateAction<CmsSettings>>;
  mediaFiles: MediaFile[];
  uploadFileToMediaLibrary: (file: File) => Promise<MediaFile>;
}

const SETTINGS_TABS = [
  { id: 'branding', label: 'Branding' },
  { id: 'footer', label: 'Footer' },
  { id: 'social', label: 'Liens sociaux' },
  { id: 'seo', label: 'SEO & métadonnées' },
] as const;
const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'x', 'snapchat', 'whatsapp', 'telegram', 'website', 'email'];
const socialLabel = (platform: string) => ({ x: 'X / Twitter', website: 'Site web', email: 'Email' }[platform] || `${platform.charAt(0).toUpperCase()}${platform.slice(1)}`);
const isValidSocialUrl = (value: string) => /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(value) || /^https?:\/\/[^\s]+$/i.test(value);

export function SettingsSection(props: SettingsSectionProps) {
  const { sectionError, instantPublishingEnabled, isHydratingBackend, hydrateBackendFromLocalSnapshot, saveSettings, settingsHasUnsavedChanges, settingsSaving, settingsValues, setSettingsValues, mediaFiles, uploadFileToMediaLibrary } = props;
  const [activeTab, setActiveTab] = useState<(typeof SETTINGS_TABS)[number]['id']>('branding');
  const [uploadingField, setUploadingField] = useState<string>('');
  const brandMedia = settingsValues.siteSettings.brandMedia;
  const imageMedia = mediaFiles.filter((file) => file.type === 'image' && !file.archivedAt);
  const updateBrand = (field: keyof typeof brandMedia, value: string) => setSettingsValues((prev) => ({ ...prev, siteSettings: { ...prev.siteSettings, brandMedia: { ...prev.siteSettings.brandMedia, [field]: value } } }));
  const updateSocial = (index: number, patch: Partial<SocialLink>) => setSettingsValues((prev) => ({ ...prev, footer: { socialLinks: prev.footer.socialLinks.map((link, itemIndex) => itemIndex === index ? { ...link, ...patch } : link) } }));
  const moveSocial = (index: number, offset: number) => setSettingsValues((prev) => { const links = [...prev.footer.socialLinks]; const target = index + offset; if (target < 0 || target >= links.length) return prev; [links[index], links[target]] = [links[target], links[index]]; return { ...prev, footer: { socialLinks: links } }; });
  const uploadBrand = async (field: keyof typeof brandMedia, file?: File) => { if (!file) return; setUploadingField(field); try { const media = await uploadFileToMediaLibrary(file); updateBrand(field, `media:${media.id}`); } finally { setUploadingField(''); } };
  const updateLogoSize = (viewport: keyof CmsSettings['branding']['logoSize'], value: number) => setSettingsValues((prev) => ({ ...prev, branding: { logoSize: { ...prev.branding.logoSize, [viewport]: value } } }));
  const uploadSocialIcon = async (index: number, file?: File) => { if (!file) return; const field = `social-${index}`; setUploadingField(field); try { const media = await uploadFileToMediaLibrary(file); updateSocial(index, { icon: `media:${media.id}` }); } finally { setUploadingField(''); } };

  const BrandAsset = ({ field, title, optional = true }: { field: keyof typeof brandMedia; title: string; optional?: boolean }) => {
    const value = brandMedia[field]; const preview = resolveMediaUrl(value, mediaFiles);
    return <div className="rounded-[16px] border border-[#dfe9ed] bg-white p-4 space-y-3"><div><h3 className="font-semibold text-[#273a41]">{title}</h3><p className="text-[12px] text-[#718087]">{optional ? 'Optionnel · référence média stable' : 'Logo principal du site'}</p></div><div className="flex h-28 items-center justify-center rounded-[12px] border border-dashed border-[#cfdde2] bg-[#f8fbfc]">{preview ? <img src={preview} alt={`Aperçu ${title}`} className="max-h-24 max-w-full object-contain" /> : <ImagePlus className="text-[#9aabb2]" />}</div><select aria-label={`Choisir ${title}`} value={value} onChange={(event) => updateBrand(field, event.target.value)} className="w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[13px]"><option value="">Aucun média</option>{imageMedia.map((media) => <option key={media.id} value={`media:${media.id}`}>{media.title || media.filename}</option>)}</select><div className="flex gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-[#273a41] px-3 py-2 text-[12px] text-white"><Upload size={14} />{uploadingField === field ? 'Upload...' : 'Importer'}<input type="file" accept="image/*" className="hidden" disabled={Boolean(uploadingField)} onChange={(event) => void uploadBrand(field, event.target.files?.[0])} /></label>{value ? <button type="button" onClick={() => updateBrand(field, '')} className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[12px]">Effacer</button> : null}</div><code className="block truncate text-[11px] text-[#718087]">{value || 'Aucune référence'}</code></div>;
  };

  return <div className="space-y-6"><AdminPageHeader title="Paramètres" subtitle="Gérez l’identité de marque, le footer et les métadonnées publiques." />
    {sectionError ? <AdminActionBar><AdminErrorState label={sectionError} />{instantPublishingEnabled ? null : <p className="text-[12px] text-amber-700">Publication instantanée désactivée.</p>}<AdminButton onClick={hydrateBackendFromLocalSnapshot} disabled={isHydratingBackend} intent="danger">{isHydratingBackend ? 'Hydratation...' : 'Hydrater backend depuis local'}</AdminButton></AdminActionBar> : null}
    <div className="rounded-[18px] border border-[#e1ebef] bg-white p-2 shadow-sm"><div className="flex flex-wrap gap-2" role="tablist">{SETTINGS_TABS.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-[12px] px-4 py-2 text-[13px] font-semibold transition ${activeTab === tab.id ? 'bg-[#273a41] text-white shadow-sm' : 'text-[#60737b] hover:bg-[#f1f6f8]'}`}>{tab.label}</button>)}</div></div>
    {activeTab === 'branding' ? <div className="space-y-4"><AdminPanel title="Taille d’affichage du logo"><p className="mb-4 text-[13px] text-[#60737b]">Définissez la largeur du logo public pour chaque taille d’écran (40 à 320 px).</p><div className="grid gap-4 md:grid-cols-3">{(['desktop', 'tablet', 'mobile'] as const).map((viewport) => <label key={viewport} className="text-[13px] font-medium capitalize text-[#60737b]">{viewport}<div className="mt-1 flex items-center gap-3"><input type="range" min="40" max="320" value={settingsValues.branding.logoSize[viewport]} onChange={(event) => updateLogoSize(viewport, Number(event.target.value))} className="w-full" /><input aria-label={`Taille logo ${viewport}`} type="number" min="40" max="320" value={settingsValues.branding.logoSize[viewport]} onChange={(event) => updateLogoSize(viewport, Number(event.target.value))} className="w-20 rounded-[9px] border border-[#d8e4e8] px-2 py-2" /> px</div></label>)}</div></AdminPanel><div className="grid gap-4 md:grid-cols-2"><BrandAsset field="logo" title="Logo principal" optional={false} /><BrandAsset field="logoDark" title="Logo sombre" /><BrandAsset field="favicon" title="Favicon" /><BrandAsset field="defaultSocialImage" title="Image sociale par défaut" /></div></div> : null}
    {activeTab === 'footer' ? <AdminPanel title="Informations du footer"><div className="grid gap-4 md:grid-cols-2"><label className="text-[13px] text-[#60737b]">Nom du site<input value={settingsValues.siteSettings.siteTitle} onChange={(event) => setSettingsValues((prev) => ({ ...prev, siteSettings: { ...prev.siteSettings, siteTitle: event.target.value } }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[#273a41]" /></label><label className="text-[13px] text-[#60737b]">Email support<input type="email" value={settingsValues.siteSettings.supportEmail} onChange={(event) => setSettingsValues((prev) => ({ ...prev, siteSettings: { ...prev.siteSettings, supportEmail: event.target.value } }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[#273a41]" /></label></div></AdminPanel> : null}
    {activeTab === 'social' ? <AdminPanel title="Liens sociaux personnalisés du footer"><div className="space-y-3">{settingsValues.footer.socialLinks.map((link, index) => { const iconPreview = resolveMediaUrl(link.icon, mediaFiles); return <div key={`${link.platform}-${index}`} className="space-y-3 rounded-[14px] border border-[#e1ebef] bg-[#fbfdfe] p-3"><div className="grid gap-2 lg:grid-cols-[150px_180px_1fr_auto]"><select aria-label="Type de lien" value={SOCIAL_PLATFORMS.includes(link.platform) ? link.platform : 'custom'} onChange={(event) => updateSocial(index, { platform: event.target.value, label: event.target.value === 'custom' ? link.label : socialLabel(event.target.value) })} className="rounded-[9px] border border-[#d8e4e8] px-2 py-2">{SOCIAL_PLATFORMS.map((platform) => <option key={platform} value={platform}>{socialLabel(platform)}</option>)}<option value="custom">Personnalisé</option></select><input aria-label="Nom ou libellé" value={link.label} onChange={(event) => updateSocial(index, { label: event.target.value })} className="rounded-[9px] border border-[#d8e4e8] px-2 py-2" placeholder="Nom / libellé" /><div><input aria-label="URL de redirection" value={link.url} onChange={(event) => updateSocial(index, { url: event.target.value })} className={`w-full rounded-[9px] border px-2 py-2 ${link.url && !isValidSocialUrl(link.url) ? 'border-red-400' : 'border-[#d8e4e8]'}`} placeholder={link.platform === 'email' ? 'mailto:contact@example.com' : 'https://...'} />{link.url && !isValidSocialUrl(link.url) ? <p className="mt-1 text-[11px] text-red-600">URL invalide. Utilisez https:// ou mailto:.</p> : null}</div><label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={link.enabled} onChange={(event) => updateSocial(index, { enabled: event.target.checked })} /> Actif</label></div><div className="flex flex-wrap items-center gap-2">{iconPreview ? <img src={iconPreview} alt="Aperçu icône" className="h-10 w-10 rounded-full object-contain" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed text-[10px] text-[#718087]">Icône</div>}<select aria-label="Choisir une icône média" value={link.icon} onChange={(event) => updateSocial(index, { icon: event.target.value })} className="min-w-56 rounded-[9px] border border-[#d8e4e8] px-2 py-2 text-[12px]"><option value="">Icône intégrée / aucune</option>{imageMedia.map((media) => <option key={media.id} value={`media:${media.id}`}>{media.title || media.filename}</option>)}</select><label className="inline-flex cursor-pointer items-center gap-2 rounded-[9px] bg-[#273a41] px-3 py-2 text-[12px] text-white"><Upload size={14} />{uploadingField === `social-${index}` ? 'Upload...' : 'Importer une icône'}<input type="file" accept="image/*" className="hidden" disabled={Boolean(uploadingField)} onChange={(event) => void uploadSocialIcon(index, event.target.files?.[0])} /></label><div className="ml-auto flex gap-1"><button type="button" aria-label="Monter" onClick={() => moveSocial(index, -1)} className="rounded border p-2"><ArrowUp size={14} /></button><button type="button" aria-label="Descendre" onClick={() => moveSocial(index, 1)} className="rounded border p-2"><ArrowDown size={14} /></button><button type="button" aria-label="Supprimer" onClick={() => setSettingsValues((prev) => ({ ...prev, footer: { socialLinks: prev.footer.socialLinks.filter((_, itemIndex) => itemIndex !== index) } }))} className="rounded border border-red-200 p-2 text-red-600"><Trash2 size={14} /></button></div></div></div>; })}<button type="button" onClick={() => setSettingsValues((prev) => ({ ...prev, footer: { socialLinks: [...prev.footer.socialLinks, { platform: 'custom', label: 'Nouveau lien', url: 'https://', enabled: true, icon: '' }] } }))} className="inline-flex items-center gap-2 rounded-[10px] bg-[#00a590] px-4 py-2 text-[13px] font-semibold text-white"><Plus size={15} />Ajouter un lien personnalisé</button></div></AdminPanel> : null}
    {activeTab === 'seo' ? <div className="space-y-4"><AdminPanel title="SEO & métadonnées"><div className="flex gap-3 rounded-[12px] bg-[#f6fafb] p-4"><Globe2 className="text-[#00a590]" /><div><p className="font-semibold text-[#273a41]">Métadonnées de base</p><p className="text-[13px] text-[#60737b]">Le nom du site, le favicon et l’image sociale par défaut sont utilisés pour les métadonnées publiques. Les métadonnées par page restent gérées dans leurs éditeurs respectifs.</p></div></div></AdminPanel><AdminPanel title="Publication & taxonomie"><div className="space-y-4"><label className="flex items-center gap-3 rounded-[12px] border border-[#e1ebef] p-3 text-[13px]"><input type="checkbox" checked={settingsValues.operationalSettings.instantPublishing} onChange={(event) => setSettingsValues((prev) => ({ ...prev, operationalSettings: { instantPublishing: event.target.checked } }))} /> Autoriser la publication instantanée</label><div className="grid gap-3 md:grid-cols-2"><label className="text-[13px] text-[#60737b]">Catégories blog gérées<textarea value={settingsValues.taxonomySettings.blog.managedCategories.join('\n')} onChange={(event) => setSettingsValues((prev) => ({ ...prev, taxonomySettings: { blog: { ...prev.taxonomySettings.blog, managedCategories: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) } } }))} className="mt-1 min-h-28 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[#273a41]" /></label><label className="text-[13px] text-[#60737b]">Tags blog gérés<textarea value={settingsValues.taxonomySettings.blog.managedTags.join('\n')} onChange={(event) => setSettingsValues((prev) => ({ ...prev, taxonomySettings: { blog: { ...prev.taxonomySettings.blog, managedTags: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) } } }))} className="mt-1 min-h-28 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[#273a41]" /></label></div><label className="flex items-center gap-3 text-[13px]"><input type="checkbox" checked={settingsValues.taxonomySettings.blog.enforceManagedTags} onChange={(event) => setSettingsValues((prev) => ({ ...prev, taxonomySettings: { blog: { ...prev.taxonomySettings.blog, enforceManagedTags: event.target.checked } } }))} /> Imposer les tags gérés</label></div></AdminPanel></div> : null}
    <AdminActionBar><div className="text-[12px] text-[#60737b]">{settingsHasUnsavedChanges ? 'Modifications non sauvegardées.' : 'Paramètres à jour.'}</div><AdminButton onClick={saveSettings} disabled={settingsSaving || settingsValues.footer.socialLinks.some((link) => !isValidSocialUrl(link.url))}>{settingsSaving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}</AdminButton></AdminActionBar>
  </div>;
}

interface OverviewSectionProps {
  contentHealth: ContentHealthSummary | null;
  readinessSnapshot: DashboardReadinessSnapshot | null;
  stats: DashboardCmsStats[];
  conversionMetrics: ConversionMetrics | null;
  handleSectionChange: (section: string) => void;
  children: ReactNode;
}

export function OverviewSection({ contentHealth, readinessSnapshot, stats, conversionMetrics, handleSectionChange, children }: OverviewSectionProps) {
  return <>
    {conversionMetrics ? <div className="bg-white rounded-[20px] p-6 shadow-sm mb-6"><h3 className="font-['Abhaya_Libre:Bold',sans-serif] text-[20px] text-[#273a41] mb-3">Conversion & parcours (1000 événements)</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px]"><div className="rounded-[12px] border border-[#e5edf0] p-3"><p className="text-[#6f7f85]">Home → discovery</p><p className="text-[#273a41] font-bold">{conversionMetrics.conversionPath.homeToDiscovery}</p></div><div className="rounded-[12px] border border-[#e5edf0] p-3"><p className="text-[#6f7f85]">Discovery → contact</p><p className="text-[#273a41] font-bold">{conversionMetrics.conversionPath.discoveryToContact}</p></div><div className="rounded-[12px] border border-[#e5edf0] p-3"><p className="text-[#6f7f85]">Formulaires contact</p><p className="text-[#273a41] font-bold">{conversionMetrics.conversionPath.contactFormSubmissions}</p></div></div>{conversionMetrics.topRoutes.length > 0 ? <div className="mt-4 text-[12px] text-[#4b5a60]"><p className="font-semibold mb-1">Top routes suivies</p><p>{conversionMetrics.topRoutes.slice(0, 4).map((entry) => `${entry.route} (${entry.hits})`).join(' • ')}</p></div> : null}</div> : null}
    {contentHealth ? <div className="bg-white rounded-[20px] p-6 shadow-sm"><h3 className="font-['Abhaya_Libre:Bold',sans-serif] text-[20px] text-[#273a41] mb-4">Santé contenu & readiness</h3><p className="mb-4 text-[12px] text-[#6f7f85]">Source: endpoint backend /content/health.</p>{readinessSnapshot ? <div className="mt-4 rounded-[12px] border border-[#e5edf0] p-4 text-[13px]"><p className="text-[#273a41] font-bold">{readinessSnapshot.publishReadyCount}/{readinessSnapshot.publishedCount} publiés prêts • {readinessSnapshot.blockerCount} blockers • {readinessSnapshot.warningCount} warnings • {readinessSnapshot.failedReleaseChecks} checks release en échec</p></div> : null}</div> : null}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">{stats.map((stat, index) => <div key={index} className="bg-white rounded-[20px] p-6 shadow-sm"><h3 className="font-['Abhaya_Libre:Bold',sans-serif] text-[32px] text-[#273a41] mb-1">{stat.value}</h3><p className="font-['Abhaya_Libre:Regular',sans-serif] text-[14px] text-[#9ba1a4]">{stat.label}</p></div>)}</div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">{[['projects', 'Nouveau Projet', 'Ajouter un projet', 'from-[#00b3e8] to-[#00c0e8]'], ['blog', 'Nouvel Article', 'Rédiger un article', 'from-[#a855f7] to-[#9333ea]'], ['media', 'Upload Média', 'Ajouter des fichiers', 'from-[#ffc247] to-[#ff9f47]']].map(([id, title, subtitle, color]) => <button key={id} onClick={() => handleSectionChange(id)} className={`bg-gradient-to-r ${color} text-white p-6 rounded-[20px] flex items-center justify-between group`}><div className="text-left"><p className="font-['Abhaya_Libre:Bold',sans-serif] text-[18px] mb-1">{title}</p><p className="font-['Abhaya_Libre:Regular',sans-serif] text-[14px] text-white/80">{subtitle}</p></div><Plus className="group-hover:rotate-90 transition-transform" size={32} /></button>)}</div>
    {children}
  </>;
}
