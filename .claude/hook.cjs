#!/usr/bin/env node
const { exec, spawn } = require('child_process');
const { platform } = require('os');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const execAsync = promisify(exec);

// Get the directory where this script is located
const SCRIPT_DIR = __dirname;
const LOG_FILE = path.join(SCRIPT_DIR, 'tts-hook.log');
const CACHE_DIR = path.join(SCRIPT_DIR, '.tts-cache');
const CONFIG_FILE = path.join(SCRIPT_DIR, '.tts-config.json');

// Determine hook type from command line args or environment
const HOOK_TYPE = process.argv[2] || process.env.CLAUDE_HOOK_TYPE || 'unknown';

// Global state
let cachedTTSCapability = null;
let config = {};

// Default configuration
const DEFAULT_CONFIG = {
  textLengthLimit: 500,
  logMaxSize: 10 * 1024 * 1024, // 10MB
  logMaxFiles: 5,
  cacheMaxAge: 30, // days
  macos: {
    voice: 'Samantha',
    rate: 180,
  },
  windows: {
    rate: 0,
    volume: 100,
  },
  linux: {
    speed: 160,
    pitch: 50,
  },
  enabledHooks: ['PostToolUse', 'Notification', 'Stop'],
  soundEffects: {
    enabled: false,
    success: 'Glass',
    error: 'Basso',
  },
  llmNaturalization: {
    enabled: false,
    model: 'haiku',
    wordThreshold: 15,
    maxWords: 100,
  },
};

// Load configuration
async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    config = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    await log('Loaded custom configuration');
  } catch {
    config = DEFAULT_CONFIG;
    // Save default config for user reference
    try {
      await fs.writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    } catch {}
  }
}

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
  }
}

// Rotate log files
async function rotateLogIfNeeded() {
  try {
    const stats = await fs.stat(LOG_FILE);
    if (stats.size > config.logMaxSize) {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const archiveName = `${LOG_FILE}.${timestamp}`;
      await fs.rename(LOG_FILE, archiveName);

      // Clean up old logs
      const logDir = path.dirname(LOG_FILE);
      const files = await fs.readdir(logDir);
      const logFiles = files
        .filter((f) => f.startsWith('tts-hook.log.'))
        .map((f) => ({ name: f, path: path.join(logDir, f) }));

      if (logFiles.length > config.logMaxFiles) {
        // Sort by name (timestamp) and delete oldest
        logFiles.sort((a, b) => a.name.localeCompare(b.name));
        const toDelete = logFiles.slice(0, logFiles.length - config.logMaxFiles);
        for (const file of toDelete) {
          await fs.unlink(file.path).catch(() => {});
        }
      }
    }
  } catch {}
}

