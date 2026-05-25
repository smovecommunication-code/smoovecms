import type { MediaFile } from '../../../domain/contentSchemas';

export interface BackendMediaReference {
  domain: string;
  id: string;
  field: string;
  label: string;
}

export interface MediaReferenceSummary {
  total: number;
  byDomain: Array<{ domain: string; label: string; count: number }>;
  sample: string[];
}

export interface MetadataCompleteness {
  alt: boolean;
  caption: boolean;
  tags: boolean;
}

const DOMAIN_LABELS: Record<string, string> = {
  blog: 'Blog',
  project: 'Projets',
  service: 'Services',
  home: 'Contenu pages',
  settings: 'Réglages',
};

export function toDomainLabel(domain: string): string {
  return DOMAIN_LABELS[domain] || domain;
}

export function summarizeReferences(references: BackendMediaReference[]): MediaReferenceSummary {
  const counts = new Map<string, number>();
  references.forEach((reference) => {
    counts.set(reference.domain, (counts.get(reference.domain) || 0) + 1);
  });

  const byDomain = Array.from(counts.entries())
    .map(([domain, count]) => ({ domain, label: toDomainLabel(domain), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const sample = references.slice(0, 6).map((reference) => `${toDomainLabel(reference.domain)} • ${reference.label} • ${reference.field}`);

  return {
    total: references.length,
    byDomain,
    sample,
  };
}

export function getMetadataCompleteness(media: MediaFile): MetadataCompleteness {
  return {
    alt: Boolean(media.alt?.trim()),
    caption: Boolean(media.caption?.trim()),
    tags: Array.isArray(media.tags) && media.tags.some((tag) => Boolean(tag?.trim())),
  };
}
