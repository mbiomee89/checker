import { ZodError } from 'zod';
import multer from 'multer';

export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, message, details);
export const unauthorized = (message = 'Unauthorized') => new AppError(401, message);
export const forbidden = (message = 'Forbidden') => new AppError(403, message);
export const notFound = (message = 'Not found') => new AppError(404, message);
export const conflict = (message = 'Conflict') => new AppError(409, message);

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'A record with these values already exists' });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }
  if (err?.code === 'P2003') {
    return res.status(409).json({ error: 'Related record constraint violated' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  console.error(err);
  return res.status(500).json({ error: err?.message || 'Internal server error' });
}
