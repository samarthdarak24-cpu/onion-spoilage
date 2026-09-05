/**
 * Storage driver factory (spec §11).
 */
import { env } from '../../config/env';
import { LocalStorage } from './local';
import { S3Storage } from './s3';
import type { StorageDriver } from './types';

let instance: StorageDriver | undefined;

export function getStorage(): StorageDriver {
  if (!instance) {
    instance = env.STORAGE_DRIVER === 's3' ? new S3Storage() : new LocalStorage();
  }
  return instance;
}

export type { StorageDriver, StoredObject } from './types';
