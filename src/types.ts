export interface ToolInfo {
  name: string;
  executable: string;
  settingsPath: string;
  detected: boolean;
}

export interface HookConfig {
  type: 'command';
  command: string;
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
  [key: string]: any;
}

export interface HookEvent {
  type: string;
  timestamp: string;
  data: any;
}

export interface PreToolUseEvent {
  tool: string;
  args: any;
  cwd: string;
}

export interface PostToolUseEvent extends PreToolUseEvent {
  result: any;
  exitCode: number;
  duration: number;
}

export interface NotificationEvent {
  message: string;
  type?: string;
  level?: string;
}

export interface StopEvent {
  reason?: string;
  exitCode?: number;
}

export interface SubagentStopEvent {
  agentId?: string;
  reason?: string;
}