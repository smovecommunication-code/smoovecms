import { describe, expect, it } from 'vitest';
import { buildServicePayload, type ServiceFormPayloadState } from './servicePayload';

const baseForm: ServiceFormPayloadState = {
  id: 'svc-test',
  title: 'Service Test',
  slug: 'service-test',
  routeSlug: 'service-test',
  description: 'Description',
  shortDescription: 'Short',
  icon: 'palette',
  iconLikeAsset: 'media:asset-1',
  color: 'from-[#00b3e8] to-[#00c0e8]',
  features: 'Feature one\nFeature two',
  status: 'draft',
  featured: false,
  overviewDescription: 'Overview',
  ctaTitle: 'CTA title',
  ctaDescription: 'CTA description',
  ctaPrimaryLabel: 'Contact us',
  ctaPrimaryHref: '#contact',
  processTitle: 'Process',
  processSteps: 'Step 1\nStep 2',
};

describe('buildServicePayload', () => {
  it('strips empty optional fields on edit payloads to avoid overwriting legacy stored values', () => {
    const payload = buildServicePayload(
      {
        ...baseForm,
        description: '',
        icon: '',
        color: '',
        features: '',
        shortDescription: '',
        iconLikeAsset: '',
        overviewDescription: '',
        ctaTitle: '',
        ctaDescription: '',
        ctaPrimaryLabel: '',
        ctaPrimaryHref: '',
        processTitle: '',
        processSteps: '',
      },
      'edit',
    );

    expect(payload).toEqual({
      id: 'svc-test',
      title: 'Service Test',
      slug: 'service-test',
      routeSlug: 'service-test',
      status: 'draft',
      featured: false,
    });
  });

  it('keeps create payload strict for required create-time fields', () => {
    const payload = buildServicePayload(
      {
        ...baseForm,
        id: undefined,
        title: 'New Service',
        slug: '',
        routeSlug: '',
        description: 'Description',
        icon: 'palette',
        color: 'from-[#00b3e8] to-[#00c0e8]',
        features: 'Feature 1\nFeature 2',
      },
      'create',
    );

    expect(payload.description).toBe('Description');
    expect(payload.features).toEqual(['Feature 1', 'Feature 2']);
    expect(payload.icon).toBe('palette');
    expect(payload.color).toBe('from-[#00b3e8] to-[#00c0e8]');
  });
});
