#!/usr/bin/env node
import { ClaudeCodeHook } from './base-hook';

class PreToolUseHook extends ClaudeCodeHook {
  protected eventType = 'pre-tool-use';
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new PreToolUseHook();
  void hook.run();
}
