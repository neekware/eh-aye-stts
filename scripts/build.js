#!/usr/bin/env node

/**
 * Cross-platform build script for @eh-aye/stts
 * Replaces the bash-based build process with Node.js
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Colors for output (cross-platform)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(' ')}`, colors.blue);

    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...options,
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to run ${command}: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function cleanDist() {
  log('\n🧹 Cleaning dist directory...', colors.yellow);

  const distPath = join(rootDir, 'dist');

  try {
    await fs.rm(distPath, { recursive: true, force: true });
    log('✅ Cleaned dist directory', colors.green);
  } catch (error) {
    // Directory might not exist, that's fine
    log('ℹ️  No dist directory to clean', colors.blue);
  }
}

async function runTypeScript() {
  log('\n📦 Running TypeScript compiler...', colors.yellow);

  try {
    await runCommand('npx', ['tsc'], { cwd: rootDir });
    log('✅ TypeScript compilation complete', colors.green);
  } catch (error) {
    throw new Error(`TypeScript compilation failed: ${error.message}`);
  }
}

async function runTscAlias() {
  log('\n🔗 Running tsc-alias to resolve path aliases...', colors.yellow);

  try {
    await runCommand('npx', ['tsc-alias'], { cwd: rootDir });
    log('✅ Path aliases resolved', colors.green);
  } catch (error) {
    throw new Error(`tsc-alias failed: ${error.message}`);
  }
}

async function verifyBuild() {
  log('\n🔍 Verifying build output...', colors.yellow);

  const requiredFiles = ['dist/src/index.js', 'dist/src/cli/index.js', 'dist/src/types.d.ts'];

  const missingFiles = [];

  for (const file of requiredFiles) {
    const filePath = join(rootDir, file);
    try {
      await fs.access(filePath);
    } catch {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    throw new Error(`Build verification failed. Missing files:\n${missingFiles.join('\n')}`);
  }

  // Check if CLI entry point has shebang
  const cliPath = join(rootDir, 'dist/src/cli/index.js');
  const cliContent = await fs.readFile(cliPath, 'utf8');

  if (!cliContent.startsWith('#!/usr/bin/env node')) {
    throw new Error('CLI entry point missing shebang');
  }

  log('✅ Build verification passed', colors.green);
}

async function main() {
  log(`${colors.bright}🚀 Building @eh-aye/stts...${colors.reset}\n`);

  const startTime = Date.now();

  try {
    // Clean previous build
    await cleanDist();

    // Run TypeScript compiler
    await runTypeScript();

    // Resolve path aliases
    await runTscAlias();

    // Verify build output
    await verifyBuild();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(
      `\n${colors.bright}${colors.green}✨ Build completed successfully in ${duration}s!${colors.reset}`
    );
  } catch (error) {
    log(`\n${colors.red}❌ Build failed: ${error.message}${colors.reset}`, colors.red);
    process.exit(1);
  }
}

// Run the build
main().catch((error) => {
  log(`\n${colors.red}❌ Unexpected error: ${error.message}${colors.reset}`, colors.red);
  process.exit(1);
});
