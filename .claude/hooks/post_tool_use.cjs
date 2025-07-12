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
        const logFile = path.join(logDir, 'post_tool_use.json');
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
        const exitCode = data.exitCode || 0;
        const duration = data.duration || 0;

        // Only announce failures or long-running commands
        if (exitCode !== 0) {
          const message = `${tool} failed`;
          // Announce via TTS
          try {
            execSync(`${getTtsCommand()} say "${message}"`, {
              timeout: 5000,
              stdio: 'ignore',
            });
          } catch {
            // Fail silently
          }
        } else if (duration > 5000) {
          // Over 5 seconds
          const seconds = (duration / 1000).toFixed(1);
          const message = `${tool} completed in ${seconds} seconds`;
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
