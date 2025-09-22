import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { audioUpload } from '../middleware/upload';
import { recogniseRateLimiter, listenRateLimiter, processRateLimiter } from '../middleware/rateLimiter';
import { WhisperService } from '../api/whisper';
import { LLMService } from '../api/llm';
import { WakeWordResponse, TranscriptionResponse, ProcessResponse, ProcessRequest } from '../types';
import logger from '../utils/logger';

const router = Router();
const whisperService = new WhisperService();
const llmService = new LLMService();

// Initialize services
whisperService.initialize().catch(error => {
  logger.error('Failed to initialize Whisper service:', error);
});

llmService.initialize().catch(error => {
  logger.error('Failed to initialize LLM service:', error);
});

// Wake word detection endpoint
router.post('/recognise',
  recogniseRateLimiter,
  audioUpload,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('Audio file is required', 400);
    }

    logger.info(`Wake word detection request - File: ${req.file.originalname}, Size: ${req.file.size} bytes`);

    const { detected, confidence } = await whisperService.detectWakeWord(
      req.file.buffer,
      req.file.originalname
    );

    const response: WakeWordResponse = {
      success: true,
      detected,
      confidence,
      timestamp: new Date().toISOString()
    };

    logger.info(`Wake word detection result - Detected: ${detected}, Confidence: ${confidence}`);
    res.json(response);
  })
);

// Audio transcription endpoint
router.post('/listen',
  listenRateLimiter,
  audioUpload,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('Audio file is required', 400);
    }

    logger.info(`Transcription request - File: ${req.file.originalname}, Size: ${req.file.size} bytes`);

    const transcript = await whisperService.transcribeAudio(
      req.file.buffer,
      req.file.originalname
    );

    const response: TranscriptionResponse = {
      success: true,
      transcript,
      timestamp: new Date().toISOString()
    };

    logger.info(`Transcription completed - Text: "${transcript}"`);
    res.json(response);
  })
);

// Text processing endpoint
router.post('/process',
  processRateLimiter,
  [
    body('text')
      .notEmpty()
      .withMessage('Text is required')
      .isLength({ min: 1, max: 1000 })
      .withMessage('Text must be between 1 and 1000 characters'),
    body('context')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Context must be less than 500 characters')
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(`Validation error: ${errors.array().map(e => e.msg).join(', ')}`, 400);
    }

    const { text, context }: ProcessRequest = req.body;

    logger.info(`Text processing request - Text: "${text}", Context: "${context || 'none'}"`);

    const aiResponse = await llmService.processText(text, context);

    const response: ProcessResponse = {
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString()
    };

    logger.info(`Text processing completed - Response: "${aiResponse}"`);
    res.json(response);
  })
);

export default router;