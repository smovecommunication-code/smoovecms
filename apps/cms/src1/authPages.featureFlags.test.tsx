import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import CMSLoginPage from './CMSLoginPage';
import CMSRegisterPage from './CMSRegisterPage';

vi.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({
    login: async () => ({ success: true, error: null, destination: 'cms-dashboard' }),
    register: async () => ({ success: true, error: null, destination: 'login' }),
    beginOAuthLogin: () => undefined,
    authError: null,
    authNotice: null,
    cmsEnabled: true,
    registrationEnabled: true,
    oauthProviders: { google: false, facebook: false },
  }),
}));

describe('auth pages provider feature flags', () => {
  it('shows email/password login and hides social buttons when providers are disabled', () => {
    const html = renderToStaticMarkup(<CMSLoginPage />);
    expect(html).toContain('Connexion CMS');
    expect(html).toContain('Se connecter');
    expect(html).not.toContain('Se connecter avec Google');
    expect(html).not.toContain('Se connecter avec Facebook');
  });

  it('shows registration form and hides social buttons when providers are disabled', () => {
    const html = renderToStaticMarkup(<CMSRegisterPage />);
    expect(html).toContain('Créer un compte CMS');
    expect(html).toContain('Créer le compte');
    expect(html).not.toContain('Continuer avec Google');
    expect(html).not.toContain('Continuer avec Facebook');
  });
});
