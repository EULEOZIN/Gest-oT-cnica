import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

const envFilePath = path.join(backendRoot, '.env');
const envExamplePath = path.join(backendRoot, '.env.example');

if (existsSync(envExamplePath)) {
  dotenv.config({ path: envExamplePath, override: false });
}

if (existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath, override: true });
}

const command = process.argv[2] ?? 'validate';
const prismaCliPath = path.join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js');

const result = spawnSync(process.execPath, [prismaCliPath, command], {
  cwd: backendRoot,
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
