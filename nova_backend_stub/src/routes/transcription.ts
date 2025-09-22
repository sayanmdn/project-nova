import { Router, Request, Response } from 'express';
import { TranscriptionRequest, TranscriptionResponse, ApiResponse } from '../types';

export const transcriptionRouter = Router();

export const transcriptionStore: Map<string, TranscriptionResponse> = new Map();

transcriptionRouter.post('/', (req: Request, res: Response) => {
  const request: TranscriptionRequest = req.body;
  
  if (!request.audioId) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'MISSING_AUDIO_ID',
        message: 'Audio ID is required',
      },
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(response);
    return;
  }

  const transcriptionId = `transcription_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const transcriptionResponse: TranscriptionResponse = {
    id: transcriptionId,
    audioId: request.audioId,
    text: 'This is a mock transcription result for testing purposes.',
    confidence: 0.95,
    language: request.language || 'en',
    timestamp: new Date().toISOString(),
    processingTime: Math.floor(Math.random() * 3000) + 500,
  };

  transcriptionStore.set(transcriptionId, transcriptionResponse);

  const response: ApiResponse<TranscriptionResponse> = {
    success: true,
    data: transcriptionResponse,
    timestamp: new Date().toISOString(),
  };

  res.status(201).json(response);
});

transcriptionRouter.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const transcription = transcriptionStore.get(id);

  if (!transcription) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'TRANSCRIPTION_NOT_FOUND',
        message: `Transcription with ID ${id} not found`,
      },
      timestamp: new Date().toISOString(),
    };
    res.status(404).json(response);
    return;
  }

  const response: ApiResponse<TranscriptionResponse> = {
    success: true,
    data: transcription,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

transcriptionRouter.get('/', (req: Request, res: Response) => {
  const transcriptions = Array.from(transcriptionStore.values());
  
  const response: ApiResponse<TranscriptionResponse[]> = {
    success: true,
    data: transcriptions,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

transcriptionRouter.get('/audio/:audioId', (req: Request, res: Response) => {
  const { audioId } = req.params;
  const transcriptions = Array.from(transcriptionStore.values())
    .filter(t => t.audioId === audioId);

  const response: ApiResponse<TranscriptionResponse[]> = {
    success: true,
    data: transcriptions,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});