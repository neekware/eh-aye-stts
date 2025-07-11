#!/usr/bin/env node

/**
 * Pre-uninstall script for @eh-aye/stts
 * Automatically disables hooks before uninstalling to ensure clean removal
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if we should skip the preuninstall
if (process.env.STTS_SKIP_PREUNINSTALL === '1' || process.env.npm_config_skip_hooks) {
  console.log('📦 Skipping STTS pre-uninstall cleanup (STTS_SKIP_PREUNINSTALL=1)');
  process.exit(0);
}

console.log('\n🧹 Cleaning up STTS (Smart Text-to-Speech)...\n');

async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/sh';
    const shellArgs = isWindows ? ['/c', command, ...args] : ['-c', `${command} ${args.join(' ')}`];

    const child = spawn(shell, shellArgs, {
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', () => {
      // Silently fail - command might not be available
      resolve(false);
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function disableTool(tool) {
  console.log(`🔇 Disabling STTS for ${tool}...`);

  try {
    const success = await runCommand('stts', ['disable', tool]);
    if (success) {
      console.log(`✅ Successfully disabled STTS for ${tool}`);
    }
    return success;
  } catch (error) {
    // Silently continue - tool might not be installed
    return false;
  }
}

async function cleanupLogs() {
  console.log('\n🗑️  Cleaning up logs...');

  const logsDir = join(homedir(), '.stts', 'logs');

  try {
    // Check if logs directory exists
    await fs.access(logsDir);

    // Remove all files and subdirectories in logs
    const files = await fs.readdir(logsDir);
    for (const file of files) {
      const filePath = join(logsDir, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        await fs.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.unlink(filePath);
      }
    }

    console.log('✅ Logs cleaned up');
  } catch (error) {
    // Directory doesn't exist or can't be accessed, that's fine
    console.log('ℹ️  No logs to clean');
  }
}

async function main() {
  // List of tools to try disabling
  const tools = ['claude', 'cursor', 'windsurf', 'zed'];
  let disabledCount = 0;

  // Check if stts command is available
  const sttsAvailable = await runCommand('stts', ['--version']);

  if (!sttsAvailable) {
    console.log('⚠️  STTS command not found, skipping hook cleanup');
    console.log('   Configuration files will be preserved at ~/.stts/');
    return;
  }

  // Try to disable each tool
  for (const tool of tools) {
    const disabled = await disableTool(tool);
    if (disabled) {
      disabledCount++;
    }
  }

  if (disabledCount > 0) {
    console.log(`\n✅ Disabled STTS hooks for ${disabledCount} tool(s)`);
  }

  // Clean up logs
  await cleanupLogs();

  // Inform about preserved configuration
  console.log('\nℹ️  Configuration preserved at:');
  console.log('   • ~/.stts/settings.json (global settings)');
  console.log('   • ./.stts.json (project configs)');
  console.log('\n💡 Your settings have been preserved for future installations');
}

// Run the pre-uninstall cleanup
main().catch((error) => {
  console.error('\n⚠️  Pre-uninstall cleanup encountered an issue:', error.message);
  console.log('   Continuing with uninstall...');
  // Don't exit with error code to not break npm uninstall
  process.exit(0);
});
