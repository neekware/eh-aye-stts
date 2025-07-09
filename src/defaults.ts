import { join } from 'path';
import { homedir } from 'os';

// Base directories
export const HOME_DIR = homedir();
export const STTS_DIR = join(HOME_DIR, '.stts');
export const LOGS_DIR = join(STTS_DIR, 'logs');

// Config files
export const SETTINGS_PATH = join(STTS_DIR, 'settings.json');
export const PROJECT_CONFIG_FILE = '.stts.json';

// Default configuration
export const DEFAULT_CONFIG = {
  audioEnabled: true,
  enableDangerousCommandBlocking: false,
  customDangerousCommands: [],
};

// Environment variable names
export const ENV_VARS = {
  DANGEROUS_COMMAND_BLOCKING: 'STTS_ENABLE_DANGEROUS_COMMAND_BLOCKING',
  AUDIO_ENABLED: 'STTS_AUDIO_ENABLED',
  CUSTOM_DANGEROUS_COMMANDS: 'STTS_CUSTOM_DANGEROUS_COMMANDS',
};

// Hook names
export const HOOK_NAMES = {
  PRE_TOOL_USE: 'PreToolUse',
  POST_TOOL_USE: 'PostToolUse',
  NOTIFICATION: 'Notification',
  STOP: 'Stop',
  SUBAGENT_STOP: 'SubagentStop',
  AGENT: 'Agent',
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
