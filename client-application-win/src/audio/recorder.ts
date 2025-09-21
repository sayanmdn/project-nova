import { EventEmitter } from 'events';
import mic from 'mic';
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
  private micInstance: any = null;
  private micInputStream: any = null;
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
      const micOptions = {
        rate: this.config.audio.sampleRate,
        channels: 1,
        debug: false,
        exitOnSilence: 0,
        device: device?.name || 'default',
        additionalParameters: ['--volume', '5']
      };

      this.micInstance = mic(micOptions);
      this.micInputStream = this.micInstance.getAudioStream();

      this.isRecording = true;
      this.silenceStartTime = 0;
      this.lastSpeechTime = Date.now();
      this.audioBuffer = [];

      this.micInputStream.on('data', (chunk: Buffer) => {
        this.handleAudioData(chunk);
      });

      this.micInputStream.on('error', (error: Error) => {
        this.logger.error('Recording stream error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          micOptions: micOptions
        });
        this.isRecording = false;
        this.micInstance = null;
        this.micInputStream = null;
        this.emit('error', new Error(`Audio recording failed: ${error.message}`));
      });

      this.micInstance.start();
      this.emit('start');
      this.logger.info('Audio recording started with mic library');

    } catch (error) {
      this.logger.error('Failed to start recording - catch block:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name,
        sampleRate: this.config.audio.sampleRate,
        deviceName: device?.name
      });
      this.emit('error', new Error(`Failed to initialize recording: ${(error as Error).message}`));
    }
  }

  public stopRecording(): Buffer | null {
    if (!this.isRecording || !this.micInstance) {
      return null;
    }

    try {
      this.micInstance.stop();
      this.isRecording = false;
      this.micInstance = null;
      this.micInputStream = null;
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

  private amplifyAudio(buffer: Buffer, gain: number): Buffer {
    // Create a new buffer for the amplified audio
    const amplified = Buffer.alloc(buffer.length);
    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
    const amplifiedSamples = new Int16Array(amplified.buffer);

    for (let i = 0; i < samples.length; i++) {
      // Amplify the sample and clamp to prevent distortion
      let amplifiedValue = samples[i] * gain;
      amplifiedValue = Math.max(-32768, Math.min(32767, amplifiedValue));
      amplifiedSamples[i] = Math.round(amplifiedValue);
    }

    return amplified;
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
    if (this.micInstance) {
      try {
        this.micInstance.stop();
      } catch (error) {
        this.logger.warn('Error stopping mic during cleanup:', error);
      }
      this.micInstance = null;
      this.micInputStream = null;
    }
    this.audioBuffer = [];
    this.removeAllListeners();
  }
}