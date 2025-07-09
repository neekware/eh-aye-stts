import { getRegistry } from '../src/plugins/registry';
import { BasePlugin, PluginContext, PluginEvent } from '../src/plugins/base';
import { ClaudeCodePlugin } from '../src/plugins/claude-code';

// Example: Create a custom plugin
class CustomNotificationPlugin extends BasePlugin {
  name = 'custom-notifications';
  description = 'Custom notification handler with sound effects';

  init(context: PluginContext): void {
    super.init(context);
    this.logger.info('Custom notification plugin initialized');
  }

  async handleEvent(event: PluginEvent): Promise<void> {
    // Only handle custom events
    if (event.source !== 'custom-app') return;

    switch (event.type) {
      case 'build-start':
        await this.audio.speak('Build starting...', { emotion: 'neutral' });
        break;
      case 'build-success':
        await this.audio.speak('Build completed successfully!', { emotion: 'cheerful' });
        break;
      case 'build-failure':
        await this.audio.speak('Build failed!', { emotion: 'disappointed' });
        break;
      case 'test-complete': {
        const data = event.data as { passed: number; failed: number };
        if (data.failed === 0) {
          await this.audio.speak(`All ${data.passed} tests passed!`, { emotion: 'excited' });
        } else {
          await this.audio.speak(
            `${data.failed} tests failed out of ${data.passed + data.failed}`,
            { emotion: 'concerned' }
          );
        }
        break;
      }
    }
  }
}

async function pluginExample() {
  console.log('Plugin System Example\n');

  // Get the plugin registry
  const registry = getRegistry();

  // Register the Claude Code plugin
  console.log('1. Registering Claude Code plugin:');
  const claudePlugin = new ClaudeCodePlugin();
  await registry.register(claudePlugin);

  // Register custom plugin
  console.log('\n2. Registering custom plugin:');
  const customPlugin = new CustomNotificationPlugin();
  await registry.register(customPlugin, {
    soundEffects: true,
    volume: 0.8,
  });

  // Simulate events
  console.log('\n3. Simulating events:');

  // Simulate a Claude Code notification
  await registry.broadcastEvent({
    type: 'notification',
    source: 'claude-code',
    timestamp: new Date().toISOString(),
    data: {
      message: 'Task completed successfully!',
      type: 'success',
    },
  });

  // Simulate custom app events
  await registry.broadcastEvent({
    type: 'build-start',
    source: 'custom-app',
    timestamp: new Date().toISOString(),
    data: {},
  });

  // Wait a bit
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await registry.broadcastEvent({
    type: 'test-complete',
    source: 'custom-app',
    timestamp: new Date().toISOString(),
    data: {
      passed: 42,
      failed: 0,
    },
  });

  // List all plugins
  console.log('\n4. Registered plugins:');
  const plugins = registry.getAllPlugins();
  plugins.forEach((plugin) => {
    console.log(`- ${plugin.name}: ${plugin.description || 'No description'}`);
  });
}

pluginExample().catch(console.error);
