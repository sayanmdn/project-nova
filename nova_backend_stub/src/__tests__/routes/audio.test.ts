import request from 'supertest';
import { createTestApp, mockAudioData } from '../helpers';

const app = createTestApp();

describe('Audio Routes', () => {
  describe('POST /api/v1/audio/upload', () => {
    it('should upload audio data successfully', async () => {
      const response = await request(app)
        .post('/api/v1/audio/upload')
        .send(mockAudioData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: expect.stringMatching(/^audio_\d+_[a-z0-9]+$/),
        timestamp: expect.any(String),
        duration: mockAudioData.duration,
        format: mockAudioData.format,
        sampleRate: mockAudioData.sampleRate,
        channels: mockAudioData.channels,
        data: mockAudioData.data,
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should create audio with default values when not provided', async () => {
      const response = await request(app)
        .post('/api/v1/audio/upload')
        .send({})
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        duration: 0,
        format: 'wav',
        sampleRate: 44100,
        channels: 1,
      });
    });
  });

  describe('GET /api/v1/audio/:id', () => {
    let audioId: string;

    beforeEach(async () => {
      const uploadResponse = await request(app)
        .post('/api/v1/audio/upload')
        .send(mockAudioData);
      audioId = uploadResponse.body.data.id;
    });

    it('should retrieve audio by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/audio/${audioId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(audioId);
      expect(response.body.data).toMatchObject({
        duration: mockAudioData.duration,
        format: mockAudioData.format,
      });
    });

    it('should return 404 for non-existent audio', async () => {
      const response = await request(app)
        .get('/api/v1/audio/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUDIO_NOT_FOUND');
      expect(response.body.error.message).toContain('non-existent-id');
    });
  });

  describe('GET /api/v1/audio', () => {
    it('should return empty list initially', async () => {
      const response = await request(app)
        .get('/api/v1/audio')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return list of uploaded audio files', async () => {
      await request(app)
        .post('/api/v1/audio/upload')
        .send(mockAudioData);
      
      await request(app)
        .post('/api/v1/audio/upload')
        .send({ ...mockAudioData, format: 'mp3' });

      const response = await request(app)
        .get('/api/v1/audio')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[1]).toHaveProperty('id');
    });
  });

  describe('DELETE /api/v1/audio/:id', () => {
    let audioId: string;

    beforeEach(async () => {
      const uploadResponse = await request(app)
        .post('/api/v1/audio/upload')
        .send(mockAudioData);
      audioId = uploadResponse.body.data.id;
    });

    it('should delete audio successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/audio/${audioId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain(audioId);

      // Verify audio is deleted
      await request(app)
        .get(`/api/v1/audio/${audioId}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent audio', async () => {
      const response = await request(app)
        .delete('/api/v1/audio/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUDIO_NOT_FOUND');
    });
  });
});