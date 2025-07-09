#!/usr/bin/env node
import { ClaudeCodeHook } from './base-hook';

class NotificationHook extends ClaudeCodeHook {
  protected eventType = 'notification';
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new NotificationHook();
  void hook.run();
}
