#!/usr/bin/env node
import { ClaudeCodeHook } from './base-hook';

class StopHook extends ClaudeCodeHook {
  protected eventType = 'stop';
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new StopHook();
  void hook.run();
}
