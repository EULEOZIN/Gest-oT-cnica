import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export type AuthTokenPayload = {
  sub: string;
  username: string;
};

export const hashPassword = async (value: string) => bcrypt.hash(value, 10);
export const comparePassword = async (value: string, hash: string) => bcrypt.compare(value, hash);

export const signAccessToken = (payload: AuthTokenPayload) => jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);

export const verifyAccessToken = (token: string) => jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
