export interface HookConfig {
  type: 'command';
  command: string;
  timeout?: number;
}

export interface HookMatcher {
  matcher: string; // Pattern to match tools, e.g., "*" for all tools, "bash" for bash only
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
  session_id?: string;
  transcript_path?: string;
  hook_event_name?: string;
  stop_hook_active?: boolean;
}

export interface SubagentStopEvent {
  agentId?: string;
  reason?: string;
  taskDescription?: string;
  duration?: number;
  success?: boolean;
}
