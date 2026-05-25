import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ServicesSection } from './CMSMainSections';
import type { Service } from '../../../domain/contentSchemas';

const sampleService: Service = {
  id: 'service-1',
  title: 'Service One',
  slug: 'service-one',
  routeSlug: 'service-one',
  description: 'Description',
  shortDescription: 'Short description',
  icon: 'palette',
  color: 'from-[#00b3e8] to-[#00c0e8]',
  features: ['Feature 1'],
  status: 'draft',
};

describe('ServicesSection', () => {
  it('renders services management list with actions', () => {
    const html = renderToStaticMarkup(
      <ServicesSection
        canEditContent
        canDeleteContent
        canPublishContent
        servicesError=""
        servicesLoading={false}
        services={[sampleService]}
        serviceEditorMode="list"
        renderServiceForm={() => null}
        startCreateService={vi.fn()}
        startEditService={vi.fn()}
        transitionServiceStatus={async () => {}}
        deleteService={async () => {}}
        loadServicesFromBackend={async () => {}}
      />,
    );

    expect(html).toContain('Gestion des services');
    expect(html).toContain('Service One');
    expect(html).toContain('Modifier');
    expect(html).toContain('Supprimer');
    expect(html).toContain('Publier');
  });

  it('shows empty state when no services are available', () => {
    const html = renderToStaticMarkup(
      <ServicesSection
        canEditContent
        canDeleteContent={false}
        canPublishContent={false}
        servicesError=""
        servicesLoading={false}
        services={[]}
        serviceEditorMode="list"
        renderServiceForm={() => null}
        startCreateService={vi.fn()}
        startEditService={vi.fn()}
        transitionServiceStatus={async () => {}}
        deleteService={async () => {}}
        loadServicesFromBackend={async () => {}}
      />,
    );

    expect(html).toContain('Aucun service trouvé');
    expect(html).toContain('suppressions définitives sont réservées au rôle administrateur');
  });
});
