import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  console.error(`Error ${statusCode}: ${message}`, {
    url: req.url,
    method: req.method,
    stack: err.stack,
  });

  res.status(statusCode).json({
    error: {
      code,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.url,
    },
  });
};