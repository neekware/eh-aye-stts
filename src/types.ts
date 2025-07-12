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

// Claude hook types
export interface HookConfig {
  type: 'command';
  command: string;
  timeout?: number;
}

export interface HookMatcher {
  matcher: string;
  hooks: HookConfig[];
}

export interface ClaudeSettings {
  hooks?: {
    PreToolUse?: HookMatcher[];
    PostToolUse?: HookMatcher[];
    Notification?: HookMatcher[];
    Stop?: HookMatcher[];
    SubagentStop?: HookMatcher[];
  };
  [key: string]: unknown;
}
