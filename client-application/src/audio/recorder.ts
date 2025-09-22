import { EventEmitter } from 'events';
import * as record from 'node-record-lpcm16';
import { AudioDevice, AudioChunk, NovaConfig } from '../types';
import { Logger } from '../utils/logger';
import { calculateAudioLevel, detectSilence, validateAudioBuffer } from '../utils';

export interface RecorderEvents {
  'data': (chunk: AudioChunk) => void;
  'silence': (duration: number) => void;
  'speech': () => void;
  'error': (error: Error) => void;
  'start': () => void;
  'stop': () => void;
}

export declare interface AudioRecorder {
  on<U extends keyof RecorderEvents>(event: U, listener: RecorderEvents[U]): this;
  emit<U extends keyof RecorderEvents>(event: U, ...args: Parameters<RecorderEvents[U]>): boolean;
}

export class AudioRecorder extends EventEmitter {
  private logger: Logger;
  private config: NovaConfig;
  private recording: any = null;
  private isRecording: boolean = false;
  private silenceStartTime: number = 0;
  private lastSpeechTime: number = 0;
  private audioBuffer: AudioChunk[] = [];
  private maxBufferDuration: number = 30000; // 30 seconds

  constructor(config: NovaConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  public startRecording(device?: AudioDevice): void {
    if (this.isRecording) {
      this.logger.warn('Recording already in progress');
      return;
    }

    try {
      const options = {
        sampleRate: this.config.audio.sampleRate,
        channels: 1,
        compress: false,
        threshold: 0,
        thresholdStart: null,
        thresholdEnd: null,
        silence: '1.0',
        device: null, // Use default device
        recordProgram: 'arecord'
      };

      this.recording = record.record(options);
      this.isRecording = true;
      this.silenceStartTime = 0;
      this.lastSpeechTime = Date.now();
      this.audioBuffer = [];

      this.recording.stream().on('data', (chunk: Buffer) => {
        this.handleAudioData(chunk);
      });

      this.recording.stream().on('error', (error: Error) => {
        this.logger.error('Recording error:', error);
        this.emit('error', error);
      });

      this.emit('start');
      this.logger.info('Audio recording started');

    } catch (error) {
      this.logger.error('Failed to start recording:', error);
      this.emit('error', error as Error);
    }
  }

  public stopRecording(): Buffer | null {
    if (!this.isRecording || !this.recording) {
      return null;
    }

    try {
      this.recording.stop();
      this.isRecording = false;
      this.emit('stop');
      this.logger.info('Audio recording stopped');

      // Return merged audio buffer
      if (this.audioBuffer.length > 0) {
        const totalLength = this.audioBuffer.reduce((sum, chunk) => sum + chunk.buffer.length, 0);
        const merged = Buffer.alloc(totalLength);
        
        let offset = 0;
        for (const chunk of this.audioBuffer) {
          chunk.buffer.copy(merged, offset);
          offset += chunk.buffer.length;
        }
        
        return merged;
      }

      return null;

    } catch (error) {
      this.logger.error('Failed to stop recording:', error);
      return null;
    }
  }

  private handleAudioData(chunk: Buffer): void {
    if (!validateAudioBuffer(chunk)) {
      this.logger.warn('Invalid audio buffer received');
      return;
    }

    const timestamp = Date.now();
    const audioChunk: AudioChunk = {
      buffer: chunk,
      timestamp,
      duration: (chunk.length / 2) / this.config.audio.sampleRate * 1000
    };

    // Add to buffer and maintain max duration
    this.audioBuffer.push(audioChunk);
    this.trimAudioBuffer();

    const audioLevel = calculateAudioLevel(chunk);
    const isSilent = detectSilence(chunk, this.config.audio.silenceThreshold);

    if (isSilent) {
      if (this.silenceStartTime === 0) {
        this.silenceStartTime = timestamp;
      }

      const silenceDuration = timestamp - this.silenceStartTime;
      if (silenceDuration >= this.config.audio.silenceDuration * 1000) {
        this.emit('silence', silenceDuration);
      }

    } else {
      if (this.silenceStartTime > 0) {
        this.emit('speech');
      }
      this.silenceStartTime = 0;
      this.lastSpeechTime = timestamp;
    }

    this.emit('data', audioChunk);
  }

  private trimAudioBuffer(): void {
    const now = Date.now();
    const cutoffTime = now - this.maxBufferDuration;
    
    this.audioBuffer = this.audioBuffer.filter(chunk => 
      chunk.timestamp > cutoffTime
    );
  }

  public getRecentAudio(durationMs: number): Buffer | null {
    const cutoffTime = Date.now() - durationMs;
    const recentChunks = this.audioBuffer.filter(chunk => 
      chunk.timestamp > cutoffTime
    );

    if (recentChunks.length === 0) {
      return null;
    }

    const totalLength = recentChunks.reduce((sum, chunk) => sum + chunk.buffer.length, 0);
    const merged = Buffer.alloc(totalLength);
    
    let offset = 0;
    for (const chunk of recentChunks) {
      chunk.buffer.copy(merged, offset);
      offset += chunk.buffer.length;
    }
    
    return merged;
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  public getCurrentAudioLevel(): number {
    if (this.audioBuffer.length === 0) {
      return 0;
    }

    const latestChunk = this.audioBuffer[this.audioBuffer.length - 1];
    return calculateAudioLevel(latestChunk.buffer);
  }

  public cleanup(): void {
    if (this.isRecording) {
      this.stopRecording();
    }
    this.audioBuffer = [];
    this.removeAllListeners();
  }
}