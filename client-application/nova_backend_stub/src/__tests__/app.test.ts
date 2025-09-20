import request from 'supertest';
import { createTestApp } from './helpers';

const app = createTestApp();

describe('Application Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'Nova Backend API Stub',
        version: '1.0.0',
        timestamp: expect.any(String),
      });
    });
  });

  describe('API Root', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Nova Backend API Layer 1 Stub',
        version: '1.0.0',
        endpoints: {
          audio: '/api/v1/audio',
          transcription: '/api/v1/transcription',
          status: '/api/v1/status',
        },
      });
    });
  });

  describe('404 Handling', () => {
    it('should handle non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      // Note: This will be handled by Express default 404, not our error handler
      expect(response.status).toBe(404);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/v1/audio')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Content-Type Handling', () => {
    it('should handle JSON requests', async () => {
      const response = await request(app)
        .post('/api/v1/audio/upload')
        .send({ format: 'wav' })
        .set('Content-Type', 'application/json')
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should handle URL-encoded requests', async () => {
      const response = await request(app)
        .post('/api/v1/audio/upload')
        .send('format=mp3&duration=60')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.format).toBe('mp3');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers from helmet', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Helmet adds various security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('End-to-End Workflow', () => {
    it('should support complete audio processing workflow', async () => {
      // 1. Upload audio
      const uploadResponse = await request(app)
        .post('/api/v1/audio/upload')
        .send({
          duration: 120,
          format: 'wav',
          sampleRate: 44100,
          data: 'base64-audio-data',
        })
        .expect(201);

      const audioId = uploadResponse.body.data.id;

      // 2. Create transcription
      const transcriptionResponse = await request(app)
        .post('/api/v1/transcription')
        .send({
          audioId,
          language: 'en',
        })
        .expect(201);

      const transcriptionId = transcriptionResponse.body.data.id;

      // 3. Check status
      const statusResponse = await request(app)
        .get(`/api/v1/status/${transcriptionId}`)
        .expect(200);

      expect(statusResponse.body.data.status).toMatch(/pending|processing|completed/);

      // 4. Retrieve transcription
      const getTranscriptionResponse = await request(app)
        .get(`/api/v1/transcription/${transcriptionId}`)
        .expect(200);

      expect(getTranscriptionResponse.body.data.audioId).toBe(audioId);

      // 5. Get transcriptions for audio
      const audioTranscriptionsResponse = await request(app)
        .get(`/api/v1/transcription/audio/${audioId}`)
        .expect(200);

      expect(audioTranscriptionsResponse.body.data).toHaveLength(1);
      expect(audioTranscriptionsResponse.body.data[0].id).toBe(transcriptionId);

      // 6. Clean up
      await request(app)
        .delete(`/api/v1/audio/${audioId}`)
        .expect(200);

      await request(app)
        .delete(`/api/v1/status/${transcriptionId}`)
        .expect(200);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous uploads', async () => {
      const uploadPromises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/v1/audio/upload')
          .send({
            duration: 60 + i * 10,
            format: i % 2 === 0 ? 'wav' : 'mp3',
          })
      );

      const responses = await Promise.all(uploadPromises);

      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.duration).toBe(60 + index * 10);
      });

      // Verify all uploads are in the system
      const listResponse = await request(app)
        .get('/api/v1/audio')
        .expect(200);

      expect(listResponse.body.data.length).toBeGreaterThanOrEqual(5);
    });
  });
});