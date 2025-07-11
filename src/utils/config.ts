import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
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

/**
 * Merges existing config with defaults, preserving user settings while
 * adding new defaults and removing deprecated fields.
 */
export function mergeWithDefaults(existingConfig: Partial<STTSConfig>): STTSConfig {
  // Start with default config, then merge existing config
  const mergedConfig = { ...DEFAULT_CONFIG, ...existingConfig };

  // List of deprecated fields to remove (add any deprecated fields here)
  const deprecatedFields: string[] = [];

  // Remove deprecated fields
  for (const field of deprecatedFields) {
    delete (mergedConfig as Record<string, unknown>)[field];
  }

  return mergedConfig;
}

/**
 * Loads and updates config file on first load, ensuring existing settings
 * are preserved while new defaults are added.
 */
function loadAndUpdateConfigFile(configPath: string): STTSConfig | null {
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const configData = readFileSync(configPath, 'utf-8');
    const existingConfig = JSON.parse(configData) as Partial<STTSConfig>;

    // Merge with defaults
    const mergedConfig = mergeWithDefaults(existingConfig);

    // Check if update is needed (new default fields added or deprecated fields removed)
    const defaultKeys = Object.keys(DEFAULT_CONFIG);
    const existingKeys = Object.keys(existingConfig);
    const hasNewDefaults = defaultKeys.some((key) => !(key in existingConfig));
    const deprecatedFields: string[] = [];
    const hasDeprecatedFields = existingKeys.some((key) => deprecatedFields.includes(key));

    if (hasNewDefaults || hasDeprecatedFields) {
      // Write back the merged config
      writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2));
    }

    return mergedConfig;
  } catch (error) {
    console.error(`Failed to parse config from ${configPath}:`, error);
    return null;
  }
}

export function loadSTTSConfig(): STTSConfig {
  let config: STTSConfig = { ...DEFAULT_CONFIG };

  // Ensure config directory exists
  ensureConfigDirExists();

  // 1. Load global config from ~/.stts/settings.json
  const globalConfig = loadAndUpdateConfigFile(SETTINGS_PATH);
  if (globalConfig) {
    config = { ...config, ...globalConfig };
  }

  // 2. Load project config from current directory (overrides global)
  const projectConfigPath = join(process.cwd(), PROJECT_CONFIG_FILE);
  const projectConfig = loadAndUpdateConfigFile(projectConfigPath);
  if (projectConfig) {
    config = { ...config, ...projectConfig };
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
