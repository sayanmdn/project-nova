import { Router } from 'express';
import { audioRouter } from './audio';
import { transcriptionRouter } from './transcription';
import { statusRouter } from './status';

export const apiRouter = Router();

apiRouter.use('/audio', audioRouter);
apiRouter.use('/transcription', transcriptionRouter);
apiRouter.use('/status', statusRouter);

apiRouter.get('/', (req, res) => {
  res.json({
    message: 'Nova Backend API Layer 1 Stub',
    version: '1.0.0',
    endpoints: {
      audio: '/api/v1/audio',
      transcription: '/api/v1/transcription',
      status: '/api/v1/status',
    },
  });
});