import { join, dirname } from 'path';
import { HOME_DIR, CLAUDE_DIR, CLAUDE_SETTINGS_FILE, TTS_ENV_VARS } from '../../defaults';

/**
 * Get the path to Claude settings file.
 * Can be overridden with STTS_CLAUDE_SETTINGS_PATH environment variable.
 */
export function getClaudeSettingsPath(): string {
  return (
    process.env[TTS_ENV_VARS.CLAUDE_SETTINGS_PATH] ||
    join(HOME_DIR, CLAUDE_DIR, CLAUDE_SETTINGS_FILE)
  );
}

/**
 * Get the directory containing Claude settings.
 * Can be overridden with STTS_CLAUDE_SETTINGS_PATH environment variable.
 */
export function getClaudeSettingsDir(): string {
  return dirname(getClaudeSettingsPath());
}
