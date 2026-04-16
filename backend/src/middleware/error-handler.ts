import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error.js';

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ message: 'Validation failed.', details: error.flatten() });
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message, details: error.details });
  }

  if (error instanceof Error && 'code' in error) {
    return res.status(400).json({ message: 'Database request failed.', code: String(error.code) });
  }

  const message = error instanceof Error ? error.message : 'Internal server error.';
  return res.status(500).json({ message });
};
