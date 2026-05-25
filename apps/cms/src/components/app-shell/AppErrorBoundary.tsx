import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logError } from '../../shared/observability';
import { AppErrorState } from '../../shared/app-shell/AppStatusState';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError({
      scope: 'app_boundary',
      event: 'runtime_render_crash',
      error,
      details: { componentStack: errorInfo.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <AppErrorState
          title="Erreur d'initialisation"
          description="Le runtime applicatif a rencontré une erreur. Rechargez la page."
          actionLabel="Retour au site public"
        />
      );
    }

    return this.props.children;
  }
}
