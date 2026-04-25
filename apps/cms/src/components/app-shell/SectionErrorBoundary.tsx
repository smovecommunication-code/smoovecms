import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logError } from '../../shared/observability';
import { AppErrorState } from '../../shared/app-shell/AppStatusState';

interface SectionErrorBoundaryProps {
  scope: string;
  children: ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

export default class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError({
      scope: 'page_boundary',
      event: 'page_render_crash',
      error,
      details: {
        section: this.props.scope,
        componentStack: errorInfo.componentStack,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <AppErrorState
          title="Contenu indisponible"
          description="Cette section a rencontré une erreur. Revenez à l’accueil."
          actionLabel="Retour au site public"
        />
      );
    }

    return this.props.children;
  }
}
