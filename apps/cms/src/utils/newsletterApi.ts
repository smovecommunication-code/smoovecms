import { RUNTIME_CONFIG } from '../config/runtimeConfig';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed';
  source: string;
  subscribedAt: string;
  unsubscribedAt?: string | null;
  linkedUserId?: string | null;
  linkedUser?: { id: string; email: string; name: string; role: string } | null;
  createdAt: string;
  updatedAt: string;
}

const NEWSLETTER_BASE_URL = `${RUNTIME_CONFIG.apiBaseUrl}/newsletter`;

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${NEWSLETTER_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.success) {
    throw new Error(body?.error?.message || `NEWSLETTER_API_${response.status}`);
  }

  return body;
}

export async function fetchNewsletterSubscribers(query: { q?: string; status?: string; source?: string } = {}): Promise<{
  items: NewsletterSubscriber[];
  pagination: { page: number; limit: number; total: number; pages: number };
  summary: { total: number; active: number; unsubscribed: number };
}> {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.status?.trim()) params.set('status', query.status.trim());
  if (query.source?.trim()) params.set('source', query.source.trim());

  const qs = params.toString();
  const body = await request<{
    items: NewsletterSubscriber[];
    pagination: { page: number; limit: number; total: number; pages: number };
    summary?: { total: number; active: number; unsubscribed: number };
  }>(
    `/admin/subscribers${qs ? `?${qs}` : ''}`,
  );

  return {
    items: body.data?.items ?? [],
    pagination: body.data?.pagination ?? { page: 1, limit: 50, total: 0, pages: 1 },
    summary: body.data?.summary ?? { total: 0, active: 0, unsubscribed: 0 },
  };
}

export async function updateNewsletterSubscriberStatus(id: string, status: 'active' | 'unsubscribed'): Promise<NewsletterSubscriber> {
  const body = await request<{ subscriber: NewsletterSubscriber }>(`/admin/subscribers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  if (!body.data?.subscriber) {
    throw new Error('Newsletter subscriber update failed.');
  }

  return body.data.subscriber;
}
