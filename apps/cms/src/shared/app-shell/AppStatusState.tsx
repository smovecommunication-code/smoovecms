import SecurityStatePage from './SecurityStatePage';
import { getPublicSiteUrl } from '../../utils/publicSiteUrl';

interface AppStatusStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export function AppLoadingState({
  title = 'Chargement',
  description = 'Chargement en cours...',
  actionHref = getPublicSiteUrl(),
  actionLabel = 'Retour au site public',
}: Partial<AppStatusStateProps>) {
  return <SecurityStatePage title={title} description={description} actionHref={actionHref} actionLabel={actionLabel} />;
}

export function AppErrorState({
  title = 'Une erreur est survenue',
  description = 'Le contenu est temporairement indisponible.',
  actionHref = getPublicSiteUrl(),
  actionLabel = 'Retour au site public',
}: Partial<AppStatusStateProps>) {
  return <SecurityStatePage title={title} description={description} actionHref={actionHref} actionLabel={actionLabel} />;
}
