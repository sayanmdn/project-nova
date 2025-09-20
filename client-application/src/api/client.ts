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
          message: error.message,
          url: error.config?.url
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
    try {
      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename: 'audio.mp3',
        contentType: 'audio/mpeg'
      });

      const response: AxiosResponse<WakeWordResponse> = await this.client.post(
        '/api/v1/recognise',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Length': formData.getLengthSync()
          }
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Wake word detection failed:', error);
      throw new Error(`Wake word detection failed: ${error}`);
    }
  }

  public async transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResponse> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename: 'audio.mp3',
        contentType: 'audio/mpeg'
      });

      const response: AxiosResponse<TranscriptionResponse> = await this.client.post(
        '/api/v1/listen',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Length': formData.getLengthSync()
          }
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Audio transcription failed:', error);
      throw new Error(`Audio transcription failed: ${error}`);
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