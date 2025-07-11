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
  debug?: boolean;
  audioDevice?: string; // Preferred audio output device for macOS say command
}
