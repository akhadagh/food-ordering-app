import multer from 'multer';
import { env } from '../config/env.js';
import { badRequest } from '../utils/errors.js';

/**
 * Upload middleware.
 *
 * Files are held in memory, never written straight to disk: the filesystem
 * on Vercel is ephemeral and the local driver is refused in production.
 *
 * The original multipart endpoint was entirely broken - it tried to insert
 * the dish name before the multipart body had been parsed, so every upload
 * failed with a NOT NULL constraint error (audit finding P1-02).
 */
const storage = multer.memoryStorage();

export const uploadImage = multer({
  storage,
  limits: {
    fileSize: env.uploadMaxBytes,
    files: 1,
  },
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      cb(badRequest('Upload a JPEG, PNG, WebP or GIF image.'));
      return;
    }
    cb(null, true);
  },
}).single('image');

export default { uploadImage };
