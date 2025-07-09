#!/usr/bin/env node
import { ClaudeCodeHook } from './base-hook';

class AgentHook extends ClaudeCodeHook {
  protected eventType = 'agent';
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new AgentHook();
  void hook.run();
}
