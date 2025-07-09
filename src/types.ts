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
    Agent?: HookMatcher[];
  };
  [key: string]: unknown;
}

export interface HookEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface PreToolUseEvent {
  tool: string;
  args: string[] | { command?: string; [key: string]: unknown };
  cwd: string;
}

export interface PostToolUseEvent extends PreToolUseEvent {
  result: string | Buffer;
  exitCode: number;
  duration: number;
}

export interface NotificationEvent {
  message: string;
  type?: string;
  level?: string;
  metadata?: {
    emotion?: string;
    [key: string]: unknown;
  };
}

export interface StopEvent {
  reason?: string;
  exitCode?: number;
}

export interface SubagentStopEvent {
  agentId?: string;
  reason?: string;
  taskDescription?: string;
  duration?: number;
  success?: boolean;
}

export interface AgentEvent {
  agentId: string;
  type: 'start' | 'progress' | 'complete' | 'error';
  taskDescription?: string;
  message?: string;
  progress?: number;
  metadata?: {
    emotion?: string;
    priority?: 'low' | 'normal' | 'high';
    announce?: boolean;
    [key: string]: unknown;
  };
}

export interface STTSConfig {
  enableDangerousCommandBlocking?: boolean;
  customDangerousCommands?: string[];
  audioEnabled?: boolean;
  [key: string]: unknown;
}
