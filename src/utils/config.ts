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
  const configPaths = [
    // Current directory
    join(process.cwd(), '.sttsrc.json'),
    join(process.cwd(), '.stts.json'),
    // Home directory
    join(homedir(), '.sttsrc.json'),
    join(homedir(), '.stts.json'),
    // Claude config directory
    join(homedir(), '.claude', 'stts.json'),
  ];

  // Environment variable override
  const envConfigPath = process.env.STTS_CONFIG;
  if (envConfigPath) {
    configPaths.unshift(envConfigPath);
  }

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const configData = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData) as STTSConfig;
        return { ...DEFAULT_CONFIG, ...config };
      } catch (error) {
        console.error(`Failed to parse config from ${configPath}:`, error);
      }
    }
  }

  // Check environment variables
  const envConfig: STTSConfig = { ...DEFAULT_CONFIG };

  if (process.env.STTS_ENABLE_DANGEROUS_COMMAND_BLOCKING === 'true') {
    envConfig.enableDangerousCommandBlocking = true;
  }

  if (process.env.STTS_AUDIO_ENABLED === 'false') {
    envConfig.audioEnabled = false;
  }

  if (process.env.STTS_CUSTOM_DANGEROUS_COMMANDS) {
    envConfig.customDangerousCommands = process.env.STTS_CUSTOM_DANGEROUS_COMMANDS.split(',').map(
      (cmd) => cmd.trim()
    );
  }

  return envConfig;
}

export function getConfigValue<T>(key: keyof STTSConfig, defaultValue?: T): T {
  const config = loadSTTSConfig();
  return (config[key] as T) ?? defaultValue ?? (DEFAULT_CONFIG[key] as T);
}
