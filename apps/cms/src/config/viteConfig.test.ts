import { describe, expect, it } from 'vitest';
import cmsViteConfig from '../../vite.config';

describe('cms vite config', () => {
  it('uses app-local root so /cms/ resolves index.html correctly', async () => {
    const configFactory = cmsViteConfig as unknown as (env: { mode: string }) => Promise<Record<string, unknown>> | Record<string, unknown>;
    const config = await configFactory({ mode: 'development' });

    expect(config.root).toBeDefined();
    expect(String(config.root)).toContain('apps/cms');
  });

  it('serves cms under /cms/ base path', async () => {
    const configFactory = cmsViteConfig as unknown as (env: { mode: string }) => Promise<Record<string, unknown>> | Record<string, unknown>;
    const config = await configFactory({ mode: 'development' });

    expect(config.base).toBe('/cms/');
  });
});
