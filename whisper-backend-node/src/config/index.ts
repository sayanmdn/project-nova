import { ServerConfig } from '../types';
import * as dotenv from 'dotenv';

dotenv.config();

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  upload: {
    maxSize: parseInt(process.env.MAX_UPLOAD_SIZE || '26214400', 10), // 25MB
    allowedMimeTypes: [
      'audio/wav',
      'audio/wave',
      'audio/mpeg',
      'audio/mp3',
      'audio/x-wav'
    ]
  },
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: {
      health: parseInt(process.env.RATE_LIMIT_HEALTH || '100', 10),
      recognise: parseInt(process.env.RATE_LIMIT_RECOGNISE || '60', 10),
      listen: parseInt(process.env.RATE_LIMIT_LISTEN || '30', 10),
      process: parseInt(process.env.RATE_LIMIT_PROCESS || '20', 10)
    }
  }
};

export const whisperConfig = {
  model: process.env.WHISPER_MODEL || 'base',
  device: process.env.WHISPER_DEVICE || 'cuda',
  language: process.env.WHISPER_LANGUAGE || 'en'
};

export const wakeWordConfig = {
  phrase: process.env.WAKE_PHRASE || 'hi nova',
  threshold: parseFloat(process.env.WAKE_THRESHOLD || '0.8')
};