import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { apiRouter } from '../routes/api';
import { errorHandler } from '../middleware/errorHandler';
import { AudioData, TranscriptionRequest } from '../types';

export const createTestApp = () => {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/v1', apiRouter);

  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      service: 'Nova Backend API Stub',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  app.use(errorHandler);
  
  return app;
};

export const mockAudioData: Partial<AudioData> = {
  duration: 120,
  format: 'wav',
  sampleRate: 44100,
  channels: 2,
  data: 'mock-audio-data-base64',
};

export const mockTranscriptionRequest: TranscriptionRequest = {
  audioId: 'test-audio-id',
  language: 'en',
  model: 'whisper',
};

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));