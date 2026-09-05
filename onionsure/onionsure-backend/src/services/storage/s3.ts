/**
 * S3-compatible storage driver (spec §11).
 *
 * Implemented as a thin, dependency-free placeholder that documents the
 * interface contract. The default deployment uses LocalStorage; enabling S3
 * requires the AWS SDK and credentials. We intentionally do NOT pull in a
 * heavy SDK here so the base image stays lean — wire your bucket client in
 * this class's methods when STORAGE_DRIVER=s3 is selected.
 */
import { internal } from '../../utils/errors';
import type { SaveInput, StorageDriver, StoredObject } from './types';

export class S3Storage implements StorageDriver {
  async save(_file: SaveInput): Promise<StoredObject> {
    throw internal('S3 storage driver is not configured in this build (STORAGE_DRIVER=local)');
  }

  async delete(_storageKey: string): Promise<void> {
    throw internal('S3 storage driver is not configured in this build (STORAGE_DRIVER=local)');
  }

  async url(_storageKey: string): Promise<string> {
    throw internal('S3 storage driver is not configured in this build (STORAGE_DRIVER=local)');
  }

  async exists(_storageKey: string): Promise<boolean> {
    throw internal('S3 storage driver is not configured in this build (STORAGE_DRIVER=local)');
  }
}
