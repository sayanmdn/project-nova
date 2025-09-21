import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';

import { apiRouter } from './routes/api';
import { errorHandler } from './middleware/errorHandler';
import { config } from './config';

const app = express();
const server = createServer(app);

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', apiRouter);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Nova Backend API Stub',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

const port = config.port || 3000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`Nova Backend API stub server running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`API endpoints: http://localhost:${port}/api/v1`);
  });
}

export { app, server };