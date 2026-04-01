import multer from 'multer';

// Allowed file types
const FILE_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf'
};

// Use memory storage to store files as buffers in memory
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const isValid = !!FILE_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error('Invalid file type! Only JPG, JPEG, PNG, WEBP, AVIF, HEIC, and PDF are allowed.');
    cb(error, isValid);
  }
});
