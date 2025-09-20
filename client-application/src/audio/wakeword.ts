import { EventEmitter } from 'events';
import { NovaApiClient } from '../api/client';
import { AudioChunk, NovaConfig, WakeWordResponse } from '../types';
import { Logger } from '../utils/logger';
import { sleep } from '../utils';

export interface WakeWordEvents {
  'detected': (confidence: number, timestamp: string) => void;
  'error': (error: Error) => void;
  'processing': (chunk: AudioChunk) => void;
}

export declare interface WakeWordDetector {
  on<U extends keyof WakeWordEvents>(event: U, listener: WakeWordEvents[U]): this;
  emit<U extends keyof WakeWordEvents>(event: U, ...args: Parameters<WakeWordEvents[U]>): boolean;
}

export class WakeWordDetector extends EventEmitter {
  private logger: Logger;
  private config: NovaConfig;
  private apiClient: NovaApiClient;
  private isListening: boolean = false;
  private processingQueue: AudioChunk[] = [];
  private isProcessing: boolean = false;
  private lastDetectionTime: number = 0;

  constructor(config: NovaConfig, apiClient: NovaApiClient, logger: Logger) {
    super();
    this.config = config;
    this.apiClient = apiClient;
    this.logger = logger;
  }

  public startListening(): void {
    if (this.isListening) {
      this.logger.warn('Wake word detection already active');
      return;
    }

    this.isListening = true;
    this.processingQueue = [];
    this.isProcessing = false;
    this.lastDetectionTime = 0;

    this.logger.info('Wake word detection started');
    this.processQueue();
  }

  public stopListening(): void {
    this.isListening = false;
    this.processingQueue = [];
    this.isProcessing = false;
    this.logger.info('Wake word detection stopped');
  }

  public addAudioChunk(chunk: AudioChunk): void {
    if (!this.isListening) {
      return;
    }

    // Check cooldown period
    const now = Date.now();
    if (now - this.lastDetectionTime < this.config.wakeWord.cooldownPeriod * 1000) {
      return;
    }

    this.processingQueue.push(chunk);
    
    // Keep only recent chunks (last 5 seconds)
    const cutoffTime = now - 5000;
    this.processingQueue = this.processingQueue.filter(c => c.timestamp > cutoffTime);
  }

  private async processQueue(): Promise<void> {
    while (this.isListening) {
      if (this.processingQueue.length === 0 || this.isProcessing) {
        await sleep(100);
        continue;
      }

      const chunk = this.processingQueue.shift();
      if (!chunk) {
        continue;
      }

      await this.processChunk(chunk);
      await sleep(50); // Small delay between processing
    }
  }

  private async processChunk(chunk: AudioChunk): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.emit('processing', chunk);

    try {
      const response = await this.detectWakeWordInChunk(chunk);
      
      if (response.success && response.detected && 
          response.confidence >= this.config.wakeWord.confidenceThreshold) {
        
        this.lastDetectionTime = Date.now();
        this.logger.info(`Wake word detected with confidence: ${response.confidence}`);
        this.emit('detected', response.confidence, response.timestamp);
      }

    } catch (error) {
      this.logger.error('Wake word detection error:', error);
      this.emit('error', error as Error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async detectWakeWordInChunk(chunk: AudioChunk): Promise<WakeWordResponse> {
    try {
      // Convert audio chunk to format expected by API
      const audioBuffer = this.convertToMp3Buffer(chunk.buffer);
      return await this.apiClient.detectWakeWord(audioBuffer);
    } catch (error) {
      throw new Error(`Failed to detect wake word: ${error}`);
    }
  }

  private convertToMp3Buffer(buffer: Buffer): Buffer {
    // For now, return the buffer as-is
    // In a real implementation, you would convert PCM to MP3
    // This would require additional audio processing libraries
    return buffer;
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  public getQueueSize(): number {
    return this.processingQueue.length;
  }

  public updateConfig(config: NovaConfig): void {
    this.config = config;
  }

  public cleanup(): void {
    this.stopListening();
    this.removeAllListeners();
  }
}