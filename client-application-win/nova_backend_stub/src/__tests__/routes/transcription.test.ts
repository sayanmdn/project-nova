import request from 'supertest';
import { createTestApp, mockTranscriptionRequest } from '../helpers';

const app = createTestApp();

describe('Transcription Routes', () => {
  describe('POST /api/v1/transcription', () => {
    it('should create transcription successfully', async () => {
      const response = await request(app)
        .post('/api/v1/transcription')
        .send(mockTranscriptionRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: expect.stringMatching(/^transcription_\d+_[a-z0-9]+$/),
        audioId: mockTranscriptionRequest.audioId,
        text: expect.any(String),
        confidence: expect.any(Number),
        language: mockTranscriptionRequest.language,
        timestamp: expect.any(String),
        processingTime: expect.any(Number),
      });
      expect(response.body.data.confidence).toBeGreaterThan(0);
      expect(response.body.data.confidence).toBeLessThanOrEqual(1);
    });

    it('should use default language when not provided', async () => {
      const requestWithoutLanguage = {
        audioId: 'test-audio-id',
      };

      const response = await request(app)
        .post('/api/v1/transcription')
        .send(requestWithoutLanguage)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.language).toBe('en');
    });

    it('should return 400 when audioId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/transcription')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_AUDIO_ID');
      expect(response.body.error.message).toBe('Audio ID is required');
    });

    it('should return 400 when audioId is empty', async () => {
      const response = await request(app)
        .post('/api/v1/transcription')
        .send({ audioId: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_AUDIO_ID');
    });
  });

  describe('GET /api/v1/transcription/:id', () => {
    let transcriptionId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/transcription')
        .send(mockTranscriptionRequest);
      transcriptionId = createResponse.body.data.id;
    });

    it('should retrieve transcription by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/transcription/${transcriptionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(transcriptionId);
      expect(response.body.data.audioId).toBe(mockTranscriptionRequest.audioId);
    });

    it('should return 404 for non-existent transcription', async () => {
      const response = await request(app)
        .get('/api/v1/transcription/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TRANSCRIPTION_NOT_FOUND');
      expect(response.body.error.message).toContain('non-existent-id');
    });
  });

  describe('GET /api/v1/transcription', () => {
    it('should return empty list initially', async () => {
      const response = await request(app)
        .get('/api/v1/transcription')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return list of transcriptions', async () => {
      await request(app)
        .post('/api/v1/transcription')
        .send(mockTranscriptionRequest);
      
      await request(app)
        .post('/api/v1/transcription')
        .send({ ...mockTranscriptionRequest, audioId: 'another-audio-id' });

      const response = await request(app)
        .get('/api/v1/transcription')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/v1/transcription/audio/:audioId', () => {
    const audioId = 'test-audio-123';

    beforeEach(async () => {
      // Create multiple transcriptions for the same audio
      await request(app)
        .post('/api/v1/transcription')
        .send({ ...mockTranscriptionRequest, audioId });
      
      await request(app)
        .post('/api/v1/transcription')
        .send({ ...mockTranscriptionRequest, audioId, language: 'es' });
      
      // Create transcription for different audio
      await request(app)
        .post('/api/v1/transcription')
        .send({ ...mockTranscriptionRequest, audioId: 'different-audio' });
    });

    it('should return transcriptions for specific audio ID', async () => {
      const response = await request(app)
        .get(`/api/v1/transcription/audio/${audioId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((t: any) => t.audioId === audioId)).toBe(true);
    });

    it('should return empty array for audio with no transcriptions', async () => {
      const response = await request(app)
        .get('/api/v1/transcription/audio/no-transcriptions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });
});