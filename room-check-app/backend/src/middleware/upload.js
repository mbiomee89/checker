import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { badRequest } from '../utils/errors.js';

export const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || './backend/uploads');
const PHOTOS_DIR = path.join(UPLOAD_ROOT, 'inspection-photos');

fs.mkdirSync(PHOTOS_DIR, { recursive: true });

const ALLOWED_MIME = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
]);

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PHOTOS_DIR),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME.get(file.mimetype) || path.extname(file.originalname) || '';
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

export const uploadInspectionPhoto = multer({
  storage,
  limits: { fileSize: MAX_PHOTO_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) return cb(badRequest('Only JPEG and PNG photos are allowed'));
    cb(null, true);
  },
}).single('photo');

function sniffPhotoMime(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  return null;
}

export function assertSniffedPhoto(req, _res, next) {
  if (!req.file) return next(badRequest('Photo file is required'));
  const buffer = fs.readFileSync(req.file.path);
  const sniffed = sniffPhotoMime(buffer);
  if (!sniffed) {
    fs.unlink(req.file.path, () => {});
    return next(badRequest('File content does not match an allowed image type'));
  }
  req.file.mimetype = sniffed;
  next();
}

export function photoPathToUrl(filePath) {
  return `/uploads/inspection-photos/${path.basename(filePath)}`;
}

export function deleteUploadFile(filePath) {
  fs.unlink(filePath, () => {});
}
