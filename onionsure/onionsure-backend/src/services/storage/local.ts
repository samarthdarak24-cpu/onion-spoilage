/**
 * Local filesystem storage driver (default, spec §11).
 *
 * Files are written to UPLOAD_DIR using a content-derived key so re-uploads of
 * identical bytes are de-duplicated and URLs are stable.
 */
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { env } from '../../config/env';
import { internal } from '../../utils/errors';
import type { SaveInput, StorageDriver, StoredObject } from './types';

function extensionFor(filename?: string, mimeType?: string): string {
  if (filename && path.extname(filename)) return path.extname(filename).toLowerCase();
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/webp') return '.webp';
  return '.bin';
}

export class LocalStorage implements StorageDriver {
  private readonly root: string;

  constructor() {
    this.root = path.resolve(process.cwd(), env.UPLOAD_DIR);
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
  }

  async save(file: SaveInput): Promise<StoredObject> {
    await this.ensureDir();
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex').slice(0, 32);
    const key = `${hash}${extensionFor(file.originalFilename, file.mimeType)}`;
    const fullPath = path.join(this.root, key);
    await fs.writeFile(fullPath, file.buffer);
    return {
      storageKey: key,
      url: `/uploads/${key}`,
      size: file.buffer.length,
      mimeType: file.mimeType,
    };
  }

  async delete(storageKey: string): Promise<void> {
    const fullPath = path.join(this.root, path.basename(storageKey));
    await fs.rm(fullPath, { force: true });
  }

  async url(storageKey: string): Promise<string> {
    return `/uploads/${path.basename(storageKey)}`;
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.root, path.basename(storageKey)));
      return true;
    } catch {
      return false;
    }
  }
}

export async function resolveLocalUrl(storageKey: string): Promise<string> {
  const base = env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const key = path.basename(storageKey);
  // Local driver serves uploads statically at /uploads/:key.
  try {
    const exists = await new LocalStorage().exists(key);
    if (!exists) throw internal('Image asset not found on disk');
  } catch (err) {
    if (err instanceof Error && err.name === 'AppError') throw err;
  }
  return `${base}/uploads/${key}`;
}
