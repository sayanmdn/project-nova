#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { AppState } from './types';

// Import routes
import healthRoutes from './routes/health';
import apiRoutes from './routes/api';

class NovaBackendServer {
  private app: express.Application;
  private state: AppState = AppState.INITIALIZING;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: true, // Allow all origins for development
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type')
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check route
    this.app.use('/', healthRoutes);

    // API routes
    this.app.use('/api/v1', apiRoutes);

    // 404 handler
    this.app.use(notFoundHandler);
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      this.state = AppState.INITIALIZING;

      // Start server
      const server = this.app.listen(config.port, config.host, () => {
        this.state = AppState.READY;
        logger.info(`🚀 NOVA Backend Server started successfully`);
        logger.info(`🌐 Server running on http://${config.host}:${config.port}`);
        logger.info(`📋 Health check: http://${config.host}:${config.port}/`);
        logger.info(`🎤 API endpoints: http://${config.host}:${config.port}/api/v1/`);
        logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        logger.info('SIGINT received, shutting down gracefully');
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });

    } catch (error) {
      this.state = AppState.ERROR;
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public getState(): AppState {
    return this.state;
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new NovaBackendServer();
  server.start().catch((error) => {
    logger.error('Failed to start NOVA Backend Server:', error);
    process.exit(1);
  });
}

export default NovaBackendServer;