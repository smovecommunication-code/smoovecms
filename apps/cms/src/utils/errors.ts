import { ContentApiError } from './contentApi';

export function getErrorMessage(error: unknown): string {
  if (error instanceof ContentApiError) {
    const message = error.message || error.code || 'Une erreur API est survenue.';
    if (error.status >= 500) {
      return `${message} (${error.code}). Réessayez ou contactez le support si le problème persiste.`;
    }
    return message;
  }

  if (error instanceof Error) {
    return error.message || 'Une erreur inattendue est survenue.';
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim()) return record.message;
    if (typeof record.error === 'string' && record.error.trim()) return record.error;
  }

  return 'Une erreur inattendue est survenue.';
}
