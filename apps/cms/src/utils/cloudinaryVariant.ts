export type CloudinaryVariant = 'thumbnail' | 'card' | 'hero' | 'contain';

const CLOUDINARY_UPLOAD_SEGMENT = '/upload/';
const TRANSFORMATIONS: Record<CloudinaryVariant, string> = {
  thumbnail: 'c_fill,w_360,h_240,f_auto,q_auto',
  card: 'c_fill,w_800,h_500,f_auto,q_auto',
  hero: 'c_fill,w_1920,h_1080,f_auto,q_auto',
  contain: 'c_fit,w_800,h_800,f_auto,q_auto',
};

export function getCloudinaryVariant(url: string, variant: CloudinaryVariant): string {
  const normalized = `${url || ''}`.trim();
  if (!normalized || !/^https?:\/\/res\.cloudinary\.com\//i.test(normalized) || !normalized.includes(CLOUDINARY_UPLOAD_SEGMENT)) return normalized;
  const [base, suffix] = normalized.split(CLOUDINARY_UPLOAD_SEGMENT, 2);
  if (!suffix) return normalized;
  return `${base}${CLOUDINARY_UPLOAD_SEGMENT}${TRANSFORMATIONS[variant]}/${suffix}`;
}
