#!/usr/bin/env node

const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');
const { spawn } = require('child_process');

function getTtsCommand() {
  return 'stts';
}

async function main() {
  try {
    // Read JSON from stdin
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const data = JSON.parse(chunks.join(''));
    
    // Log the event for debugging
    const logDir = join(homedir(), '.stts', 'logs');
    mkdirSync(logDir, { recursive: true });
    
    // Append to log file
    const logFile = join(logDir, 'notification.json');
    let logs = [];
    
    if (existsSync(logFile)) {
      try {
        const content = readFileSync(logFile, 'utf8');
        logs = JSON.parse(content);
      } catch {
        logs = [];
      }
    }
    
    logs.push(data);
    
    writeFileSync(logFile, JSON.stringify(logs, null, 2));
    
    // Extract notification info
    let message = data.message || '';
    const level = data.level || 'info';
    
    // Only announce important notifications
    if (['error', 'warning'].includes(level) && message) {
      // Truncate long messages
      if (message.length > 100) {
        message = message.substring(0, 100) + '...';
      }
      
      // Announce via TTS
      try {
        await new Promise((resolve, reject) => {
          const child = spawn(getTtsCommand(), ['say', message], {
            timeout: 5000
          });
          
          child.on('close', (code) => {
            resolve(code);
          });
          
          child.on('error', (err) => {
            reject(err);
          });
        });
      } catch {
        // Fail silently
      }
    }
    
  } catch {
    // Fail silently
  }
  
  process.exit(0);
}

main();