export interface AudioData {
  id: string;
  timestamp: string;
  duration: number;
  format: string;
  sampleRate: number;
  channels: number;
  data?: string;
}

export interface TranscriptionRequest {
  audioId: string;
  language?: string;
  model?: string;
}

export interface TranscriptionResponse {
  id: string;
  audioId: string;
  text: string;
  confidence: number;
  language: string;
  timestamp: string;
  processingTime: number;
}

export interface ProcessingStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}