import type { ContactLead } from '../../../utils/contactLeadsApi';
import {
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminPageHeader,
  AdminPanel,
} from '../adminPrimitives';

interface ContactLeadsSectionProps {
  loading: boolean;
  error: string;
  notice: string;
  leads: ContactLead[];
  search: string;
  setSearch: (value: string) => void;
  sourceFilter: string;
  setSourceFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  summary: { total: number; received: number; sent: number; failed: number; disabled: number };
  lastRefreshedAt: string | null;
  refresh: () => void;
}

const preview = (value: string) => (value.length > 96 ? `${value.slice(0, 96)}…` : value);

export function ContactLeadsSection(props: ContactLeadsSectionProps) {
  const {
    loading,
    error,
    notice,
    leads,
    search,
    setSearch,
    sourceFilter,
    setSourceFilter,
    statusFilter,
    setStatusFilter,
    summary,
    lastRefreshedAt,
    refresh,
  } = props;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Messages contact & projets"
        subtitle="Suivi unifié des demandes de contact, projets et CTA entrants."
        actions={<AdminButton onClick={refresh} size="sm">Rafraîchir</AdminButton>}
      />

      <AdminPanel title="Synthèse">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[13px]">
          <div className="rounded-[12px] border border-[#e5edf0] p-3"><p className="text-[#6f7f85]">Total</p><p className="font-bold text-[#273a41]">{summary.total}</p></div>
          <div className="rounded-[12px] border border-[#e5edf0] p-3"><p className="text-[#6f7f85]">Reçus</p><p className="font-bold text-[#273a41]">{summary.received}</p></div>
          <div className="rounded-[12px] border border-[#e5edf0] p-3"><p className="text-[#6f7f85]">Envoyés</p><p className="font-bold text-[#273a41]">{summary.sent}</p></div>
          <div className="rounded-[12px] border border-[#e5edf0] p-3"><p className="text-[#6f7f85]">Échecs email</p><p className="font-bold text-[#273a41]">{summary.failed}</p></div>
          <div className="rounded-[12px] border border-[#e5edf0] p-3"><p className="text-[#6f7f85]">Email désactivé</p><p className="font-bold text-[#273a41]">{summary.disabled}</p></div>
        </div>
        {lastRefreshedAt ? <p className="mt-3 text-[12px] text-[#6f7f85]">Dernière mise à jour: {new Date(lastRefreshedAt).toLocaleString('fr-FR')}</p> : null}
      </AdminPanel>

      <AdminPanel title="Filtres">
        <div className="grid gap-3 md:grid-cols-3">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, email, sujet, message" className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px]" />
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px]"><option value="all">Toutes les sources</option><option value="general">general</option><option value="project">project</option><option value="service">service</option><option value="blog">blog</option><option value="contact_page">contact_page</option></select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-[10px] border border-[#d8e4e8] px-3 py-2 text-[14px]"><option value="all">Tous les statuts</option><option value="received">received</option><option value="sent">sent</option><option value="failed">failed</option><option value="disabled">disabled</option></select>
        </div>
      </AdminPanel>

      <AdminPanel title={`Leads (${leads.length})`}>
        {notice ? <p className="mb-3 text-[13px] text-emerald-700">{notice}</p> : null}
        {loading ? <AdminLoadingState label="Chargement des messages..." /> : null}
        {error ? <AdminErrorState label={error} /> : null}
        {!loading && !error && leads.length === 0 ? <AdminEmptyState label="Aucun message trouvé." /> : null}
        {!loading && !error && leads.length > 0 ? (
          <div className="space-y-2">
            {leads.map((lead) => (
              <div key={lead.id} className="rounded-[12px] border border-[#e5edf0] px-3 py-2 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#273a41]">{lead.name} · {lead.email}</p>
                  <p className="text-[#6f7f85]">{new Date(lead.createdAt).toLocaleString('fr-FR')}</p>
                </div>
                <p className="text-[#4b5a60]">{lead.subject} · source: {lead.source}{lead.contextLabel ? ` (${lead.contextLabel})` : ''} · statut: {lead.deliveryStatus}</p>
                <p className="text-[#273a41]">{preview(lead.message)}</p>
              </div>
            ))}
          </div>
        ) : null}
      </AdminPanel>
    </div>
  );
}
