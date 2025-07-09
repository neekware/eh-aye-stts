import { join } from 'path';
import { homedir } from 'os';

/**
 * Get the path to Claude settings file.
 * Can be overridden with STTS_CLAUDE_SETTINGS_PATH environment variable.
 */
export function getClaudeSettingsPath(): string {
  return process.env.STTS_CLAUDE_SETTINGS_PATH || join(homedir(), '.claude', 'settings.json');
}

/**
 * Get the directory containing Claude settings.
 * Can be overridden with STTS_CLAUDE_SETTINGS_PATH environment variable.
 */
export function getClaudeSettingsDir(): string {
  const settingsPath = getClaudeSettingsPath();
  const lastSlash = settingsPath.lastIndexOf('/');
  return lastSlash > 0 ? settingsPath.substring(0, lastSlash) : homedir();
}
