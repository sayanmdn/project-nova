import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { healthRateLimiter } from '../middleware/rateLimiter';
import { HealthResponse } from '../types';
import { WhisperService } from '../api/whisper';
import { LLMService } from '../api/llm';

const router = Router();

router.get('/', healthRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const whisperService = new WhisperService();
  const llmService = new LLMService();

  try {
    // Initialize services if not already done
    await whisperService.initialize();
    const gpuInfo = await whisperService.getGpuInfo();
    const cudaAvailable = gpuInfo.gpu_count > 0;

    const healthResponse: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      cuda_available: cudaAvailable,
      gpu_info: gpuInfo,
      version: '1.0.0'
    };

    res.json(healthResponse);
  } catch (error) {
    const healthResponse: HealthResponse = {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      cuda_available: false,
      gpu_info: {
        gpu_count: 0,
        current_device: 0,
        device_name: 'CPU'
      },
      version: '1.0.0'
    };

    res.status(503).json(healthResponse);
  }
}));

export default router;