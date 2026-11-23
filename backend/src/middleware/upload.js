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

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const uploader = multer({
  storage,
  limits: {
    fileSize: env.uploadMaxBytes,
    files: 9,
  },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      cb(badRequest('Upload a JPEG, PNG, WebP or GIF image.'));
      return;
    }
    cb(null, true);
  },
});

/** A single image - kept for clients that send one `image` field. */
export const uploadImage = uploader.single('image');

/**
 * A dish gallery. Accepts one legacy `image` field and/or up to eight
 * `images` fields in the same request.
 */
export const uploadMenuImages = uploader.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 8 },
]);

export function uploadedFiles(req) {
  const files = req.files || {};
  return [...(files.image || []), ...(files.images || [])];
}

export default { uploadImage, uploadMenuImages, uploadedFiles };
