/**
 * Multipart upload middleware (spec §11).
 *
 * Multer 2.x with an in-memory store (we persist through the storage driver,
 * not to a temp dir). Restricts to images and the configured max size so a
 * bad upload becomes a clean VALIDATION_ERROR, never a crash.
 */
import multer, { MulterError } from 'multer';
import { env } from '../config/env';
import { badRequest } from '../utils/errors';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      // Use a real MulterError so errorHandler maps it to VALIDATION_ERROR
      cb(new MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
      return;
    }
    cb(null, true);
  },
});

/** Single image field `image`. */
export const uploadImage = upload.single('image');

/** Multiple images field `images` (up to limit). */
export const uploadImages = upload.array('images', 10);

/** Guard wrapper so multer errors surface as our error envelope. */
export function handleUploadError(err: unknown): void {
  if (err instanceof Error && err.message.startsWith('LIMIT_')) {
    throw badRequest(err.message);
  }
  throw err;
}
