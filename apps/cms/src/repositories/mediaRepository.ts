import { isMediaFile, isMediaFileArray, type MediaFile, type MediaType } from '../domain/contentSchemas';
import { readFromStorage, writeToStorage } from './storage/localStorageStore';

const MEDIA_STORAGE_KEY = 'smove_media_files';

export interface MediaUploadInput {
  name: string;
  type: MediaType;
  file: File;
  uploadedBy: string;
  alt?: string;
  caption?: string;
  tags?: string[];
}

const normalizeMedia = (file: MediaFile): MediaFile => {
  const normalizedName = file.name.trim();
  const normalizedAlt = file.alt?.trim() || normalizedName;
  const nowIso = new Date().toISOString();

  return {
    ...file,
    name: normalizedName,
    title: file.title?.trim() || normalizedName,
    label: file.label?.trim() || normalizedName,
    alt: normalizedAlt,
    caption: file.caption?.trim() || normalizedAlt || normalizedName,
    tags: file.tags.map((tag) => tag.trim()).filter(Boolean),
    source: file.source?.trim() || 'local-storage',
    metadata: file.metadata || {},
    createdAt: file.createdAt || file.uploadedDate || nowIso,
    updatedAt: file.updatedAt || nowIso,
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
  replaceAll(files: MediaFile[]): MediaFile[];
}


class LocalMediaRepository implements MediaRepository {
  getAll(): MediaFile[] {
    const files = readFromStorage(MEDIA_STORAGE_KEY, isMediaFileArray, []);
    const normalized = files.map(normalizeMedia);
    if (JSON.stringify(files) !== JSON.stringify(normalized)) {
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

    writeToStorage(MEDIA_STORAGE_KEY, files);
  }

  delete(id: string): void {
    writeToStorage(
      MEDIA_STORAGE_KEY,
      this.getAll().filter((file) => file.id !== id),
    );
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

  replaceAll(files: MediaFile[]): MediaFile[] {
    const normalized = files.filter(isMediaFile).map(normalizeMedia);
    writeToStorage(MEDIA_STORAGE_KEY, normalized);
    return normalized;
  }
}

export const mediaRepository: MediaRepository = new LocalMediaRepository();
