import { Router, Request, Response } from 'express';
import { AudioData, ApiResponse } from '../types';

export const audioRouter = Router();

export const audioStore: Map<string, AudioData> = new Map();

audioRouter.post('/upload', (req: Request, res: Response) => {
  const audioId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const audioData: AudioData = {
    id: audioId,
    timestamp: new Date().toISOString(),
    duration: req.body.duration || 0,
    format: req.body.format || 'wav',
    sampleRate: req.body.sampleRate || 44100,
    channels: req.body.channels || 1,
    data: req.body.data,
  };

  audioStore.set(audioId, audioData);

  const response: ApiResponse<AudioData> = {
    success: true,
    data: audioData,
    timestamp: new Date().toISOString(),
  };

  res.status(201).json(response);
});

audioRouter.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const audioData = audioStore.get(id);

  if (!audioData) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'AUDIO_NOT_FOUND',
        message: `Audio with ID ${id} not found`,
      },
      timestamp: new Date().toISOString(),
    };
    res.status(404).json(response);
    return;
  }

  const response: ApiResponse<AudioData> = {
    success: true,
    data: audioData,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

audioRouter.get('/', (req: Request, res: Response) => {
  const audioList = Array.from(audioStore.values());
  
  const response: ApiResponse<AudioData[]> = {
    success: true,
    data: audioList,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

audioRouter.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = audioStore.delete(id);

  if (!deleted) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'AUDIO_NOT_FOUND',
        message: `Audio with ID ${id} not found`,
      },
      timestamp: new Date().toISOString(),
    };
    res.status(404).json(response);
    return;
  }

  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: `Audio ${id} deleted successfully` },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});