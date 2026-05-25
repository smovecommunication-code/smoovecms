import { beforeEach, describe, expect, it } from 'vitest';
import { serviceRepository } from './serviceRepository';

describe('cms serviceRepository', () => {
  beforeEach(() => {
    localStorage.removeItem('smove_services');
  });

  it('does not drop the entire list when one malformed service is present', () => {
    const services = serviceRepository.replaceAll([
      {
        id: 'service-ok',
        title: 'Service OK',
        slug: 'service-ok',
        routeSlug: 'service-ok',
        description: 'Description',
        icon: 'palette',
        color: 'from-[#00b3e8] to-[#00c0e8]',
        features: ['Feature'],
        status: 'draft',
      },
      {
        id: '',
        title: 'Broken service',
      },
    ] as never[]);

    expect(services).toHaveLength(1);
    expect(services[0].id).toBe('service-ok');
  });
});
