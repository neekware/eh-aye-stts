#!/usr/bin/env node
import { ClaudeCodeHook } from './base-hook';

class PostToolUseHook extends ClaudeCodeHook {
  protected eventType = 'post-tool-use';
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new PostToolUseHook();
  void hook.run();
}
