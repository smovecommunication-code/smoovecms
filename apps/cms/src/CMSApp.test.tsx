import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: unknown }) => children,
  useAuth: () => ({
    isAuthenticated: true,
    isAuthReady: true,
    canAccessCMS: true,
    cmsEnabled: true,
    registrationEnabled: true,
  }),
}));

vi.mock('./cmsRouting', () => ({
  useCmsNavigation: () => ({
    page: 'cms-dashboard',
    section: 'overview',
    setSection: () => undefined,
  }),
}));

vi.mock('./components/cms/CMSDashboard', () => ({
  default: () => <div data-cms-dashboard="ready">cms ready</div>,
}));

vi.mock('./components/cms/CMSAppShell', () => ({
  default: ({ children }: { children: unknown }) => <div data-cms-shell="mounted">{children}</div>,
}));

import CMSApp from './CMSApp';

describe('CMSApp boot render', () => {
  it('renders CMS shell without crashing', () => {
    const html = renderToStaticMarkup(<CMSApp />);
    expect(html).toContain('data-cms-shell="mounted"');
    expect(html).toContain('data-cms-dashboard="ready"');
  });
});
