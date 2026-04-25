import { Plus } from 'lucide-react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { AppUser } from '../../../utils/securityPolicy';
import type { CmsSettings, ContentHealthSummary, ConversionMetrics, SettingsHistoryEntry } from '../../../utils/contentApi';
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
  siteSettingsTitle: string;
  siteSettingsSupportEmail: string;
  siteBrandMedia: CmsSettings['siteSettings']['brandMedia'];
  managedBlogCategories: string[];
  managedBlogTags: string[];
  enforceManagedTags: boolean;
  settingsSaving: boolean;
  settingsValues: CmsSettings;
  setSettingsValues: Dispatch<SetStateAction<CmsSettings>>;
  savedSettingsSnapshot: CmsSettings | null;
  parseManagedTaxonomyInput: (value: string) => string[];
  settingsHistory: SettingsHistoryEntry[];
  rollbackSettings: (versionId: string) => Promise<void>;
}

export function SettingsSection(props: SettingsSectionProps) {
  const { sectionError, instantPublishingEnabled, isHydratingBackend, hydrateBackendFromLocalSnapshot, saveSettings, settingsHasUnsavedChanges, siteSettingsTitle, siteSettingsSupportEmail, siteBrandMedia, managedBlogCategories, managedBlogTags, enforceManagedTags, settingsSaving, settingsValues, setSettingsValues, savedSettingsSnapshot, parseManagedTaxonomyInput, settingsHistory, rollbackSettings } = props;

  return <div className="space-y-6"><AdminPageHeader title="Paramètres" subtitle="Configuration globale et garde-fous de publication." />
    {sectionError ? <AdminActionBar><AdminErrorState label={sectionError} />{instantPublishingEnabled ? null : <p className="text-[12px] text-amber-700">Publication instantanée désactivée.</p>}<AdminButton onClick={hydrateBackendFromLocalSnapshot} disabled={isHydratingBackend} intent="danger">{isHydratingBackend ? 'Hydratation...' : 'Hydrater backend depuis local'}</AdminButton><AdminButton onClick={saveSettings} disabled={settingsSaving}>Réessayer</AdminButton></AdminActionBar> : null}
    <AdminPanel title="Paramètres globaux (autorité CMS)"><div className="space-y-5"><p className="text-[12px] text-[#6f7f85]">Autorité site: <span className="font-semibold">siteSettings</span> • opérationnelle: <span className="font-semibold">operationalSettings</span> • éditoriale: <span className="font-semibold">taxonomySettings</span>.</p>{settingsHasUnsavedChanges ? <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">Modifications non sauvegardées détectées.</div> : null}<div className="grid gap-4 lg:grid-cols-2"><div className="rounded-[14px] border border-[#e7eff3] bg-[#fbfdfe] p-4 space-y-3"><h3 className="font-['Abhaya_Libre:Bold',sans-serif] text-[#273a41]">Informations générales</h3><label className="block"><span className="text-[13px] text-[#6f7f85]">Nom du site</span><input value={siteSettingsTitle} onChange={(event) => setSettingsValues((prev) => ({ ...prev, siteSettings: { ...prev.siteSettings, siteTitle: event.target.value } }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label><label className="block"><span className="text-[13px] text-[#6f7f85]">Email support/contact</span><input value={siteSettingsSupportEmail} onChange={(event) => setSettingsValues((prev) => ({ ...prev, siteSettings: { ...prev.siteSettings, supportEmail: event.target.value } }))} className="mt-1 w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label></div><div className="rounded-[14px] border border-[#e7eff3] bg-[#fbfdfe] p-4 space-y-3"><h3 className="font-['Abhaya_Libre:Bold',sans-serif] text-[#273a41]">Branding</h3><div className="grid gap-3"><input value={siteBrandMedia.logo || ''} onChange={(event) => setSettingsValues((prev) => ({ ...prev, siteSettings: { ...prev.siteSettings, brandMedia: { ...prev.siteSettings.brandMedia, logo: event.target.value } } }))} className="w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder="Logo principal" /><input value={siteBrandMedia.logoDark || ''} onChange={(event) => setSettingsValues((prev) => ({ ...prev, siteSettings: { ...prev.siteSettings, brandMedia: { ...prev.siteSettings.brandMedia, logoDark: event.target.value } } }))} className="w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder="Logo sombre" /><input value={siteBrandMedia.favicon || ''} onChange={(event) => setSettingsValues((prev) => ({ ...prev, siteSettings: { ...prev.siteSettings, brandMedia: { ...prev.siteSettings.brandMedia, favicon: event.target.value } } }))} className="w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder="Favicon" /><input value={siteBrandMedia.defaultSocialImage || ''} onChange={(event) => setSettingsValues((prev) => ({ ...prev, siteSettings: { ...prev.siteSettings, brandMedia: { ...prev.siteSettings.brandMedia, defaultSocialImage: event.target.value } } }))} className="w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" placeholder="Image sociale par défaut" /></div></div></div><div className="rounded-[14px] border border-[#e7eff3] bg-[#fbfdfe] p-4 space-y-3"><h3 className="font-['Abhaya_Libre:Bold',sans-serif] text-[#273a41]">Taxonomie éditoriale (blog)</h3><div className="grid md:grid-cols-2 gap-3"><label className="block"><span className="text-[13px] text-[#6f7f85]">Catégories gérées (1 par ligne)</span><textarea value={managedBlogCategories.join('\n')} onChange={(event) => setSettingsValues((prev) => ({ ...prev, taxonomySettings: { ...prev.taxonomySettings, blog: { ...prev.taxonomySettings.blog, managedCategories: parseManagedTaxonomyInput(event.target.value) } } }))} className="mt-1 min-h-[130px] w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label><label className="block"><span className="text-[13px] text-[#6f7f85]">Tags gérés (1 par ligne)</span><textarea value={managedBlogTags.join('\n')} onChange={(event) => setSettingsValues((prev) => ({ ...prev, taxonomySettings: { ...prev.taxonomySettings, blog: { ...prev.taxonomySettings.blog, managedTags: parseManagedTaxonomyInput(event.target.value) } } }))} className="mt-1 min-h-[130px] w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2" /></label></div><label className="flex items-center justify-between rounded-[12px] border border-[#dfe9ee] bg-white p-4"><span className="font-['Abhaya_Libre:Regular',sans-serif] text-[#273a41]">Forcer les tags gérés</span><input type="checkbox" checked={enforceManagedTags} onChange={(event) => setSettingsValues((prev) => ({ ...prev, taxonomySettings: { ...prev.taxonomySettings, blog: { ...prev.taxonomySettings.blog, enforceManagedTags: event.target.checked } } }))} /></label></div><div className="rounded-[14px] border border-[#e7eff3] bg-[#fbfdfe] p-4 space-y-3"><h3 className="font-['Abhaya_Libre:Bold',sans-serif] text-[#273a41]">Publication & opérations</h3><label className="flex items-center justify-between rounded-[12px] border border-[#dfe9ee] bg-white p-4"><span className="font-['Abhaya_Libre:Regular',sans-serif] text-[#273a41]">Autoriser la publication immédiate</span><input type="checkbox" checked={instantPublishingEnabled} onChange={(event) => setSettingsValues((prev) => ({ ...prev, operationalSettings: { ...prev.operationalSettings, instantPublishing: event.target.checked } }))} /></label><div className="flex flex-wrap items-center gap-3"><AdminButton onClick={() => setSettingsValues(savedSettingsSnapshot || settingsValues)} disabled={!savedSettingsSnapshot || settingsSaving}>Annuler</AdminButton><AdminButton onClick={saveSettings} disabled={settingsSaving} intent="primary">{settingsSaving ? 'Sauvegarde...' : 'Enregistrer'}</AdminButton><AdminActionCluster danger><AdminButton onClick={hydrateBackendFromLocalSnapshot} disabled={isHydratingBackend} intent="danger">{isHydratingBackend ? 'Hydratation...' : 'Action risquée: hydrater backend depuis local'}</AdminButton></AdminActionCluster></div></div></div></AdminPanel>
    <AdminPanel title="Historique & rollback paramètres globaux">{settingsHistory.length === 0 ? <AdminEmptyState label="Aucun historique enregistré." /> : null}<div className="space-y-2">{settingsHistory.map((entry) => <div key={entry.versionId} className="rounded-[10px] border border-[#eef3f5] px-3 py-2 flex items-center justify-between gap-3"><div className="text-[12px] text-[#4b5a60]"><p><strong>{entry.changedBy || 'unknown'}</strong> · {entry.changeSummary}</p><p>{new Date(entry.changedAt).toLocaleString('fr-FR')} · {entry.changedFields.join(', ') || 'Aucun champ changé'}</p></div><AdminButton onClick={() => { void rollbackSettings(entry.versionId); }} disabled={settingsSaving} size="sm">Restaurer</AdminButton></div>)}</div></AdminPanel>
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
