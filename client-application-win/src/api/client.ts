import axios, { AxiosInstance, AxiosResponse } from 'axios';
import FormData from 'form-data';
import { NovaConfig, WakeWordResponse, TranscriptionResponse, ProcessResponse } from '../types';
import { Logger } from '../utils/logger';

export class NovaApiClient {
  private client: AxiosInstance;
  private logger: Logger;
  private config: NovaConfig;

  constructor(config: NovaConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    this.client = axios.create({
      baseURL: config.server.baseUrl,
      timeout: config.server.timeout,
      headers: {
        'User-Agent': 'Nova-CLI/1.0.0'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        if (config.data && config.headers?.['Content-Type'] === 'application/json') {
          this.logger.debug('Request payload:', JSON.stringify(config.data, null, 2));
        }
        return config;
      },
      (error) => {
        this.logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error('API Response Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          url: error.config?.url,
          responseData: error.response?.data,
          headers: error.response?.headers
        });
        return Promise.reject(error);
      }
    );
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  public async detectWakeWord(audioBuffer: Buffer): Promise<WakeWordResponse> {
    let base64Audio: string = '';

    try {
      // Validate audio buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Audio buffer is empty');
      }

      if (audioBuffer.length < 1000) {
        this.logger.warn(`Audio buffer is very small: ${audioBuffer.length} bytes`);
      }

      // Convert audio buffer to base64
      base64Audio = audioBuffer.toString('base64');

      const payload = {
        audio_buffer: {
          audio_data: base64Audio,
          format: "wav",
          sample_rate: this.config.audio.sampleRate,
          channels: 1,
          bit_depth: 16
        }
      };

      this.logger.debug(`Sending wake word detection request with ${audioBuffer.length} bytes of audio`);

      const response: AxiosResponse<WakeWordResponse> = await this.client.post(
        '/api/v1/recognise',
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      this.logger.error('Wake word detection failed:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        audioBufferSize: audioBuffer.length,
        base64Length: base64Audio.length
      });
      throw new Error(`Wake word detection failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  public async transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResponse> {
    let base64Audio: string = '';

    try {
      // Convert audio buffer to base64
      base64Audio = audioBuffer.toString('base64');

      const payload = {
        audio_buffer: {
          audio_data: base64Audio,
          format: "wav",
          sample_rate: this.config.audio.sampleRate,
          channels: 1,
          bit_depth: 16
        }
      };

      this.logger.debug(`Sending transcription request with ${audioBuffer.length} bytes of audio`);

      const response: AxiosResponse<TranscriptionResponse> = await this.client.post(
        '/api/v1/listen',
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      this.logger.error('Audio transcription failed:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        audioBufferSize: audioBuffer.length,
        base64Length: base64Audio.length
      });
      throw new Error(`Audio transcription failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  public async processText(text: string, context?: string): Promise<ProcessResponse> {
    try {
      const response: AxiosResponse<ProcessResponse> = await this.client.post(
        '/api/v1/process',
        {
          text,
          context
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Text processing failed:', error);
      throw new Error(`Text processing failed: ${error}`);
    }
  }

  public updateConfig(config: NovaConfig): void {
    this.config = config;
    this.client.defaults.baseURL = config.server.baseUrl;
    this.client.defaults.timeout = config.server.timeout;
  }
}