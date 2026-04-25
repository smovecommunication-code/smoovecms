import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContactLeadsSection } from './ContactLeadsSection';

describe('ContactLeadsSection', () => {
  it('renders entries and summary', () => {
    const html = renderToStaticMarkup(
      <ContactLeadsSection
        loading={false}
        error=""
        notice=""
        leads={[{ id: 'lead_1', name: 'John', email: 'john@example.com', subject: 'Projet', message: 'Message long pour valider preview', source: 'project', delivered: true, deliveryStatus: 'sent', createdAt: '2026-01-01T00:00:00.000Z' }]}
        search=""
        setSearch={() => {}}
        sourceFilter="all"
        setSourceFilter={() => {}}
        statusFilter="all"
        setStatusFilter={() => {}}
        summary={{ total: 1, received: 0, sent: 1, failed: 0, disabled: 0 }}
        lastRefreshedAt={null}
        refresh={() => {}}
      />,
    );

    expect(html).toContain('Messages contact &amp; projets');
    expect(html).toContain('john@example.com');
    expect(html).toContain('Total');
  });
});
