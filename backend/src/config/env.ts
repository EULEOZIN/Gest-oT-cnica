import dotenv from 'dotenv';
import { z } from 'zod';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidateBackendRoots = [
  process.cwd(),
  path.resolve(process.cwd(), 'backend'),
  path.resolve(__dirname, '..', '..'),
  path.resolve(__dirname, '..', '..', '..'),
];

const backendRoot = candidateBackendRoots.find((candidatePath) => existsSync(path.join(candidatePath, '.env.example')) || existsSync(path.join(candidatePath, '.env')));

if (!backendRoot) {
  throw new Error('Could not resolve backend root for environment loading.');
}

const envExamplePath = path.join(backendRoot, '.env.example');
const envPath = path.join(backendRoot, '.env');

if (existsSync(envExamplePath)) {
  dotenv.config({ path: envExamplePath, override: false });
}

if (existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}

// Fallback URL for Prisma generate (build time only)
const buildTimeDatabaseUrl = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().default(buildTimeDatabaseUrl),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long').default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DEFAULT_ADMIN_USERNAME: z.string().min(1).default('admin'),
  DEFAULT_ADMIN_PASSWORD: z.string().min(4).default('admin'),
  DEFAULT_ADMIN_NAME: z.string().min(1).default('Administrador'),
  DEFAULT_ADMIN_ROLE: z.string().min(1).default('Líder de Suporte'),
});

export const env = envSchema.parse(process.env);