async function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${HOOK_TYPE}] ${level}: ${message}\n`;

  try {
    await rotateLogIfNeeded();
    await fs.appendFile(LOG_FILE, logEntry);
  } catch (err) {
    // If we can't log, at least try stderr (though it might not be visible)
    process.stderr.write(`Failed to write to log: ${err.message}\n`);
  }
}

function cleanTextForSpeech(text) {
  // Remove markdown formatting
  text = text.replace(/```[\s\S]*?```/g, '[code block]');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');

  // Handle links
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Handle headers
  text = text.replace(/^#+\s+(.+)$/gm, '$1');

  // Handle lists
  text = text.replace(/^[\*\-\+]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');

  // Handle blockquotes
  text = text.replace(/^>\s+/gm, '');

  // Clean up multiple spaces and newlines
  text = text.replace(/\s+/g, ' ');

  // Limit length for speech
  if (text.length > config.textLengthLimit) {
    text = text.substring(0, config.textLengthLimit) + '... response truncated for speech';
  }

  return text.trim();
}

// LLM-based text naturalization for speech
async function cleanTextForSpeechLLM(text) {
  // First apply basic cleaning
  text = cleanTextForSpeech(text);
  
  // Count words to decide if we need to naturalize
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  
  // If text is long enough, use Claude to naturalize it
  if (wordCount > config.llmNaturalization.wordThreshold) {
    await log(`Text has ${wordCount} words, using Claude to naturalize`);
    
    try {
      // Write prompt to temp file to avoid escaping issues
      const tempFile = path.join(CACHE_DIR, `llm-prompt-${Date.now()}.txt`);
      const prompt = `Please summarize this message into natural spoken words that are not too technical and keep it under ${config.llmNaturalization.maxWords} words. Just return the summary, nothing else: ${text}`;
      
      await fs.writeFile(tempFile, prompt);
      await log(`Written prompt to temp file: ${tempFile}`);
      
      // Use echo to pipe prompt to claude
      const command = `cat "${tempFile}" | claude --model ${config.llmNaturalization.model} 2>&1`;
      
      await log(`Executing Claude command with model: ${config.llmNaturalization.model}`);
      
      // Call claude with shorter timeout
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 10000,
        shell: '/bin/bash'
      });
      
      // Clean up temp file
      try {
        await fs.unlink(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      if (stderr) {
        await log(`Claude stderr: ${stderr}`, 'WARN');
      }
      
      if (stdout && stdout.trim()) {
        const naturalizedText = stdout.trim();
        
        // Log both original and naturalized versions for comparison
        const llmLogEntry = {
          timestamp: new Date().toISOString(),
          originalText: text,
          originalWords: wordCount,
          naturalizedText: naturalizedText,
          naturalizedWords: naturalizedText.split(/\s+/).length,
          model: config.llmNaturalization.model
        };
        
        const LLM_LOG_FILE = path.join(CACHE_DIR, 'llm-naturalization.jsonl');
        await fs.appendFile(LLM_LOG_FILE, JSON.stringify(llmLogEntry) + '\n');
        
        await log(`Claude response received: ${naturalizedText.substring(0, 50)}...`);
        await log(`Naturalized text from ${wordCount} to ${naturalizedText.split(/\s+/).length} words`);
        return naturalizedText;
      } else {
        await log('Claude returned empty response, using original text', 'WARN');
      }
    } catch (error) {
      await log(`Failed to naturalize with Claude: ${error.message}`, 'ERROR');
      await log(`Error stack: ${error.stack}`, 'DEBUG');
    }
  }
  
  return text;
}

async function detectTTSCapability() {
  // Return cached result if available
  if (cachedTTSCapability) {
    return cachedTTSCapability;
  }

  const os = platform();
  await log(`Detecting TTS capability on platform: ${os}`);

  let result;
  switch (os) {
    case 'darwin':
      await log('Using macOS say command');
      result = { command: 'say', available: true, platform: 'darwin' };
      break;

    case 'win32':
      try {
        await execAsync('where powershell');
        await log('PowerShell detected for Windows TTS');
        result = { command: 'powershell', available: true, platform: 'win32' };
      } catch {
        await log('PowerShell not found on Windows', 'ERROR');
        result = { command: null, available: false, platform: 'win32' };
      }
      break;

    case 'linux':
      // Try espeak first, then festival
      try {
        await execAsync('which espeak');
        await log('Using espeak for Linux TTS');
        result = { command: 'espeak', available: true, platform: 'linux' };
      } catch {
        try {
          await execAsync('which festival');
          await log('Using festival for Linux TTS');
          result = { command: 'festival', available: true, platform: 'linux' };
        } catch {
          await log('No TTS command found on Linux (tried espeak, festival)', 'ERROR');
          result = { command: null, available: false, platform: 'linux' };
        }
      }
      break;

    default:
      await log(`Unsupported platform: ${os}`, 'ERROR');
      result = { command: null, available: false, platform: os };
  }

  cachedTTSCapability = result;
  return result;
}


// Play sound effect (macOS only for now)
async function playSoundEffect(type) {
  if (!config.soundEffects.enabled || platform() !== 'darwin') {
    return;
  }

  const sound = config.soundEffects[type];
  if (sound) {
    try {
      spawn('afplay', [`/System/Library/Sounds/${sound}.aiff`], { detached: true });
    } catch {}
  }
}


// Extract session info from event
function getSessionInfo(event) {
  // Try to get session ID from various sources
  const sessionId = event.session_id || event.sessionId || 'unknown';

  // Extract session from transcript path if available
  // Example: /path/to/transcripts/session-abc123/transcript.jsonl
  let transcriptSession = 'unknown';
  if (event.transcript_path) {
    const match = event.transcript_path.match(/session-([^\/]+)/);
    if (match) {
      transcriptSession = match[1];
    }
  }

  // Use session ID from event, fallback to transcript session
  const finalSessionId = sessionId !== 'unknown' ? sessionId : transcriptSession;

  return {
    sessionId: finalSessionId,
    parentUuid: event.parentUuid || 'main',
    cacheFile: path.join(
      CACHE_DIR,
      `session-${finalSessionId}-${event.parentUuid || 'main'}.jsonl`
    ),
  };
}

// Generate unique key for a message using hash
function generateMessageKey(message) {
  const words = message.content.split(/\s+/).filter((w) => w.length > 0);
  const firstWords = words.slice(0, 10).join(' ');
  const lastWords = words.slice(-10).join(' ');
  const keyString = `${message.timestamp}_${firstWords}_${lastWords}`;

  // Create a hash for faster lookup
  return crypto.createHash('md5').update(keyString).digest('hex');
}

// Simple cache to track last spoken message per session
const LAST_SPOKEN_FILE = path.join(CACHE_DIR, 'last-spoken-messages.json');
let lastSpokenCache = {};

// TTS Queue management
const TTS_QUEUE_FILE = path.join(CACHE_DIR, 'tts-queue.json');
const TTS_WORKER_LOCK = path.join(CACHE_DIR, 'tts-worker.lock');
let isWorkerRunning = false;

// Debug log for tracking all assistant messages
const ASSISTANT_MSG_LOG = path.join(CACHE_DIR, 'assistant-messages-debug.jsonl');
let lastSeenMessageId = null;

// Load last spoken messages cache
async function loadLastSpokenCache() {
  try {
    const data = await fs.readFile(LAST_SPOKEN_FILE, 'utf-8');
    lastSpokenCache = JSON.parse(data);
    await log(`Loaded last spoken cache with ${Object.keys(lastSpokenCache).length} sessions`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      await log(`Error loading last spoken cache: ${error.message}`, 'WARN');
    }
    lastSpokenCache = {};
  }
}

// Save last spoken message for a session
async function saveLastSpoken(sessionId, messageKey) {
  lastSpokenCache[sessionId] = {
    messageKey,
    timestamp: new Date().toISOString(),
  };

  try {
    await ensureCacheDir();
    await fs.writeFile(LAST_SPOKEN_FILE, JSON.stringify(lastSpokenCache, null, 2));
    await log(`Saved last spoken message for session ${sessionId}`);
  } catch (error) {
    await log(`Failed to save last spoken cache: ${error.message}`, 'WARN');
  }
}

// Get last spoken message for a session
function getLastSpoken(sessionId) {
  return lastSpokenCache[sessionId]?.messageKey || null;
}

// Add message to TTS queue
async function addToTTSQueue(message) {
  try {
    await ensureCacheDir();
    
    // Read existing queue
    let queue = [];
    try {
      const data = await fs.readFile(TTS_QUEUE_FILE, 'utf-8');
      queue = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        await log(`Error reading TTS queue: ${error.message}`, 'WARN');
      }
    }
    
    // Add new message
    queue.push({
      id: crypto.randomBytes(16).toString('hex'),
      message: message,
      timestamp: new Date().toISOString(),
      status: 'pending'
    });
    
    // Save queue
    await fs.writeFile(TTS_QUEUE_FILE, JSON.stringify(queue, null, 2));
    await log(`Added message to TTS queue (${queue.length} total)`);
    
    // Start worker if not running
    if (!isWorkerRunning) {
      startTTSWorker();
    }
  } catch (error) {
    await log(`Failed to add to TTS queue: ${error.message}`, 'ERROR');
  }
}

// Check if worker is already running
async function isWorkerActive() {
  try {
    const stats = await fs.stat(TTS_WORKER_LOCK);
    const now = Date.now();
    const lockAge = now - stats.mtime.getTime();
    
    // If lock is older than 30 seconds, consider it stale
    if (lockAge > 30000) {
      await fs.unlink(TTS_WORKER_LOCK);
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Start TTS worker process
async function startTTSWorker() {
  if (await isWorkerActive()) {
    await log('TTS worker already active, skipping start');
    return;
  }
  
  isWorkerRunning = true;
  
  // Fork a new process to handle the queue
  const workerPath = path.join(SCRIPT_DIR, 'hook.cjs');
  const worker = spawn('node', [workerPath, 'worker'], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, CLAUDE_HOOK_TYPE: 'worker' }
  });
  
  worker.unref();
  
  // Create lock file with worker PID
  await fs.writeFile(TTS_WORKER_LOCK, worker.pid.toString());
  await log(`Started TTS worker process with PID ${worker.pid}`);
}

// TTS Worker - processes messages from queue
async function runTTSWorker() {
  await log('TTS Worker started');
  
  try {
    while (true) {
      // Update lock file timestamp
      await fs.utimes(TTS_WORKER_LOCK, new Date(), new Date());
      
      // Read queue
      let queue = [];
      try {
        const data = await fs.readFile(TTS_QUEUE_FILE, 'utf-8');
        queue = JSON.parse(data);
      } catch (error) {
        if (error.code === 'ENOENT') {
          break; // No queue file, exit
        }
        await log(`Worker: Error reading queue: ${error.message}`, 'WARN');
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // Find next pending message
      const pending = queue.find(item => item.status === 'pending');
      if (!pending) {
        // No pending messages, clean up completed ones
        queue = queue.filter(item => item.status === 'pending');
        
        // Always write the queue back (even if empty)
        await fs.writeFile(TTS_QUEUE_FILE, JSON.stringify(queue, null, 2));
        
        if (queue.length === 0) {
          // Queue is empty, exit worker
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // Mark as playing
      pending.status = 'playing';
      await fs.writeFile(TTS_QUEUE_FILE, JSON.stringify(queue, null, 2));
      
      // Speak the message
      await log(`Worker: Speaking message ${pending.id}`);
      const success = await speakAndWait(pending.message);
      
      // Mark as completed
      pending.status = 'completed';
      await fs.writeFile(TTS_QUEUE_FILE, JSON.stringify(queue, null, 2));
      
      if (!success) {
        await log(`Worker: Failed to speak message ${pending.id}`, 'ERROR');
      }
    }
  } catch (error) {
    await log(`Worker error: ${error.message}`, 'ERROR');
  } finally {
    // Clean up lock file
    await fs.unlink(TTS_WORKER_LOCK).catch(() => {});
    await log('TTS Worker exiting');
  }
}

// Modified speak function that waits for completion
async function speakAndWait(text) {
  const cleanText = config.llmNaturalization?.enabled 
    ? await cleanTextForSpeechLLM(text)
    : cleanTextForSpeech(text);
  await log(
    `Speaking text (${cleanText.length} chars): "${cleanText.substring(0, 100)}${cleanText.length > 100 ? '...' : ''}"`
  );

  const tts = await detectTTSCapability();

  if (!tts.available) {
    await log('No TTS capability detected', 'ERROR');
    return false;
  }

  let command;
  let args = [];

  switch (tts.command) {
    case 'say':
      command = 'say';
      args = [];
      if (config.macos.voice) {
        args.push('-v', config.macos.voice);
      }
      if (config.macos.rate) {
        args.push('-r', String(config.macos.rate));
      }
      args.push(cleanText);
      break;

    case 'powershell':
      const psEscaped = cleanText.replace(/'/g, "''").replace(/"/g, '""');
      const psScript = `
        Add-Type -AssemblyName System.Speech
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $synth.Rate = ${config.windows.rate || 0}
        $synth.Volume = ${config.windows.volume || 100}
        $synth.Speak('${psEscaped}')
        $synth.Dispose()
      `;
      command = 'powershell';
      args = ['-Command', psScript];
      break;

    case 'espeak':
      command = 'espeak';
      args = [];
      if (config.linux.speed) {
        args.push('-s', String(config.linux.speed));
      }
      if (config.linux.pitch) {
        args.push('-p', String(config.linux.pitch));
      }
      args.push(cleanText);
      break;

    case 'festival':
      const escapedText = cleanText.replace(/'/g, "'\"'\"'");
      try {
        const { stdout, stderr } = await execAsync(`echo '${escapedText}' | festival --tts`);
        if (stderr) await log(`TTS stderr: ${stderr}`, 'WARN');
        return true;
      } catch (error) {
        await log(`TTS execution failed: ${error.message}`, 'ERROR');
        return false;
      }

    default:
      await log('Unknown TTS command', 'ERROR');
      return false;
  }

  // Wait for the TTS process to complete
  return new Promise((resolve) => {
    const ttsProcess = spawn(command, args, {
      stdio: 'pipe',
      detached: false,
    });

    ttsProcess.on('error', (error) => {
      log(`TTS process error: ${error.message}`, 'ERROR');
      resolve(false);
    });

    ttsProcess.on('exit', (code) => {
      if (code === 0) {
        log('TTS completed successfully');
        resolve(true);
      } else if (code !== null) {
        log(`TTS exited with code ${code}`, 'WARN');
        resolve(false);
      }
    });

    ttsProcess.stdout?.on('data', (data) => {
      log(`TTS stdout: ${data}`, 'DEBUG');
    });

    ttsProcess.stderr?.on('data', (data) => {
      log(`TTS stderr: ${data}`, 'DEBUG');
    });
  });
}

// Clean up old cache entries
async function cleanupOldCaches() {
  try {
    const now = Date.now();
    const maxAge = config.cacheMaxAge * 24 * 60 * 60 * 1000; // Convert days to ms
    let modified = false;

    // Clean up old entries from lastSpokenCache
    for (const sessionId in lastSpokenCache) {
      const entry = lastSpokenCache[sessionId];
      if (entry.timestamp) {
        const entryTime = new Date(entry.timestamp).getTime();
        if (now - entryTime > maxAge) {
          delete lastSpokenCache[sessionId];
          modified = true;
          await log(`Removed old cache entry for session: ${sessionId}`);
        }
      }
    }

    // Save updated cache if modified
    if (modified) {
      await fs.writeFile(LAST_SPOKEN_FILE, JSON.stringify(lastSpokenCache, null, 2));
    }

    // Clean up old JSONL files (legacy)
    const files = await fs.readdir(CACHE_DIR);
    for (const file of files) {
      if (file.endsWith('.jsonl')) {
        const filePath = path.join(CACHE_DIR, file);
        try {
          const stats = await fs.stat(filePath);
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            await log(`Deleted old cache file: ${file}`);
          }
        } catch {}
      }
    }
  } catch (error) {
    await log(`Cache cleanup error: ${error.message}`, 'WARN');
  }
}

// Extract text content from Claude message format
function extractTextFromContent(content) {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join(' ');
  }

  return '';
}

// Debug function to log ALL assistant messages
async function debugLogAssistantMessages(event) {
  if (!event.transcript_path) return;
  
  try {
    // Read the entire transcript
    const content = await fs.readFile(event.transcript_path, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());
    
    // Get the last line (most recent entry)
    if (lines.length === 0) return;
    
    const lastLine = lines[lines.length - 1];
    const entry = JSON.parse(lastLine);
    
    // Check if it's an assistant message
    if (entry.type === 'assistant' && entry.message) {
      const messageId = entry.uuid || entry.message.id;
      
      // Skip if we've already seen this message
      if (messageId === lastSeenMessageId) {
        return;
      }
      
      lastSeenMessageId = messageId;
      
      // Extract text content
      const textContent = extractTextFromContent(entry.message.content);
      
      // Log to debug file
      const debugEntry = {
        timestamp: new Date().toISOString(),
        hookType: event.hook_event_name || HOOK_TYPE,
        messageId: messageId,
        textContent: textContent,
        contentLength: textContent.length,
        hasToolUse: entry.message.content.some(item => item.type === 'tool_use'),
        sessionId: event.session_id,
        llmEnabled: config.llmNaturalization?.enabled || false,
        llmModel: config.llmNaturalization?.model || 'none'
      };
      
      await fs.appendFile(ASSISTANT_MSG_LOG, JSON.stringify(debugEntry) + '\n');
      await log(`DEBUG: Logged assistant message - Hook: ${debugEntry.hookType}, Length: ${debugEntry.contentLength}, HasTools: ${debugEntry.hasToolUse}`);
    }
  } catch (error) {
    await log(`DEBUG: Error logging assistant messages: ${error.message}`, 'WARN');
  }
}

// Read only the last few lines of transcript file (JSONL format)
async function readLastTranscriptLines(transcriptPath, maxLines = 10) {
  if (!transcriptPath) {
    await log('No transcript path provided');
    return null;
  }

  try {
    // Read the entire file (we'll optimize this later with tail-like functionality)
    const content = await fs.readFile(transcriptPath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    // Get only the last N lines
    const lastLines = lines.slice(-maxLines);
    const messages = [];

    for (const line of lastLines) {
      try {
        const entry = JSON.parse(line);

        // Extract the actual message from the Claude Code format
        if (entry.type === 'assistant' && entry.message) {
          const message = {
            role: entry.message.role,
            content: extractTextFromContent(entry.message.content),
            timestamp: entry.timestamp,
            uuid: entry.uuid,
            parentUuid: entry.parentUuid || 'main',
          };

          if (message.content) {
            messages.push(message);
          }
        }
      } catch (e) {
        await log(`Skipping invalid JSON line: ${e.message}`, 'WARN');
      }
    }

    await log(`Parsed ${messages.length} assistant messages from last ${maxLines} lines`);
    return { messages };
  } catch (error) {
    await log(`Failed to read transcript: ${error.message}`, 'ERROR');
    return null;
  }
}

// Get the last assistant message from transcript
async function getLastAssistantMessage(event) {
  // Check if this is a subagent event
  const isSubagent = event.parentUuid && event.parentUuid !== 'main';

  if (isSubagent) {
    await log(`Skipping subagent event entirely (parentUuid: ${event.parentUuid})`);
    return null; // Don't speak anything for subagents
  }

  // For PostToolUse events, try to read the transcript
  if (
    event.transcript_path &&
    (event.hook_event_name === 'PostToolUse' || event.hook_event_name === 'PreToolUse')
  ) {
    await log(`Reading last lines from transcript: ${event.transcript_path}`);

    const sessionId = event.session_id || 'unknown';
    const lastSpokenKey = getLastSpoken(sessionId);
    await log(`Last spoken message key for session ${sessionId}: ${lastSpokenKey || 'none'}`);

    // Read only the last few lines of the transcript
    const transcript = await readLastTranscriptLines(event.transcript_path, 5);

    if (transcript && transcript.messages && transcript.messages.length > 0) {
      // Get the most recent message
      const lastMessage = transcript.messages[transcript.messages.length - 1];
      const messageKey = generateMessageKey(lastMessage);

      // Check if this message was already spoken
      if (messageKey === lastSpokenKey) {
        await log('Last message already spoken, checking for completion notification');

        // If no new messages but this is a PostToolUse event from main agent, still notify
        if (event.hook_event_name === 'PostToolUse' && !isSubagent) {
          return null; //'Waiting for your input.';
        }

        return null;
      }

      // This is a new message, speak it
      await log(`New message found: ${lastMessage.content.substring(0, 100)}...`);
      await saveLastSpoken(sessionId, messageKey);

      let messageText = lastMessage.content;

      // Add completion notification for PostToolUse events from main agent only
      if (event.hook_event_name === 'PostToolUse' && !isSubagent) {
        messageText += '. Assistant message complete. Waiting for your input.';
      }

      return messageText;
    } else {
      await log('No assistant messages found in transcript');

      // If no messages but this is a PostToolUse event from main agent, still notify
      if (event.hook_event_name === 'PostToolUse' && !isSubagent) {
        return 'Waiting for your input.';
      }
    }
  }

  // For Notification events, use the message directly
  if (event.message) {
    await log(`Notification: ${event.message}`);
    return event.message;
  }

  // For Stop events, check if there's a final message to speak
  if (event.hook_event_name === 'Stop' && event.transcript_path) {
    await log('Stop event - checking for final assistant message');
    
    // Read the last line of the transcript
    const transcript = await readLastTranscriptLines(event.transcript_path, 1);
    
    if (transcript && transcript.messages && transcript.messages.length > 0) {
      const lastMessage = transcript.messages[0];
      const sessionId = event.session_id || 'unknown';
      const lastSpokenKey = getLastSpoken(sessionId);
      const messageKey = generateMessageKey(lastMessage);
      
      // If this is a new message we haven't spoken, speak it
      if (messageKey !== lastSpokenKey && lastMessage.content) {
        await log(`Stop: Found unspoken final message: ${lastMessage.content.substring(0, 100)}...`);
        await saveLastSpoken(sessionId, messageKey);
        return lastMessage.content + '. Session completed.';
      }
    }
    
    // Default completion message
    const message = 'Session completed successfully';
    await log(`Stop: ${message}`);
    return message;
  }

  return null;
}

// Main execution
async function main() {
  // Check if running as worker
  if (process.argv[2] === 'worker') {
    await loadConfig();
    await runTTSWorker();
    return;
  }

  // Load configuration first
  await loadConfig();

  // Load last spoken cache
  await loadLastSpokenCache();

  // Clean up old cache entries periodically
  await cleanupOldCaches();

  await log('=== TTS Hook Started ===');
  await log(`Hook Type: ${HOOK_TYPE}`);

  let inputData = '';

  try {
    for await (const chunk of process.stdin) {
      inputData += chunk;
    }

    await log(`Received input data (${inputData.length} chars)`);

    const event = JSON.parse(inputData);

    // Check if this hook type is enabled
    // Use hook_event_name from event if HOOK_TYPE is unknown
    const effectiveHookType =
      HOOK_TYPE !== 'unknown' ? HOOK_TYPE : event.hook_event_name || 'unknown';
    if (!config.enabledHooks.includes(effectiveHookType) && effectiveHookType !== 'unknown') {
      await log(`Hook type ${effectiveHookType} is disabled in config`);
      process.exit(0);
    }

    // Log event details
    await log(`Event Details:`);
    await log(`  - Hook Event Name: ${event.hook_event_name || 'not specified'}`);
    await log(`  - Transcript Path: ${event.transcript_path || 'not provided'}`);
    await log(`  - Session ID: ${event.session_id || 'not provided'}`);
    await log(`  - Parent UUID: ${event.parentUuid || 'not provided'}`);

    if (event.tool) {
      await log(`  - Tool: ${event.tool}`);
    }
    if (event.exitCode !== undefined) {
      await log(`  - Exit Code: ${event.exitCode}`);
    }
    if (event.reason) {
      await log(`  - Reason: ${event.reason}`);
    }

    // Pretty print the full event for debugging
    await log(`Full Event Data:\n${JSON.stringify(event, null, 2)}`, 'DEBUG');

    // Debug log ALL assistant messages
    await debugLogAssistantMessages(event);

    // Get the message to speak
    const message = await getLastAssistantMessage(event);

    if (message) {
      await addToTTSQueue(message);
      await log('=== TTS Hook Completed ===');
      process.exit(0);
    } else {
      await log('No message to speak, exiting');
      await log('=== TTS Hook Completed ===');
      process.exit(0);
    }
  } catch (error) {
    await log(`Main execution error: ${error.message}`, 'ERROR');
    await log(`Stack trace: ${error.stack}`, 'DEBUG');
    await log('=== TTS Hook Failed ===');
    await playSoundEffect('error');
    process.exit(1);
  }
}

// Cleanup on exit
process.on('SIGINT', async () => {
  process.exit(0);
});

process.on('SIGTERM', async () => {
  process.exit(0);
});

main().catch(async (error) => {
  await log(`Uncaught error: ${error.message}`, 'ERROR');
  process.exit(1);
});
