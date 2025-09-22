export interface WakeWordResponse {
  success: boolean;
  detected: boolean;
  confidence: number;
  timestamp: string;
}

export interface TranscriptionResponse {
  success: boolean;
  transcript: string;
  timestamp: string;
}

export interface ProcessResponse {
  success: boolean;
  response: string;
  timestamp: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  cuda_available: boolean;
  gpu_info: {
    gpu_count: number;
    current_device: number;
    device_name: string;
  };
  version: string;
}

export interface ErrorResponse {
  detail: string;
}

export interface ProcessRequest {
  text: string;
  context?: string;
}

export interface ServerConfig {
  port: number;
  host: string;
  upload: {
    maxSize: number;
    allowedMimeTypes: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: {
      health: number;
      recognise: number;
      listen: number;
      process: number;
    };
  };
}

export interface AudioMetadata {
  filename: string;
  size: number;
  mimetype: string;
  duration?: number;
}

export enum AppState {
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR'
}