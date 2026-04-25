import { AuthProvider, useAuth } from './contexts/AuthContext';
import CMSLoginPage from './CMSLoginPage';
import CMSRegisterPage from './CMSRegisterPage';
import CMSDashboard from './components/cms/CMSDashboard';
import CMSAppShell from './components/cms/CMSAppShell';
import SecurityStatePage from './shared/app-shell/SecurityStatePage';
import { AppLoadingState } from './shared/app-shell/AppStatusState';
import AppErrorBoundary from './components/app-shell/AppErrorBoundary';
import SectionErrorBoundary from './components/app-shell/SectionErrorBoundary';
import CMSAccountPage from './CMSAccountPage';
import { useCmsNavigation } from './cmsRouting';

function CMSContent() {
  const { isAuthenticated, isAuthReady, canAccessCMS, cmsEnabled, registrationEnabled } = useAuth();
  const { page, section, setSection } = useCmsNavigation({
    isAuthenticated,
    isAuthReady,
    canAccessCMS,
    cmsEnabled,
    registrationEnabled,
  });

  if (page === 'auth-loading') {
    return <AppLoadingState title="Vérification de session" description="Validation de votre session en cours..." actionHref="#login" actionLabel="Connexion" />;
  }

  if (page === 'login') {
    return <CMSLoginPage />;
  }

  if (page === 'register') {
    return <CMSRegisterPage />;
  }

  if (page === 'cms-unavailable') {
    return <SecurityStatePage title="CMS désactivé" description="Le CMS est désactivé dans cet environnement." actionHref="#login" actionLabel="Connexion" />;
  }

  if (page === 'cms-forbidden') {
    return <SecurityStatePage title="Accès refusé" description="Votre session est valide mais vous n'avez pas les droits admin/éditoriaux requis." actionHref="#account" actionLabel="Mon compte" />;
  }

  if (window.location.hash === '#account') {
    return <CMSAccountPage />;
  }

  return (
    <CMSAppShell>
      <SectionErrorBoundary scope="cms-dashboard">
        <CMSDashboard currentSection={section} onSectionChange={setSection} />
      </SectionErrorBoundary>
    </CMSAppShell>
  );
}

export default function CMSApp() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <CMSContent />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
