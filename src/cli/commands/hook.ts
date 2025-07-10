import { Command } from 'commander';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function hookCommand(): Command {
  return new Command('hook')
    .description('Execute TTS hooks (internal use)')
    .argument('<type>', 'Hook type to execute')
    .action((type: string) => {
      // Log hook command execution for debugging
      const debugLog = join(dirname(__dirname), '..', '..', '..', 'hook-debug.json');
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        hook: 'hook-command',
        type,
        args: process.argv,
      };

      try {
        // Read existing logs or create new array
        let logs: any[] = [];
        if (existsSync(debugLog)) {
          try {
            const content = readFileSync(debugLog, 'utf-8');
            logs = JSON.parse(content);
          } catch {
            logs = [];
          }
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
