import { RUNTIME_CONFIG } from '../config/runtimeConfig';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

export interface ContactLead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  source: string;
  contextSlug?: string;
  contextLabel?: string;
  delivered: boolean;
  deliveryMode?: string | null;
  deliveryStatus: 'received' | 'sent' | 'failed' | 'disabled' | string;
  deliveryError?: string | null;
  createdAt: string;
}

const CONTACT_BASE_URL = `${RUNTIME_CONFIG.apiBaseUrl}/contact`;

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${CONTACT_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.success) {
    throw new Error(body?.error?.message || `CONTACT_API_${response.status}`);
  }

  return body;
}

export async function fetchContactLeads(query: { q?: string; source?: string; deliveryStatus?: string } = {}): Promise<{
  items: ContactLead[];
  pagination: { page: number; limit: number; total: number; pages: number };
  summary: { total: number; received: number; sent: number; failed: number; disabled: number };
}> {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.source?.trim()) params.set('source', query.source.trim());
  if (query.deliveryStatus?.trim()) params.set('deliveryStatus', query.deliveryStatus.trim());

  const qs = params.toString();
  const body = await request<{
    items: ContactLead[];
    pagination: { page: number; limit: number; total: number; pages: number };
    summary?: { total: number; received: number; sent: number; failed: number; disabled: number };
  }>(`/admin/submissions${qs ? `?${qs}` : ''}`);

  return {
    items: body.data?.items ?? [],
    pagination: body.data?.pagination ?? { page: 1, limit: 50, total: 0, pages: 1 },
    summary: body.data?.summary ?? { total: 0, received: 0, sent: 0, failed: 0, disabled: 0 },
  };
}
