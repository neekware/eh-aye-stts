import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { STTSConfig } from '../types';
import {
  STTS_DIR,
  SETTINGS_PATH,
  PROJECT_CONFIG_FILE,
  DEFAULT_CONFIG,
  ENV_VARS,
} from '../defaults';

function ensureConfigDirExists(): void {
  if (!existsSync(STTS_DIR)) {
    mkdirSync(STTS_DIR, { recursive: true });
  }
}

export function loadSTTSConfig(): STTSConfig {
  let config: STTSConfig = { ...DEFAULT_CONFIG };

  // Ensure config directory exists
  ensureConfigDirExists();

  // 1. Load global config from ~/.stts/settings.json
  if (existsSync(SETTINGS_PATH)) {
    try {
      const configData = readFileSync(SETTINGS_PATH, 'utf-8');
      const globalConfig = JSON.parse(configData) as STTSConfig;
      config = { ...config, ...globalConfig };
    } catch (error) {
      console.error(`Failed to parse config from ${SETTINGS_PATH}:`, error);
    }
  }

  // 2. Load project config from current directory (overrides global)
  const projectConfigPath = join(process.cwd(), PROJECT_CONFIG_FILE);
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
  if (process.env[ENV_VARS.DANGEROUS_COMMAND_BLOCKING] === 'true') {
    config.enableDangerousCommandBlocking = true;
  }

  if (process.env[ENV_VARS.AUDIO_ENABLED] === 'false') {
    config.audioEnabled = false;
  }

  if (
    process.env[ENV_VARS.DEBUG] === 'true' ||
    process.env.DEBUG === 'true' ||
    process.env.DEBUG === '1'
  ) {
    config.debug = true;
  }

  const customCommands = process.env[ENV_VARS.CUSTOM_DANGEROUS_COMMANDS];
  if (customCommands) {
    config.customDangerousCommands = customCommands.split(',').map((cmd) => cmd.trim());
  }

  return config;
}

export function getConfigValue<T>(key: keyof STTSConfig, defaultValue?: T): T {
  const config = loadSTTSConfig();
  const defaultConfig = DEFAULT_CONFIG as STTSConfig;
  return (config[key] as T) ?? defaultValue ?? (defaultConfig[key] as T);
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
