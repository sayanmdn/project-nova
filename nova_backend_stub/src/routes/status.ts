import { Router, Request, Response } from 'express';
import { ProcessingStatus, ApiResponse } from '../types';

export const statusRouter = Router();

export const statusStore: Map<string, ProcessingStatus> = new Map();

statusRouter.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  let status = statusStore.get(id);
  
  if (!status) {
    status = {
      id,
      status: 'pending',
      progress: 0,
      message: 'Processing request...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    statusStore.set(id, status);
  } else {
    if (status.status === 'pending') {
      status.status = 'processing';
      status.progress = Math.floor(Math.random() * 50) + 25;
      status.message = 'Processing audio data...';
      status.updatedAt = new Date().toISOString();
    } else if (status.status === 'processing' && status.progress < 100) {
      status.progress = Math.min(100, status.progress + Math.floor(Math.random() * 20) + 10);
      if (status.progress >= 100) {
        status.status = 'completed';
        status.message = 'Processing completed successfully';
      } else {
        status.message = 'Transcribing audio...';
      }
      status.updatedAt = new Date().toISOString();
    }
  }

  const response: ApiResponse<ProcessingStatus> = {
    success: true,
    data: status,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

statusRouter.get('/', (req: Request, res: Response) => {
  const statuses = Array.from(statusStore.values());
  
  const response: ApiResponse<ProcessingStatus[]> = {
    success: true,
    data: statuses,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

statusRouter.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = statusStore.delete(id);

  if (!deleted) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'STATUS_NOT_FOUND',
        message: `Status with ID ${id} not found`,
      },
      timestamp: new Date().toISOString(),
    };
    res.status(404).json(response);
    return;
  }

  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: `Status ${id} deleted successfully` },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});