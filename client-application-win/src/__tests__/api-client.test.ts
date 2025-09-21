import axios from 'axios';
import { NovaApiClient } from '../api/client';
import { NovaConfig } from '../types';
import { Logger } from '../utils/logger';

jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('NovaApiClient', () => {
  let apiClient: NovaApiClient;
  let mockLogger: jest.Mocked<Logger>;
  let config: NovaConfig;

  beforeEach(() => {
    config = {
      server: {
        baseUrl: 'http://localhost:4000',
        timeout: 30000
      },
      audio: {
        sampleRate: 16000,
        chunkDuration: 3.0,
        silenceThreshold: -40,
        silenceDuration: 2.0
      },
      wakeWord: {
        confidenceThreshold: 0.8,
        cooldownPeriod: 1.0
      }
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    const mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      defaults: {},
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    mockAxios.create.mockReturnValue(mockAxiosInstance as any);
    apiClient = new NovaApiClient(config, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:4000',
        timeout: 30000,
        headers: {
          'User-Agent': 'Nova-CLI/1.0.0'
        }
      });
    });

    it('should setup request and response interceptors', () => {
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.interceptors.request.use).toHaveBeenCalled();
      expect(instance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return true when server responds with 200', async () => {
      const instance = mockAxios.create.mock.results[0].value;
      instance.get.mockResolvedValue({ status: 200 });

      const result = await apiClient.healthCheck();

      expect(result).toBe(true);
      expect(instance.get).toHaveBeenCalledWith('/');
    });

    it('should return false when server request fails', async () => {
      const instance = mockAxios.create.mock.results[0].value;
      instance.get.mockRejectedValue(new Error('Network error'));

      const result = await apiClient.healthCheck();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Health check failed:', expect.any(Error));
    });
  });

  describe('detectWakeWord', () => {
    it('should send audio buffer and return wake word response', async () => {
      const instance = mockAxios.create.mock.results[0].value;
      const audioBuffer = Buffer.from('fake audio data');
      const mockResponse = {
        data: {
          success: true,
          detected: true,
          confidence: 0.95,
          timestamp: '2024-01-01T12:00:00Z'
        }
      };

      instance.post.mockResolvedValue(mockResponse);

      const result = await apiClient.detectWakeWord(audioBuffer);

      expect(result).toEqual(mockResponse.data);
      expect(instance.post).toHaveBeenCalledWith(
        '/api/v1/recognise',
        expect.any(Object), // FormData
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Length': expect.any(Number)
          })
        })
      );
    });

    it('should throw error when request fails', async () => {
      const instance = mockAxios.create.mock.results[0].value;
      const audioBuffer = Buffer.from('fake audio data');
      instance.post.mockRejectedValue(new Error('API error'));

      await expect(apiClient.detectWakeWord(audioBuffer)).rejects.toThrow('Wake word detection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Wake word detection failed:', expect.any(Error));
    });
  });

  describe('transcribeAudio', () => {
    it('should send audio buffer and return transcription response', async () => {
      const instance = mockAxios.create.mock.results[0].value;
      const audioBuffer = Buffer.from('fake audio data');
      const mockResponse = {
        data: {
          success: true,
          transcript: 'Hello world',
          timestamp: '2024-01-01T12:00:00Z'
        }
      };

      instance.post.mockResolvedValue(mockResponse);

      const result = await apiClient.transcribeAudio(audioBuffer);

      expect(result).toEqual(mockResponse.data);
      expect(instance.post).toHaveBeenCalledWith(
        '/api/v1/listen',
        expect.any(Object), // FormData
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Length': expect.any(Number)
          })
        })
      );
    });

    it('should throw error when transcription fails', async () => {
      const instance = mockAxios.create.mock.results[0].value;
      const audioBuffer = Buffer.from('fake audio data');
      instance.post.mockRejectedValue(new Error('Transcription error'));

      await expect(apiClient.transcribeAudio(audioBuffer)).rejects.toThrow('Audio transcription failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Audio transcription failed:', expect.any(Error));
    });
  });

  describe('processText', () => {
    it('should send text and return AI response', async () => {
      const instance = mockAxios.create.mock.results[0].value;
      const mockResponse = {
        data: {
          success: true,
          response: 'AI response here',
          timestamp: '2024-01-01T12:00:00Z'
        }
      };

      instance.post.mockResolvedValue(mockResponse);

      const result = await apiClient.processText('Hello', 'context');

      expect(result).toEqual(mockResponse.data);
      expect(instance.post).toHaveBeenCalledWith(
        '/api/v1/process',
        {
          text: 'Hello',
          context: 'context'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should work without context parameter', async () => {
      const instance = mockAxios.create.mock.results[0].value;
      const mockResponse = {
        data: {
          success: true,
          response: 'AI response here',
          timestamp: '2024-01-01T12:00:00Z'
        }
      };

      instance.post.mockResolvedValue(mockResponse);

      const result = await apiClient.processText('Hello');

      expect(result).toEqual(mockResponse.data);
      expect(instance.post).toHaveBeenCalledWith(
        '/api/v1/process',
        {
          text: 'Hello',
          context: undefined
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should throw error when text processing fails', async () => {
      const instance = mockAxios.create.mock.results[0].value;
      instance.post.mockRejectedValue(new Error('Processing error'));

      await expect(apiClient.processText('Hello')).rejects.toThrow('Text processing failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Text processing failed:', expect.any(Error));
    });
  });

  describe('updateConfig', () => {
    it('should update axios instance configuration', () => {
      const newConfig: NovaConfig = {
        ...config,
        server: {
          baseUrl: 'http://newurl.com',
          timeout: 60000
        }
      };

      const instance = mockAxios.create.mock.results[0].value;
      apiClient.updateConfig(newConfig);

      expect(instance.defaults.baseURL).toBe('http://newurl.com');
      expect(instance.defaults.timeout).toBe(60000);
    });
  });
});