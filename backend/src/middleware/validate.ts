import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

export const validateBody = <T extends ZodTypeAny>(schema: T) => (req: Request, _res: Response, next: NextFunction) => {
  req.body = schema.parse(req.body);
  next();
};
