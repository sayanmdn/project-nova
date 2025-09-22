import request from 'supertest';
import express from 'express';
import { errorHandler, ApiError } from '../../middleware/errorHandler';

describe('Error Handler Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should handle ApiError with custom statusCode and code', async () => {
    app.get('/test-error', (req, res, next) => {
      const error: ApiError = new Error('Test error message');
      error.statusCode = 400;
      error.code = 'TEST_ERROR';
      next(error);
    });
    
    app.use(errorHandler);

    const response = await request(app)
      .get('/test-error')
      .expect(400);

    expect(response.body).toMatchObject({
      error: {
        code: 'TEST_ERROR',
        message: 'Test error message',
        statusCode: 400,
        timestamp: expect.any(String),
        path: '/test-error',
      },
    });
  });

  it('should handle standard Error with default values', async () => {
    app.get('/test-standard-error', (req, res, next) => {
      next(new Error('Standard error'));
    });
    
    app.use(errorHandler);

    const response = await request(app)
      .get('/test-standard-error')
      .expect(500);

    expect(response.body).toMatchObject({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Standard error',
        statusCode: 500,
        timestamp: expect.any(String),
        path: '/test-standard-error',
      },
    });
  });

  it('should handle error without message', async () => {
    app.get('/test-no-message', (req, res, next) => {
      const error: ApiError = new Error();
      error.message = '';
      next(error);
    });
    
    app.use(errorHandler);

    const response = await request(app)
      .get('/test-no-message')
      .expect(500);

    expect(response.body.error.message).toBe('Internal Server Error');
  });

  it('should include request information in error response', async () => {
    app.post('/test-post-error', (req, res, next) => {
      const error: ApiError = new Error('POST error');
      error.statusCode = 422;
      next(error);
    });
    
    app.use(errorHandler);

    const response = await request(app)
      .post('/test-post-error')
      .send({ test: 'data' })
      .expect(422);

    expect(response.body.error.path).toBe('/test-post-error');
    expect(response.body.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should handle 404 errors', async () => {
    app.get('/test-404', (req, res, next) => {
      const error: ApiError = new Error('Resource not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      next(error);
    });
    
    app.use(errorHandler);

    const response = await request(app)
      .get('/test-404')
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.statusCode).toBe(404);
  });

  it('should log error information to console', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    app.get('/test-logging', (req, res, next) => {
      const error: ApiError = new Error('Test logging');
      error.statusCode = 400;
      next(error);
    });
    
    app.use(errorHandler);

    await request(app)
      .get('/test-logging')
      .expect(400);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error 400: Test logging',
      expect.objectContaining({
        url: '/test-logging',
        method: 'GET',
        stack: expect.any(String),
      })
    );

    consoleSpy.mockRestore();
  });
});