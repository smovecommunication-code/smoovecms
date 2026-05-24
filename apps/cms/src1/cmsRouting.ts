import { useEffect, useState } from 'react';

const CMS_SECTIONS = new Set(['overview', 'projects', 'services', 'blog', 'media', 'content', 'users', 'contacts', 'newsletter', 'settings']);

export function parseHashRoute(hash: string): string {
  const rawRoute = (hash.startsWith('#') ? hash.slice(1) : hash) || 'home';
  return rawRoute.split('?')[0];
}

export function resolveCmsSectionFromRoute(route: string): string {
  if (route === 'cms' || route === 'cms-dashboard') {
    return 'overview';
  }

  if (route.startsWith('cms/')) {
    const [, rawSection] = route.split('/');
    return CMS_SECTIONS.has(rawSection) ? rawSection : 'overview';
  }

  if (route.startsWith('cms-')) {
    const section = route.slice('cms-'.length);
    return CMS_SECTIONS.has(section) ? section : 'overview';
  }

  return 'overview';
}

export type CmsPage = 'auth-loading' | 'login' | 'register' | 'cms-dashboard' | 'cms-unavailable' | 'cms-forbidden';

export function useCmsNavigation(params: {
  isAuthReady: boolean;
  isAuthenticated: boolean;
  canAccessCMS: boolean;
  cmsEnabled: boolean;
  registrationEnabled: boolean;
}) {
  const [page, setPage] = useState<CmsPage>('auth-loading');
  const [section, setSection] = useState('overview');

  useEffect(() => {
    const sync = () => {
      const route = parseHashRoute(window.location.hash);
      const sectionFromHash = resolveCmsSectionFromRoute(route);
      setSection(sectionFromHash);

      if (!params.cmsEnabled) {
        setPage('cms-unavailable');
        if (window.location.hash !== '#cms-unavailable') {
          window.location.hash = 'cms-unavailable';
        }
        return;
      }

      if (route === 'register') {
        if (!params.registrationEnabled) {
          setPage('login');
          window.location.hash = 'login';
          return;
        }

        if (params.isAuthenticated && params.canAccessCMS) {
          setPage('cms-dashboard');
          window.location.hash = 'cms';
          return;
        }

        setPage('register');
        return;
      }

      if (route === 'login') {
        if (params.isAuthenticated && params.canAccessCMS) {
          setPage('cms-dashboard');
          window.location.hash = 'cms';
          return;
        }

        setPage('login');
        return;
      }

      if (!params.isAuthReady) {
        setPage('auth-loading');
        return;
      }

      if (!params.isAuthenticated) {
        setPage('login');
        if (window.location.hash !== '#login') {
          window.location.hash = 'login';
        }
        return;
      }

      if (!params.canAccessCMS) {
        setPage('cms-forbidden');
        if (window.location.hash !== '#cms-forbidden') {
          window.location.hash = 'cms-forbidden';
        }
        return;
      }

      setPage('cms-dashboard');

      if (!route.startsWith('cms')) {
        window.location.hash = 'cms';
      }
    };

    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [params]);

  return {
    page,
    section,
    setSection: (nextSection: string) => {
      setSection(nextSection);
      window.location.hash = nextSection === 'overview' ? 'cms' : `cms/${nextSection}`;
    },
  };
}
