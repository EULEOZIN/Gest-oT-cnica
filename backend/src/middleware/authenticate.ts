import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http-error.js';
import { verifyAccessToken } from '../lib/auth.js';

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

    if (!token) {
      throw new HttpError(401, 'Authentication token not provided.');
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.isActive) {
      throw new HttpError(401, 'Invalid authentication token.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
