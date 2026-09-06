/**
 * Storage driver abstraction (spec §11).
 *
 * The backend is storage-agnostic: the local driver writes to the filesystem,
 * and an S3-compatible driver can be swapped in via STORAGE_DRIVER with no
 * change to callers.
 */
export interface StoredObject {
  storageKey: string;
  url: string;
  size: number;
  mimeType?: string;
}

export interface SaveInput {
  buffer: Buffer;
  originalFilename?: string;
  mimeType?: string;
}

export interface StorageDriver {
  save(file: SaveInput): Promise<StoredObject>;
  delete(storageKey: string): Promise<void>;
  url(storageKey: string): Promise<string>;
  exists(storageKey: string): Promise<boolean>;
}
