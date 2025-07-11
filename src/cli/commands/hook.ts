import { Command } from 'commander';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface HookLogEntry {
  timestamp: string;
  hook: string;
  type: string;
  args: string[];
}

export function hookCommand(): Command {
  return new Command('hook')
    .description('Execute TTS hooks (internal use only - called by Claude)')
    .argument('<type>', 'Hook type to execute')
    .addHelpText(
      'after',
      `
⚠️  This command is for internal use only and is called automatically by Claude
when TTS hooks are enabled. You should not need to run this command directly.

Supported hook types:
  - pre-tool-use     Called before Claude executes a tool
  - post-tool-use    Called after Claude executes a tool
  - notification     Called for Claude notifications
  - stop             Called when Claude session ends
  - subagent-stop    Called when a Claude subagent completes

Debug logs are written to ./hook-debug.json for troubleshooting.`
    )
    .action((type: string) => {
      // Log hook command execution for debugging
      const debugLog = join(dirname(__dirname), '..', '..', '..', 'hook-debug.json');
      const timestamp = new Date().toISOString();
      const logEntry: HookLogEntry = {
        timestamp,
        hook: 'hook-command',
        type,
        args: process.argv,
      };

      try {
        // Read existing logs or create new array
        let logs: HookLogEntry[] = [];
        try {
          const content = readFileSync(debugLog, 'utf-8');
          logs = JSON.parse(content) as HookLogEntry[];
        } catch {
          // File doesn't exist or is invalid JSON, start with empty array
          logs = [];
        }

        // Append new entry and write back
        logs.push(logEntry);
        writeFileSync(debugLog, JSON.stringify(logs, null, 2));
      } catch (err) {
        // Ignore logging errors
      }
      // Map hook types to their script files
      const hookMap: Record<string, string> = {
        'pre-tool-use': 'pre-tool-use.js',
        'post-tool-use': 'post-tool-use.js',
        notification: 'notification.js',
        stop: 'stop.js',
        'subagent-stop': 'subagent-stop.js',
      };

      const scriptFile = hookMap[type];
      if (!scriptFile) {
        console.error(`Unknown hook type: ${type}`);
        process.exit(1);
      }

      // Path to the hook script in dist
      const hookPath = join(__dirname, '..', '..', 'plugins', 'claude-code', 'hooks', scriptFile);

      // Spawn the hook script, passing stdin through
      const child = spawn('node', [hookPath], {
        stdio: 'inherit',
        env: process.env,
      });

      child.on('error', (err) => {
        console.error(`Failed to execute hook: ${err.message}`);
        process.exit(1);
      });

      child.on('exit', (code) => {
        process.exit(code || 0);
      });
    });
}
