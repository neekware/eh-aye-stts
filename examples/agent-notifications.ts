import { getRegistry } from '../src/plugins/registry';
import { ClaudeCodePlugin } from '../src/plugins/claude-code';

/**
 * Example: Background Agent Notifications
 *
 * This example shows how agent tasks running in the background
 * can send audio notifications about their progress.
 */
async function agentNotificationExample() {
  console.log('Agent Notification Example\n');

  // Setup registry and Claude Code plugin
  const registry = getRegistry();
  const claudePlugin = new ClaudeCodePlugin();
  await registry.register(claudePlugin);

  console.log('Simulating background agent tasks...\n');

  // Simulate an agent starting a task
  await registry.broadcastEvent({
    type: 'agent',
    source: 'claude-code',
    timestamp: new Date().toISOString(),
    data: {
      agentId: 'agent-123',
      type: 'start',
      taskDescription: 'analyzing codebase for security vulnerabilities',
    },
  });

  // Wait a bit
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Progress update (high priority so it announces)
  await registry.broadcastEvent({
    type: 'agent',
    source: 'claude-code',
    timestamp: new Date().toISOString(),
    data: {
      agentId: 'agent-123',
      type: 'progress',
      progress: 50,
      metadata: {
        priority: 'high',
      },
    },
  });

  // Wait a bit more
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Task completed successfully
  await registry.broadcastEvent({
    type: 'agent',
    source: 'claude-code',
    timestamp: new Date().toISOString(),
    data: {
      agentId: 'agent-123',
      type: 'complete',
      taskDescription: 'analyzing codebase for security vulnerabilities',
      message: 'Security scan complete! No vulnerabilities found.',
    },
  });

  // Another agent with an error
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await registry.broadcastEvent({
    type: 'agent',
    source: 'claude-code',
    timestamp: new Date().toISOString(),
    data: {
      agentId: 'agent-456',
      type: 'error',
      taskDescription: 'running test suite',
      message: 'Tests failed! 3 test cases need attention.',
      metadata: {
        emotion: 'urgent', // Override default emotion
      },
    },
  });

  // Subagent completing with detailed info
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await registry.broadcastEvent({
    type: 'subagent-stop',
    source: 'claude-code',
    timestamp: new Date().toISOString(),
    data: {
      agentId: 'agent-789',
      taskDescription: 'optimizing database queries',
      duration: 15000, // 15 seconds
      success: true,
    },
  });

  console.log('\nAgent notification examples completed!');
}

// Additional examples of agent event metadata
async function advancedAgentExample() {
  const registry = getRegistry();

  // Silent progress update (won't announce)
  await registry.broadcastEvent({
    type: 'agent',
    source: 'claude-code',
    timestamp: new Date().toISOString(),
    data: {
      agentId: 'agent-silent',
      type: 'progress',
      progress: 25,
      metadata: {
        announce: false, // Explicitly disable announcement
      },
    },
  });

  // Custom emotion for specific scenario
  await registry.broadcastEvent({
    type: 'agent',
    source: 'claude-code',
    timestamp: new Date().toISOString(),
    data: {
      agentId: 'agent-excited',
      type: 'complete',
      message: 'Wow! Performance improved by 300%!',
      metadata: {
        emotion: 'excited',
      },
    },
  });
}

// Run the example
agentNotificationExample()
  .then(() => advancedAgentExample())
  .catch(console.error);
