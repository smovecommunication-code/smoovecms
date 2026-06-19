import { RUNTIME_CONFIG } from '../config/runtimeConfig';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  ok?: boolean;
  code?: string;
  message?: string;
}

export interface NewsletterCampaignHistoryItem {
  id: string;
  subject: string;
  previewText?: string;
  provider: string;
  status: 'draft' | 'sending' | 'sent' | 'partial' | 'failed';
  code?: string;
  message?: string;
  sentBy?: string;
  sentAt: string;
  recipientCount: number;
  deliveredCount: number;
  sentCount?: number;
  failedCount: number;
  recipients?: Array<{ email: string; status: string; errorCode?: string; errorMessage?: string }>;
}


export interface NewsletterEmailStatus {
  deliveryReady: boolean;
  mode: string;
  activeProvider: string;
  provider: string;
  resendConfigured: boolean;
  smtpConfigured: boolean;
  hasFrom: boolean;
  hasResendApiKey: boolean;
  hasSmtpHost: boolean;
  hasSmtpPort: boolean;
  hasSmtpUser: boolean;
  hasSmtpPass: boolean;
}

export interface NewsletterTestEmailResult {
  ok?: boolean;
  provider: string;
  status: string;
  providerResponse?: unknown;
  code?: string;
  message?: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
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
    throw new Error(body?.error?.message || body?.message || body?.code || `NEWSLETTER_API_${response.status}`);
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


export async function fetchNewsletterEmailStatus(): Promise<NewsletterEmailStatus> {
  const body = await request<NewsletterEmailStatus>('/admin/email-status');
  if (!body.data) throw new Error('Email configuration status unavailable.');
  return body.data;
}

export async function sendNewsletterTestEmail(to: string): Promise<NewsletterTestEmailResult> {
  const response = await fetch(`${NEWSLETTER_BASE_URL}/admin/test-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    cache: 'no-store',
    body: JSON.stringify({ to }),
  });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<NewsletterTestEmailResult> | NewsletterTestEmailResult | null;
  if (!response.ok) {
    const result = (body && 'provider' in body ? body : null) as NewsletterTestEmailResult | null;
    if (result) return result;
    throw new Error(body?.error?.message || body?.message || body?.code || `NEWSLETTER_TEST_EMAIL_${response.status}`);
  }
  const result = 'data' in (body ?? {}) ? (body as ApiEnvelope<NewsletterTestEmailResult>).data : (body as NewsletterTestEmailResult | null);
  if (!result) throw new Error('Newsletter test email failed.');
  return result;
}

export async function fetchNewsletterCampaignHistory(): Promise<{ items: NewsletterCampaignHistoryItem[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const body = await request<{ items: NewsletterCampaignHistoryItem[]; pagination: { page: number; limit: number; total: number; pages: number } }>('/admin/campaigns');

  return {
    items: body.data?.items ?? [],
    pagination: body.data?.pagination ?? { page: 1, limit: 50, total: 0, pages: 1 },
  };
}

export async function sendNewsletterCampaign(payload: { subject: string; previewText?: string; html?: string; text?: string }): Promise<{ provider: string; recipientCount: number; deliveredCount?: number; failedCount?: number; subject: string }> {
  const body = await request<{ provider: string; recipientCount: number; deliveredCount?: number; failedCount?: number; subject: string }>('/admin/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!body.data) {
    throw new Error('Newsletter campaign send failed.');
  }

  return body.data;
}
