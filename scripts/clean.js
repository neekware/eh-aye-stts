#!/usr/bin/env node

/**
 * Cross-platform clean script for @eh-aye/stts
 * Removes build artifacts and temporary files
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Colors for output
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

async function removeDirectory(path, name) {
  try {
    await fs.rm(path, { recursive: true, force: true });
    log(`✅ Removed ${name}`, colors.green);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      log(`ℹ️  ${name} not found (already clean)`, colors.blue);
    } else {
      log(`⚠️  Failed to remove ${name}: ${error.message}`, colors.yellow);
    }
    return false;
  }
}

async function removeFiles(pattern, directory = rootDir) {
  try {
    const files = await fs.readdir(directory);
    let removed = 0;

    for (const file of files) {
      if (file.match(pattern)) {
        const filePath = join(directory, file);
        try {
          await fs.unlink(filePath);
          removed++;
        } catch (error) {
          log(`⚠️  Failed to remove ${file}: ${error.message}`, colors.yellow);
        }
      }
    }

    if (removed > 0) {
      log(`✅ Removed ${removed} ${pattern} file(s)`, colors.green);
    }
    return removed;
  } catch (error) {
    // Directory doesn't exist or can't be read
    return 0;
  }
}

async function cleanAll() {
  log(`${colors.bright}🧹 Cleaning @eh-aye/stts project...${colors.reset}\n`);

  const startTime = Date.now();
  let cleanedItems = 0;

  // Directories to clean
  const directoriesToClean = [
    { path: join(rootDir, 'dist'), name: 'dist' },
    { path: join(rootDir, 'coverage'), name: 'coverage' },
    { path: join(rootDir, '.vitest'), name: '.vitest' },
    { path: join(rootDir, 'node_modules/.cache'), name: 'node_modules/.cache' },
  ];

  // Clean directories
  log('📁 Cleaning directories...', colors.yellow);
  for (const { path, name } of directoriesToClean) {
    if (await removeDirectory(path, name)) {
      cleanedItems++;
    }
  }

  // Clean temporary files
  log('\n📄 Cleaning temporary files...', colors.yellow);

  // Remove .tgz files (npm pack artifacts)
  const tgzRemoved = await removeFiles(/\.tgz$/);
  cleanedItems += tgzRemoved;

  // Remove .log files
  const logRemoved = await removeFiles(/\.log$/);
  cleanedItems += logRemoved;

  // Remove TypeScript build info files
  const tsbuildRemoved = await removeFiles(/tsconfig\..*\.tsbuildinfo$/);
  cleanedItems += tsbuildRemoved;

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  if (cleanedItems > 0) {
    log(
      `\n${colors.bright}${colors.green}✨ Cleaned ${cleanedItems} item(s) in ${duration}s!${colors.reset}`
    );
  } else {
    log(`\n${colors.bright}${colors.blue}✨ Already clean! (${duration}s)${colors.reset}`);
  }
}

async function cleanSpecific(target) {
  log(`${colors.bright}🧹 Cleaning ${target}...${colors.reset}\n`);

  switch (target) {
    case 'dist':
      await removeDirectory(join(rootDir, 'dist'), 'dist directory');
      break;
    case 'coverage':
      await removeDirectory(join(rootDir, 'coverage'), 'coverage directory');
      break;
    case 'cache':
      await removeDirectory(join(rootDir, 'node_modules/.cache'), 'cache directory');
      break;
    case 'logs':
      await removeFiles(/\.log$/);
      break;
    case 'pack':
      await removeFiles(/\.tgz$/);
      break;
    default:
      log(`❌ Unknown target: ${target}`, colors.red);
      log('\nAvailable targets: dist, coverage, cache, logs, pack', colors.yellow);
      process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

async function main() {
  try {
    if (args.length === 0) {
      // Clean everything
      await cleanAll();
    } else {
      // Clean specific targets
      for (const target of args) {
        await cleanSpecific(target);
      }
    }
  } catch (error) {
    log(`\n${colors.red}❌ Clean failed: ${error.message}${colors.reset}`, colors.red);
    process.exit(1);
  }
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  log('Usage: node scripts/clean.js [target...]');
  log('\nTargets:');
  log('  dist     - Remove dist directory');
  log('  coverage - Remove coverage directory');
  log('  cache    - Remove node_modules/.cache');
  log('  logs     - Remove .log files');
  log('  pack     - Remove .tgz files');
  log('\nIf no target is specified, all will be cleaned.');
  process.exit(0);
}

// Run the clean script
main();
