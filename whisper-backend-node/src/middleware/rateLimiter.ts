import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { ErrorResponse } from '../types';

const createRateLimiter = (maxRequests: number, message: string) => {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: maxRequests,
    message: {
      detail: message
    } as ErrorResponse,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const errorResponse: ErrorResponse = {
        detail: message
      };
      res.status(429).json(errorResponse);
    }
  });
};

export const healthRateLimiter = createRateLimiter(
  config.rateLimit.maxRequests.health,
  'Too many health check requests, please try again later'
);

export const recogniseRateLimiter = createRateLimiter(
  config.rateLimit.maxRequests.recognise,
  'Too many wake word detection requests, please try again later'
);

export const listenRateLimiter = createRateLimiter(
  config.rateLimit.maxRequests.listen,
  'Too many transcription requests, please try again later'
);

export const processRateLimiter = createRateLimiter(
  config.rateLimit.maxRequests.process,
  'Too many text processing requests, please try again later'
);