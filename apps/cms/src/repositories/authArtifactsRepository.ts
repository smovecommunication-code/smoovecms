import { removeFromStorage } from './storage/localStorageStore';

const LEGACY_AUTH_KEYS = ['smove_user', 'smove_users'] as const;

export function clearLegacyAuthArtifacts(): void {
  LEGACY_AUTH_KEYS.forEach((key) => removeFromStorage(key));
}
