import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { STTSConfig } from '../types';

const DEFAULT_CONFIG: STTSConfig = {
  audioEnabled: true,
  enableDangerousCommandBlocking: false,
  customDangerousCommands: [],
};

export function loadSTTSConfig(): STTSConfig {
  let config: STTSConfig = { ...DEFAULT_CONFIG };

  // 1. Load global config from home directory
  const globalConfigPath = join(homedir(), '.stts.json');
  if (existsSync(globalConfigPath)) {
    try {
      const configData = readFileSync(globalConfigPath, 'utf-8');
      const globalConfig = JSON.parse(configData) as STTSConfig;
      config = { ...config, ...globalConfig };
    } catch (error) {
      console.error(`Failed to parse config from ${globalConfigPath}:`, error);
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
