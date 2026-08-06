import { z } from 'zod';

export const validateBody = (schema) => (req, _res, next) => {
  req.body = schema.parse(req.body);
  next();
};

// Express 5 exposes req.query as a getter-only property, so a plain assignment
// throws — redefine the property descriptor instead.
export const validateQuery = (schema) => (req, _res, next) => {
  const parsed = schema.parse(req.query);
  Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
  next();
};

export const validateParams = (schema) => (req, _res, next) => {
  req.params = schema.parse(req.params);
  next();
};

export const idParam = z.object({ id: z.coerce.number().int().positive() });
