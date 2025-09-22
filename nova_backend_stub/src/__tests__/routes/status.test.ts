import request from 'supertest';
import { createTestApp, delay } from '../helpers';

const app = createTestApp();

describe('Status Routes', () => {
  describe('GET /api/v1/status/:id', () => {
    const statusId = 'test-status-123';

    it('should create new status when first accessed', async () => {
      const response = await request(app)
        .get(`/api/v1/status/${statusId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: statusId,
        status: 'pending',
        progress: 0,
        message: 'Processing request...',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should progress status on subsequent calls', async () => {
      // First call creates pending status
      await request(app)
        .get(`/api/v1/status/${statusId}`)
        .expect(200);

      // Second call should show processing
      const response2 = await request(app)
        .get(`/api/v1/status/${statusId}`)
        .expect(200);

      expect(response2.body.data.status).toBe('processing');
      expect(response2.body.data.progress).toBeGreaterThan(0);
      expect(response2.body.data.message).toBe('Processing audio data...');
    });

    it('should eventually complete processing', async () => {
      const statusId2 = 'test-status-complete';
      
      // Keep calling until completed
      let response;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        response = await request(app)
          .get(`/api/v1/status/${statusId2}`)
          .expect(200);
        attempts++;
        
        if (response.body.data.status !== 'completed' && attempts < maxAttempts) {
          await delay(10); // Small delay between calls
        }
      } while (response.body.data.status !== 'completed' && attempts < maxAttempts);

      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.progress).toBe(100);
      expect(response.body.data.message).toBe('Processing completed successfully');
    });
  });

  describe('GET /api/v1/status', () => {
    it('should return empty list initially', async () => {
      const response = await request(app)
        .get('/api/v1/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return list of all statuses', async () => {
      // Create some statuses
      await request(app).get('/api/v1/status/status-1');
      await request(app).get('/api/v1/status/status-2');

      const response = await request(app)
        .get('/api/v1/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      
      const statusIds = response.body.data.map((s: any) => s.id);
      expect(statusIds).toContain('status-1');
      expect(statusIds).toContain('status-2');
    });
  });

  describe('DELETE /api/v1/status/:id', () => {
    const statusId = 'test-status-delete';

    beforeEach(async () => {
      // Create a status first
      await request(app).get(`/api/v1/status/${statusId}`);
    });

    it('should delete status successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/status/${statusId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain(statusId);

      // Verify status is recreated when accessed again (since it creates on GET)
      const getResponse = await request(app)
        .get(`/api/v1/status/${statusId}`)
        .expect(200);
      
      expect(getResponse.body.data.status).toBe('pending');
    });

    it('should return 404 when deleting non-existent status', async () => {
      const response = await request(app)
        .delete('/api/v1/status/non-existent-status')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STATUS_NOT_FOUND');
      expect(response.body.error.message).toContain('non-existent-status');
    });

    it('should handle multiple delete attempts gracefully', async () => {
      // First delete should succeed
      await request(app)
        .delete(`/api/v1/status/${statusId}`)
        .expect(200);

      // Second delete should return 404
      await request(app)
        .delete(`/api/v1/status/${statusId}`)
        .expect(404);
    });
  });
});