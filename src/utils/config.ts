import { readFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { STTSConfig } from '../types';

const DEFAULT_CONFIG: STTSConfig = {
  audioEnabled: true,
  enableDangerousCommandBlocking: false,
  customDangerousCommands: [],
};

const STTS_DIR = join(homedir(), '.stts');
const NEW_CONFIG_PATH = join(STTS_DIR, 'settings.json');
const OLD_CONFIG_PATH = join(homedir(), '.stts.json');

function migrateConfigIfNeeded(): void {
  // Ensure ~/.stts directory exists
  if (!existsSync(STTS_DIR)) {
    mkdirSync(STTS_DIR, { recursive: true });
  }

  // Migrate old config if it exists and new one doesn't
  if (existsSync(OLD_CONFIG_PATH) && !existsSync(NEW_CONFIG_PATH)) {
    try {
      renameSync(OLD_CONFIG_PATH, NEW_CONFIG_PATH);
      console.log(`Migrated settings from ${OLD_CONFIG_PATH} to ${NEW_CONFIG_PATH}`);
    } catch (error) {
      console.error(
        `Failed to migrate config from ${OLD_CONFIG_PATH} to ${NEW_CONFIG_PATH}:`,
        error
      );
    }
  }
}

export function loadSTTSConfig(): STTSConfig {
  let config: STTSConfig = { ...DEFAULT_CONFIG };

  // Migrate old config if needed
  migrateConfigIfNeeded();

  // 1. Load global config from ~/.stts/settings.json
  if (existsSync(NEW_CONFIG_PATH)) {
    try {
      const configData = readFileSync(NEW_CONFIG_PATH, 'utf-8');
      const globalConfig = JSON.parse(configData) as STTSConfig;
      config = { ...config, ...globalConfig };
    } catch (error) {
      console.error(`Failed to parse config from ${NEW_CONFIG_PATH}:`, error);
    }
  }

  // 2. Load project config from current directory (overrides global)
  const projectConfigPath = join(process.cwd(), '.stts.json');
  if (existsSync(projectConfigPath)) {
    try {
      const configData = readFileSync(projectConfigPath, 'utf-8');
      const projectConfig = JSON.parse(configData) as STTSConfig;
      config = { ...config, ...projectConfig };
    } catch (error) {
      console.error(`Failed to parse config from ${projectConfigPath}:`, error);
    }
  }

  // 3. Environment variables override everything
  if (process.env.STTS_ENABLE_DANGEROUS_COMMAND_BLOCKING === 'true') {
    config.enableDangerousCommandBlocking = true;
  }

  if (process.env.STTS_AUDIO_ENABLED === 'false') {
    config.audioEnabled = false;
  }

  if (process.env.STTS_CUSTOM_DANGEROUS_COMMANDS) {
    config.customDangerousCommands = process.env.STTS_CUSTOM_DANGEROUS_COMMANDS.split(',').map(
      (cmd) => cmd.trim()
    );
  }

  return config;
}

export function getConfigValue<T>(key: keyof STTSConfig, defaultValue?: T): T {
  const config = loadSTTSConfig();
  return (config[key] as T) ?? defaultValue ?? (DEFAULT_CONFIG[key] as T);
}

/**
 * Get environment variable with fallback support.
 * Useful for preferring STTS-specific env vars while maintaining backward compatibility.
 * @param primaryKey - The preferred environment variable name (e.g., 'STTS_OPENAI_API_KEY')
 * @param fallbackKey - The fallback environment variable name (e.g., 'OPENAI_API_KEY')
 * @returns The value of the primary key if set, otherwise the fallback key value
 */
export function getEnvWithFallback(primaryKey: string, fallbackKey: string): string | undefined {
  return process.env[primaryKey] || process.env[fallbackKey];
}

// Export config paths for use in other modules
export const GLOBAL_CONFIG_PATH = NEW_CONFIG_PATH;
export const OLD_GLOBAL_CONFIG_PATH = OLD_CONFIG_PATH;
