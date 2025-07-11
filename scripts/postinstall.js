#!/usr/bin/env node

/**
 * Post-install script for @eh-aye/stts
 * Automatically detects and enables hooks for supported tools
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if we should skip the postinstall (useful for development)
if (process.env.STTS_SKIP_POSTINSTALL === '1' || process.env.npm_config_skip_hooks) {
  console.log('📦 Skipping STTS post-install hooks (STTS_SKIP_POSTINSTALL=1)');
  process.exit(0);
}

// Don't run during development (when there's no node_modules/.bin/stts)
const isDevelopment = !process.env.npm_config_global && !process.env.npm_lifecycle_event;
if (isDevelopment) {
  process.exit(0);
}

console.log('\n🚀 Setting up STTS (Smart Text-to-Speech)...\n');

async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/sh';
    const shellArgs = isWindows ? ['/c', command, ...args] : ['-c', `${command} ${args.join(' ')}`];

    const child = spawn(shell, shellArgs, {
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function installAudioCommand() {
  console.log('📝 Installing audio command...');

  const claudeCommandsDir = join(homedir(), '.claude', 'commands');
  const targetPath = join(claudeCommandsDir, 'audio.md');
  const templatePath = join(__dirname, 'templates', 'audio-command.md');

  try {
    // Create commands directory
    await fs.mkdir(claudeCommandsDir, { recursive: true });

    // Copy the template file
    await fs.copyFile(templatePath, targetPath);

    console.log('✅ Audio command installed at ~/.claude/commands/audio.md');
    return true;
  } catch (error) {
    console.error('⚠️  Failed to install audio command:', error.message);
    return false;
  }
}

async function detectTools() {
  console.log('🔍 Detecting installed development tools...');

  try {
    // Run stts detect command
    await runCommand('stts', ['detect']);
    return true;
  } catch (error) {
    console.error('❌ Failed to detect tools:', error.message);
    return false;
  }
}

async function enableTool(tool) {
  console.log(`\n📌 Enabling STTS for ${tool}...`);

  try {
    // Run stts enable command with --user flag (default behavior)
    await runCommand('stts', ['enable', tool, '--user']);
    console.log(`✅ Successfully enabled STTS for ${tool}`);
    return true;
  } catch (error) {
    console.error(`⚠️  Failed to enable ${tool}:`, error.message);
    return false;
  }
}

async function main() {
  // First, install the audio command
  await installAudioCommand();

  // List of tools to try enabling
  const tools = ['claude'];
  let enabledCount = 0;

  // Detect available tools
  const detected = await detectTools();
  if (!detected) {
    console.log('\n⚠️  Could not detect tools. You can manually enable STTS later with:');
    console.log('  stts claude enable');
    return;
  }

  // Try to enable each tool
  for (const tool of tools) {
    const enabled = await enableTool(tool);
    if (enabled) {
      enabledCount++;
      break; // Only need to enable one variant of Claude
    }
  }

  if (enabledCount === 0) {
    console.log('\n📝 No tools were auto-enabled. You can manually enable STTS with:');
    console.log('  stts claude enable');
  } else {
    console.log('\n✨ STTS setup complete! Your development tools now have TTS support.');
    console.log('\n💡 Quick commands:');
    console.log('  stts status    - Check current status');
    console.log('  stts test      - Test TTS functionality');
    console.log('  stts disable   - Disable hooks if needed');
  }

  // Show additional info
  console.log('\n📚 Documentation: https://github.com/neekware/eh-aye-stts');
}

// Run the post-install setup
main().catch((error) => {
  console.error('\n❌ Post-install setup failed:', error.message);
  console.log('\nYou can manually set up STTS later with:');
  console.log('  stts claude enable');
  // Don't exit with error code to not break npm install
  process.exit(0);
});
