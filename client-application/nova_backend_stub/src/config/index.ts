export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: '/api/v1',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
};