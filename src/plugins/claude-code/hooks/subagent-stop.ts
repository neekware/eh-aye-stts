#!/usr/bin/env node
import { ClaudeCodeHook } from './base-hook';

class SubagentStopHook extends ClaudeCodeHook {
  protected eventType = 'subagent-stop';
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new SubagentStopHook();
  void hook.run();
}
