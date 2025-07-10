import { Command } from 'commander';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { appendFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function hookCommand(): Command {
  return new Command('hook')
    .description('Execute TTS hooks (internal use)')
    .argument('<type>', 'Hook type to execute')
    .action((type: string) => {
      // Log what Claude is passing to debug
      const debugLog = join(dirname(__dirname), '..', '..', '..', 'claude-hook-debug.log');
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] Hook called with type: ${type}, args: ${JSON.stringify(process.argv)}\n`;

      try {
        appendFileSync(debugLog, logEntry);
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
        agent: 'agent.js',
      };

      const scriptFile = hookMap[type];
      if (!scriptFile) {
        console.error(`Unknown hook type: ${type}`);
        process.exit(1);
      }

      // Path to the hook script in dist
      const hookPath = join(__dirname, '..', '..', 'hooks', scriptFile);

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
