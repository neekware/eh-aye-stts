#!/usr/bin/env node

const { readFileSync, writeFileSync, existsSync, mkdirSync, createReadStream } = require('fs');
const { join } = require('path');
const { homedir } = require('os');
const { spawn } = require('child_process');
const { createInterface } = require('readline');

function getTtsCommand() {
  return 'stts';
}

async function processTranscript(transcriptPath) {
  try {
    if (!transcriptPath || !existsSync(transcriptPath)) {
      return;
    }
    
    // Read .jsonl file and convert to JSON array
    const chatData = [];
    const fileStream = createReadStream(transcriptPath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    for await (const line of rl) {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        try {
          chatData.push(JSON.parse(trimmedLine));
        } catch {
          // Skip invalid lines
        }
      }
    }
    
    // Write to logs/chat.json
    const logDir = join(homedir(), '.stts', 'logs');
    const chatFile = join(logDir, 'chat.json');
    writeFileSync(chatFile, JSON.stringify(chatData, null, 2));
    
  } catch {
    // Fail silently
  }
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
    const logFile = join(logDir, 'stop.json');
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
    
    // Process transcript if available
    const transcriptPath = data.transcript_path;
    if (transcriptPath) {
      await processTranscript(transcriptPath);
    }
    
    // Extract session info
    const sessionId = data.session_id || '';
    const reason = data.reason || 'Session ended';
    
    // Announce session end
    const message = 'Session complete';
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
    
  } catch {
    // Fail silently
  }
  
  process.exit(0);
}

main();