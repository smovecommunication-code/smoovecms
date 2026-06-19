import { AdminButton, AdminEmptyState, AdminErrorState, AdminLoadingState, AdminPageHeader, AdminPanel } from '../adminPrimitives';
import type { NewsletterCampaignHistoryItem, NewsletterSubscriber } from '../../../utils/newsletterApi';

interface NewsletterSectionProps {
  canManage: boolean;
  loading: boolean;
  error: string;
  notice: string;
  subscribers: NewsletterSubscriber[];
  campaignHistory: NewsletterCampaignHistoryItem[];
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  sourceFilter: string;
  setSourceFilter: (value: string) => void;
  summary: { total: number; active: number; unsubscribed: number };
  lastRefreshedAt: string | null;
  refresh: () => void;
  updateStatus: (id: string, status: 'active' | 'unsubscribed') => Promise<void>;
  campaign: { subject: string; previewText: string; html: string };
  setCampaign: (value: { subject: string; previewText: string; html: string }) => void;
  sending: boolean;
  sendCampaign: () => Promise<void>;
}

function toDisplayDate(value?: string | null) {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleString('fr-FR');
}

export function NewsletterSection(props: NewsletterSectionProps) {
  const {
    canManage,
    loading,
    error,
    notice,
    subscribers,
    campaignHistory,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    summary,
    lastRefreshedAt,
    refresh,
    updateStatus,
    campaign,
    setCampaign,
    sending,
    sendCampaign,
  } = props;

  const sourceOptions = Array.from(new Set(subscribers.map((entry) => entry.source).filter(Boolean))).sort();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Newsletter"
        subtitle="Visibilité et gestion des abonnés newsletter depuis le CMS."
        actions={<AdminButton type="button" size="sm" onClick={refresh}>Rafraîchir</AdminButton>}
      />

      {error ? <AdminErrorState label={error} /> : null}
      {notice ? <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700">{notice}</div> : null}

      <AdminPanel title="Filtres">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un email"
            className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px]"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px]">
            <option value="all">Tous statuts</option>
            <option value="active">active</option>
            <option value="unsubscribed">unsubscribed</option>
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px]">
            <option value="all">Toutes sources</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>
      </AdminPanel>

      <AdminPanel title="Compteurs abonnés">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[10px] border border-[#e4edf1] bg-[#fcfeff] px-3 py-3">
            <p className="text-[12px] text-[#6b7d85]">Total</p>
            <p className="text-[18px] font-semibold text-[#273a41]">{summary.total}</p>
          </div>
          <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-3">
            <p className="text-[12px] text-emerald-700">Actifs</p>
            <p className="text-[18px] font-semibold text-emerald-800">{summary.active}</p>
          </div>
          <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="text-[12px] text-amber-700">Désinscrits</p>
            <p className="text-[18px] font-semibold text-amber-800">{summary.unsubscribed}</p>
          </div>
        </div>
        <p className="mt-2 text-[12px] text-[#6f7f85]">
          Dernier rafraîchissement: {toDisplayDate(lastRefreshedAt)}
        </p>
      </AdminPanel>


      <AdminPanel title="Envoyer une newsletter">
        <div className="space-y-3">
          <input
            value={campaign.subject}
            onChange={(event) => setCampaign({ ...campaign, subject: event.target.value })}
            placeholder="Objet de la campagne"
            className="w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px]"
          />
          <input
            value={campaign.previewText}
            onChange={(event) => setCampaign({ ...campaign, previewText: event.target.value })}
            placeholder="Texte d’aperçu optionnel"
            className="w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px]"
          />
          <textarea
            value={campaign.html}
            onChange={(event) => setCampaign({ ...campaign, html: event.target.value })}
            placeholder="Contenu HTML ou texte de la newsletter"
            rows={7}
            className="w-full rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px]"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-[#6f7f85]">Envoi aux abonnés actifs uniquement. Configurez RESEND_API_KEY + EMAIL_FROM ou SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS + EMAIL_FROM côté API pour l’envoi réel.</p>
            <AdminButton type="button" disabled={!canManage || sending} onClick={() => { void sendCampaign(); }}>{sending ? 'Envoi...' : 'Envoyer'}</AdminButton>
          </div>
        </div>
      </AdminPanel>


      <AdminPanel title="Historique des newsletters envoyées">
        {campaignHistory.length === 0 ? <AdminEmptyState label="Aucune campagne envoyée ou échouée enregistrée." /> : null}
        {campaignHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e4edf1] text-left text-[14px]">
              <thead>
                <tr className="text-[#5f727a]">
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Objet</th>
                  <th className="px-3 py-2 font-semibold">Statut</th>
                  <th className="px-3 py-2 font-semibold">Fournisseur</th>
                  <th className="px-3 py-2 font-semibold">Livrés / Total</th>
                  <th className="px-3 py-2 font-semibold">Diagnostic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef3f5]">
                {campaignHistory.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-3">{toDisplayDate(entry.sentAt)}</td>
                    <td className="px-3 py-3 font-medium text-[#273a41]">{entry.subject}</td>
                    <td className="px-3 py-3">{entry.status}</td>
                    <td className="px-3 py-3">{entry.provider}</td>
                    <td className="px-3 py-3">{entry.deliveredCount}/{entry.recipientCount}</td>
                    <td className="px-3 py-3 text-[#5f727a]">
                      {entry.message || entry.code || 'Acceptée par le fournisseur'}
                      {entry.failedCount > 0 && entry.recipients?.length ? (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[#d97706]">Voir erreurs</summary>
                          <ul className="mt-1 list-disc pl-4 text-[12px]">
                            {entry.recipients.filter((recipient) => recipient.status === 'failed').slice(0, 10).map((recipient) => (
                              <li key={recipient.email}>{recipient.email}: {recipient.errorMessage || recipient.errorCode || 'échec fournisseur'}</li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </AdminPanel>

      <AdminPanel title="Abonnés newsletter">
        {loading ? <AdminLoadingState label="Chargement des abonnés..." /> : null}
        {!loading && subscribers.length === 0 ? <AdminEmptyState label="Aucun abonné newsletter." /> : null}
        {!loading && subscribers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e4edf1] text-left text-[14px]">
              <thead>
                <tr className="text-[#5f727a]">
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Statut</th>
                  <th className="px-3 py-2 font-semibold">Source</th>
                  <th className="px-3 py-2 font-semibold">Inscrit le</th>
                  <th className="px-3 py-2 font-semibold">Compte lié</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef3f5]">
                {subscribers.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-3 text-[#273a41] font-medium">{entry.email}</td>
                    <td className="px-3 py-3">{entry.status}</td>
                    <td className="px-3 py-3">{entry.source || 'website'}</td>
                    <td className="px-3 py-3">{toDisplayDate(entry.subscribedAt)}</td>
                    <td className="px-3 py-3">{entry.linkedUser?.email || 'n/a'}</td>
                    <td className="px-3 py-3">
                      {canManage ? (
                        entry.status === 'active' ? (
                          <AdminButton size="sm" intent="danger" onClick={() => { void updateStatus(entry.id, 'unsubscribed'); }}>
                            Désabonner
                          </AdminButton>
                        ) : (
                          <AdminButton size="sm" onClick={() => { void updateStatus(entry.id, 'active'); }}>
                            Réactiver
                          </AdminButton>
                        )
                      ) : 'Lecture seule'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </AdminPanel>
    </div>
  );
}
