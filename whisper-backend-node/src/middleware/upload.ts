import multer from 'multer';
import path from 'path';
import { config } from '../config';
import { AppError } from './errorHandler';

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Invalid file type. Allowed types: ${config.upload.allowedMimeTypes.join(', ')}`, 400));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxSize,
    files: 1
  }
});

export const audioUpload = upload.single('file');