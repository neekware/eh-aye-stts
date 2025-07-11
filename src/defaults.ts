import { join } from 'path';
import { homedir } from 'os';

// Base directories
export const HOME_DIR = homedir();
export const STTS_DIR = join(HOME_DIR, '.stts');
export const LOGS_DIR = join(STTS_DIR, 'logs');
export const HOOKS_DIR = join(STTS_DIR, 'hooks');
export const CACHE_DIR = join(STTS_DIR, 'cache');

// Config files
export const SETTINGS_PATH = join(STTS_DIR, 'settings.json');
export const PROJECT_CONFIG_FILE = '.stts.json';
export const CACHE_LOG_FILE = join(CACHE_DIR, 'events.jsonl');

// Default configuration
export const DEFAULT_CONFIG = {
  audioEnabled: true,
  enableDangerousCommandBlocking: false,
  customDangerousCommands: [],
  debug: false,
};

// Environment variable names
export const ENV_VARS = {
  DANGEROUS_COMMAND_BLOCKING: 'STTS_ENABLE_DANGEROUS_COMMAND_BLOCKING',
  AUDIO_ENABLED: 'STTS_AUDIO_ENABLED',
  CUSTOM_DANGEROUS_COMMANDS: 'STTS_CUSTOM_DANGEROUS_COMMANDS',
  DEBUG: 'STTS_DEBUG',
};

// Hook names
export const HOOK_NAMES = {
  PRE_TOOL_USE: 'PreToolUse',
  POST_TOOL_USE: 'PostToolUse',
  NOTIFICATION: 'Notification',
  STOP: 'Stop',
  SUBAGENT_STOP: 'SubagentStop',
};

// Tool names
export const SUPPORTED_TOOLS = ['claude', 'cursor', 'windsurf', 'zed'];

// Claude settings
export const CLAUDE_DIR = '.claude';
export const CLAUDE_SETTINGS_FILE = 'settings.json';

// TTS Environment variables
export const TTS_ENV_VARS = {
  PRIORITY: 'STTS_PRIORITY',
  VOICE_TYPE: 'STTS_VOICE_TYPE',
  VOICE_GENDER: 'STTS_VOICE_GENDER',
  ELEVENLABS_API_KEY: 'STTS_ELEVENLABS_API_KEY',
  OPENAI_API_KEY: 'STTS_OPENAI_API_KEY',
  ELEVENLABS_VOICE_ID: 'STTS_ELEVENLABS_VOICE_ID',
  OPENAI_MODEL: 'STTS_OPENAI_MODEL',
  CLAUDE_SETTINGS_PATH: 'STTS_CLAUDE_SETTINGS_PATH',
};

// Wrapper script templates
export const WRAPPER_SCRIPTS = {
  BASH: `#!/bin/bash
# STTS wrapper script for {{PROVIDER}}
# Auto-generated - do not edit manually

if command -v stts >/dev/null 2>&1; then
    exec stts "$@"
else
    {{FALLBACK_BEHAVIOR}}
fi`,

  USER_FALLBACK: `echo "Warning: stts command not found. Please install stts first." >&2
    exit 1`,

  WORKSPACE_FALLBACK: `# stts not available, silently continue
    exit 0`,

  BATCH: `@echo off
REM STTS wrapper script for {{PROVIDER}}
REM Auto-generated - do not edit manually

where stts >nul 2>&1
if %errorlevel% == 0 (
    stts %*
) else (
    {{FALLBACK_BEHAVIOR}}
)`,

  BATCH_USER_FALLBACK: `echo Warning: stts command not found. Please install stts first. >&2
    exit /b 1`,

  BATCH_WORKSPACE_FALLBACK: `REM stts not available, silently continue
    exit /b 0`,
};
