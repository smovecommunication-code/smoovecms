export const SLUG_PATTERN: RegExp;
export const MEDIA_REFERENCE_PREFIX: 'media:';
export const normalizeSlug: (value: string | undefined, fallback?: string, defaultSlug?: string) => string;
export const isValidSlug: (value: string | undefined) => boolean;
export const isHttpUrl: (value: string | undefined) => boolean;
export const isValidOptionalHttpUrl: (value: string | undefined) => boolean;
export const isValidContentHref: (value: string | undefined) => boolean;
export const isMediaReference: (value: string | undefined) => boolean;
export const mediaIdFromReference: (value: string) => string;
export const toMediaReference: (mediaId: string) => string;
export const mediaReferenceExists: (value: string | undefined, hasMediaById: (mediaId: string) => boolean) => boolean;
export const isValidMediaFieldValue: (
  value: string | undefined,
  options?: { allowInlineText?: boolean; hasMediaById?: (mediaId: string) => boolean },
) => boolean;
export const requiredTrimmed: (value: unknown) => string;
export const hasMinTrimmedLength: (value: unknown, min: number) => boolean;
export const normalizeStringArray: (value: unknown) => string[];
