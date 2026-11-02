#!/usr/bin/env node
import { copyFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('→ Ensuring .env exists');
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');
if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
  console.log('  Created .env from .env.example');
} else {
  console.log('  .env already present');
}

console.log('→ Syncing backend/.env for Prisma');
copyFileSync(envPath, path.join(root, 'backend', '.env'));

console.log('→ Installing dependencies');
run('pnpm', ['install']);

console.log('→ Starting Postgres + Redis');
run('pnpm', ['docker:up']);

console.log('→ Waiting for Postgres');
for (let i = 0; i < 30; i++) {
  const ready = spawnSync(
    'docker',
    [
      'compose',
      '-f',
      'docker/docker-compose.yml',
      '-f',
      'docker/docker-compose.dev.yml',
      '--env-file',
      '.env',
      'exec',
      '-T',
      'postgres',
      'pg_isready',
      '-U',
      'your_academy',
      '-d',
      'your_academy',
    ],
    { cwd: root, stdio: 'ignore' },
  );
  if (ready.status === 0) break;
  spawnSync(process.platform === 'win32' ? 'timeout' : 'sleep', [process.platform === 'win32' ? '/t' : '1', process.platform === 'win32' ? '1' : ''], {
    cwd: root,
    stdio: 'ignore',
    shell: true,
  });
  if (i === 29) {
    console.error('Postgres did not become ready');
    process.exit(1);
  }
}

console.log('→ Running migrations');
run('pnpm', ['db:deploy']);

console.log('→ Seeding database');
run('pnpm', ['db:seed']);

console.log('→ Generating Prisma client + building shared');
run('pnpm', ['db:generate']);
run('pnpm', ['--filter', '@your-academy/shared', 'build']);

console.log(`
Setup complete.

Database: your_academy
User:     your_academy

Run apps:
  pnpm dev:backend
  pnpm dev:frontend
  pnpm dev:worker

Admin (from .env):
  WhatsApp: BOOTSTRAP_ADMIN_WHATSAPP
  Password: BOOTSTRAP_ADMIN_PASSWORD
`);
