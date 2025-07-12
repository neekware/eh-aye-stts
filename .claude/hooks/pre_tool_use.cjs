#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function getTtsCommand() {
  return 'stts';
}

function main() {
  try {
    // Read JSON from stdin
    let inputData = '';
    process.stdin.on('data', (chunk) => {
      inputData += chunk;
    });

    process.stdin.on('end', () => {
      try {
        const data = JSON.parse(inputData);

        // Log the event for debugging
        const logDir = path.join(os.homedir(), '.stts', 'logs');
        fs.mkdirSync(logDir, { recursive: true });

        // Append to log file
        const logFile = path.join(logDir, 'pre_tool_use.json');
        let logs = [];

        if (fs.existsSync(logFile)) {
          try {
            const logContent = fs.readFileSync(logFile, 'utf8');
            logs = JSON.parse(logContent);
          } catch {
            logs = [];
          }
        }

        logs.push(data);
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));

        // Extract tool info
        const tool = data.tool || '';
        const args = data.args || {};

        // Create TTS message
        let message;
        if (tool === 'Bash' && typeof args === 'object') {
          const command = args.command || '';
          if (command) {
            // Truncate long commands
            const truncatedCommand =
              command.length > 50 ? command.substring(0, 50) + '...' : command;
            message = `Running: ${truncatedCommand}`;
          }
        }

        if (!message && tool) {
          message = `Using tool: ${tool}`;

          // Announce via TTS
          try {
            execSync(`${getTtsCommand()} say "${message}"`, {
              timeout: 5000,
              stdio: 'ignore',
            });
          } catch {
            // Fail silently
          }
        }
      } catch {
        // Fail silently
      }

      process.exit(0);
    });
  } catch {
    // Fail silently
    process.exit(0);
  }
}

main();
