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
  [key: string]: unknown;
}
