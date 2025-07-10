#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run the CLI directly with tsx for hot reloading
const args = process.argv.slice(2);
const cliPath = join(__dirname, 'src', 'cli', 'index.ts');

const child = spawn('npx', ['tsx', cliPath, ...args], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('Failed to start:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});