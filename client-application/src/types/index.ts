export interface NovaConfig {
  server: {
    baseUrl: string;
    timeout: number;
  };
  audio: {
    sampleRate: number;
    channels: number;
    chunkDuration: number;
    silenceThreshold: number;
    silenceDuration: number;
  };
  wakeWord: {
    confidenceThreshold: number;
    cooldownPeriod: number;
  };
}

export interface AudioDevice {
  id: number;
  name: string;
  channels: number;
  isDefault: boolean;
}

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

export interface AudioChunk {
  buffer: Buffer;
  timestamp: number;
  duration: number;
}

export enum AppState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  TRIGGERED = 'TRIGGERED',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  RESPONDING = 'RESPONDING',
  ERROR = 'ERROR'
}

export interface CLIOptions {
  device?: number;
  config?: string;
  verbose?: boolean;
  server?: string;
  chunkDuration?: number;
  confidenceThreshold?: number;
  silenceThreshold?: number;
}

export interface AudioMetrics {
  level: number;
  isRecording: boolean;
  state: AppState;
}