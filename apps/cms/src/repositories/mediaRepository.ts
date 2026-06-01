import { isMediaFile, isMediaFileArray, type MediaFile, type MediaType } from '../domain/contentSchemas';
import { readFromStorage, writeToStorage } from './storage/localStorageStore';
import { extractUploadPublicPath, resolveMediaRecordUrl, resolveMediaUrl } from '../utils/mediaResolver';

const MEDIA_STORAGE_KEY = 'smove_media_files';
const preserveLocalDataUrl = (value: string | undefined): string => {
  const normalized = `${value || ''}`.trim();
  return normalized.startsWith('data:') ? normalized : '';
};

export interface MediaUploadInput {
  name: string;
  type: MediaType;
  file: File;
  uploadedBy: string;
  alt?: string;
  caption?: string;
  tags?: string[];
}

type MediaInput = Partial<MediaFile> & Record<string, unknown>;

const toStringMetadata = (metadata: unknown): Record<string, string> => {
  if (!metadata || typeof metadata !== 'object') return {};
  return Object.fromEntries(
    Object.entries(metadata as Record<string, unknown>).map(([key, value]) => [key, typeof value === 'string' ? value : String(value ?? '')]),
  );
};

const inferMediaType = (file: MediaInput, fallback: MediaType = 'file'): MediaType => {
  const rawType = `${file.type || (file as { mediaType?: string }).mediaType || ''}`.trim().toLowerCase();
  if (rawType === 'document') return 'file';
  if (rawType === 'image' || rawType === 'video' || rawType === 'file') return rawType;
  const mimeType = `${file.mimeType || (file.metadata as Record<string, unknown> | undefined)?.mimeType || ''}`.toLowerCase();
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  const source = `${file.url || file.publicPath || file.filename || file.originalName || file.name || ''}`.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/.test(source) || source.startsWith('data:image/')) return 'image';
  if (/\.(mp4|webm|mov|avi)(\?|#|$)/.test(source) || source.startsWith('data:video/')) return 'video';
  return fallback === 'document' ? 'file' : fallback;
};

const normalizeMedia = (file: MediaInput): MediaFile => {
  const explicitFilename = `${file.filename || file.originalName || ''}`.trim();
  const extractedPublicPath = extractUploadPublicPath(file.publicPath || file.url || file.thumbnailUrl || explicitFilename || file.name);
  const normalizedFilename = (explicitFilename || extractedPublicPath || `${file.name || ''}`.trim()).replace(/^\/?uploads\//, '') || extractedPublicPath.replace(/^\/uploads\//, '');
  const normalizedName = `${file.name || file.originalName || file.label || file.title || normalizedFilename || file.id || 'media-file'}`.trim();
  const normalizedAlt = `${file.alt || ''}`.trim() || normalizedName;
  const nowIso = new Date().toISOString();
  const publicPath = `${file.publicPath || ''}`.trim() || extractedPublicPath || (normalizedFilename ? `/uploads/${normalizedFilename}` : '');
  const resolvedUrl = resolveMediaRecordUrl({ ...file, filename: normalizedFilename, publicPath }) || resolveMediaUrl(file.url) || preserveLocalDataUrl(file.url);
  const thumbnailUrl = resolvedUrl || resolveMediaUrl(file.thumbnailUrl || file.url) || preserveLocalDataUrl(file.thumbnailUrl || file.url);
  const metadata = toStringMetadata(file.metadata);

  return {
    ...(file as MediaFile),
    id: `${file.id || `media_${Date.now()}`}`,
    filename: normalizedFilename,
    originalName: `${file.originalName || ''}`.trim() || normalizedName,
    mimeType: `${file.mimeType || metadata.mimeType || ''}`.trim(),
    publicPath,
    type: inferMediaType(file),
    url: resolvedUrl,
    thumbnailUrl,
    name: normalizedName,
    title: `${file.title || ''}`.trim() || normalizedName,
    label: `${file.label || ''}`.trim() || normalizedName,
    alt: normalizedAlt,
    caption: `${file.caption || ''}`.trim() || normalizedAlt || normalizedName,
    width: typeof file.width === 'number' && file.width >= 0 ? file.width : undefined,
    height: typeof file.height === 'number' && file.height >= 0 ? file.height : undefined,
    size: Number.isFinite(Number(file.size)) && Number(file.size) >= 0 ? Number(file.size) : 0,
    uploadedDate: `${file.uploadedDate || file.createdAt || nowIso}`,
    uploadedBy: `${file.uploadedBy || (file as { ownerUserId?: string }).ownerUserId || 'system'}`,
    tags: Array.isArray(file.tags) ? file.tags.map((tag) => `${tag}`.trim()).filter(Boolean) : [],
    source: `${file.source || 'content-api'}`.trim(),
    metadata,
    createdAt: `${file.createdAt || file.uploadedDate || nowIso}`,
    updatedAt: `${file.updatedAt || nowIso}`,
    archivedAt: typeof file.archivedAt === 'string' ? file.archivedAt : null,
  };
};

export interface MediaRepository {
  getAll(): MediaFile[];
  getById(id: string): MediaFile | undefined;
  save(file: MediaFile): void;
  delete(id: string): void;
  upload(data: MediaUploadInput): Promise<MediaFile>;
  getByType(type: MediaType): MediaFile[];
  search(query: string): MediaFile[];
  replaceAll(files: Array<Partial<MediaFile>>): MediaFile[];
}


class LocalMediaRepository implements MediaRepository {
  private memoryFiles: MediaFile[] = [];

  private hasStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  getAll(): MediaFile[] {
    const files = this.hasStorage() ? readFromStorage(MEDIA_STORAGE_KEY, isMediaFileArray, []) : this.memoryFiles;
    const normalized = files.map(normalizeMedia);
    this.memoryFiles = normalized;
    if (this.hasStorage() && JSON.stringify(files) !== JSON.stringify(normalized)) {
      writeToStorage(MEDIA_STORAGE_KEY, normalized);
    }
    return normalized;
  }

  getById(id: string): MediaFile | undefined {
    return this.getAll().find((file) => file.id === id);
  }

  save(file: MediaFile): void {
    if (!isMediaFile(file)) {
      throw new Error('Invalid media file payload');
    }

    const trustedFile = normalizeMedia(file);
    const files = this.getAll();
    const index = files.findIndex((candidate) => candidate.id === trustedFile.id);

    if (index >= 0) {
      files[index] = trustedFile;
    } else {
      files.push(trustedFile);
    }

    this.memoryFiles = files;
    writeToStorage(MEDIA_STORAGE_KEY, files);
  }

  delete(id: string): void {
    const nextFiles = this.getAll().filter((file) => file.id !== id);
    this.memoryFiles = nextFiles;
    writeToStorage(MEDIA_STORAGE_KEY, nextFiles);
  }

  upload(data: MediaUploadInput): Promise<MediaFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const encodedResult = event.target?.result;
        if (typeof encodedResult !== 'string') {
          reject(new Error('Encoded media payload is missing'));
          return;
        }

        const mediaFile: MediaFile = {
          id: Date.now().toString(),
          name: data.name,
          type: data.type,
          url: encodedResult,
          thumbnailUrl: encodedResult,
          size: data.file.size,
          uploadedDate: new Date().toISOString(),
          uploadedBy: data.uploadedBy,
          alt: data.alt || data.name,
          title: data.name,
          label: data.name,
          caption: data.caption || data.alt || data.name,
          tags: data.tags || [],
          source: 'local-upload',
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (!isMediaFile(mediaFile)) {
          reject(new Error('Invalid uploaded media payload'));
          return;
        }

        this.save(mediaFile);
        resolve(mediaFile);
      };

      reader.onerror = () => {
        reject(new Error('Unable to read media file'));
      };

      reader.readAsDataURL(data.file);
    });
  }

  getByType(type: MediaType): MediaFile[] {
    return this.getAll().filter((file) => file.type === type);
  }

  search(query: string): MediaFile[] {
    const normalizedQuery = query.toLowerCase();

    return this.getAll().filter(
      (file) =>
        file.name.toLowerCase().includes(normalizedQuery) ||
        file.alt?.toLowerCase().includes(normalizedQuery) ||
        file.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)),
    );
  }

  replaceAll(files: Array<Partial<MediaFile>>): MediaFile[] {
    const normalized = files.map((file) => normalizeMedia(file as MediaInput)).filter(isMediaFile);
    this.memoryFiles = normalized;
    writeToStorage(MEDIA_STORAGE_KEY, normalized);
    return normalized;
  }
}

export const mediaRepository: MediaRepository = new LocalMediaRepository();
