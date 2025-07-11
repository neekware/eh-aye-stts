import { join } from 'path';
import { homedir } from 'os';

// Base directories
export const HOME_DIR = homedir();
export const STTS_DIR = join(HOME_DIR, '.stts');
export const HOOKS_DIR = join(STTS_DIR, 'hooks');

// Config files
export const SETTINGS_PATH = join(STTS_DIR, 'settings.json');

// Default configuration
export const DEFAULT_CONFIG = {
  debug: false,
  audioDevice: undefined as string | undefined, // Let system auto-detect by default
};

// Environment variable names
export const ENV_VARS = {
  DEBUG: 'STTS_DEBUG',
  AUDIO_DEVICE: 'STTS_AUDIO_DEVICE',
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

// Session directories
export const SESSION_DEPOT_DIR = '.stts_depot';
export const SESSION_LOGS_SUBDIR = 'logs';
export const SESSION_CACHE_SUBDIR = 'cache';

// TTS Environment variables
export const TTS_ENV_VARS = {
  CLAUDE_SETTINGS_PATH: 'STTS_CLAUDE_SETTINGS_PATH',
};
