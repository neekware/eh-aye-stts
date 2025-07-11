export interface ToolInfo {
  name: string;
  executable: string;
  settingsPath: string;
  detected: boolean;
}

export interface HookEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface STTSConfig {
  enableDangerousCommandBlocking?: boolean;
  customDangerousCommands?: string[];
  audioEnabled?: boolean;
  debug?: boolean;

  // LLM Configuration
  llmEnabled?: boolean;
  llmModel?: string;
  llmStyle?: 'casual' | 'professional' | 'encouraging';
  llmMaxWords?: number;
  llmCacheEnabled?: boolean;
  llmCacheTTL?: number; // seconds

  [key: string]: unknown;
}
