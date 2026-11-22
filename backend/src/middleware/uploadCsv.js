import multer from 'multer';
import { AppError } from '../utils/AppError.js';

const MAX_CSV_BYTES = 2 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_CSV_BYTES,
    files: 1,
  },
  fileFilter(req, file, callback) {
    const name = String(file.originalname || '').toLowerCase();
    const allowedMimeTypes = new Set([
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'text/plain',
      'application/octet-stream',
    ]);

    if (!name.endsWith('.csv') || !allowedMimeTypes.has(file.mimetype)) {
      return callback(
        new AppError(400, 'Upload a CSV file with a .csv extension.'),
      );
    }

    return callback(null, true);
  },
});

export const uploadCsv = upload.single('file');
