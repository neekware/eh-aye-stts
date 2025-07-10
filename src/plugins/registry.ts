import { STTSPlugin, PluginContext, PluginEvent, PluginLogger } from './base';
import { AudioService } from '../audio/service';
import { TTSConfig } from '../tts/types';

export interface RegistryConfig {
  audioConfig?: TTSConfig;
  pluginsDir?: string;
  enabledPlugins?: string[];
}

class SimpleLogger implements PluginLogger {
  constructor(private pluginName: string) {}

  info(message: string): void {
    console.log(`[${this.pluginName}] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[${this.pluginName}] ${message}`);
  }

  error(message: string): void {
    console.error(`[${this.pluginName}] ${message}`);
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      console.debug(`[${this.pluginName}] ${message}`);
    }
  }
}

export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins: Map<string, STTSPlugin> = new Map();
  private audio: AudioService;
  private initialized = false;

  private constructor(config?: RegistryConfig) {
    this.audio = new AudioService(config?.audioConfig);
  }

  static getInstance(config?: RegistryConfig): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry(config);
    }
    return PluginRegistry.instance;
  }

  /**
   * Register a plugin
   */
  async register(plugin: STTSPlugin, config?: Record<string, unknown>): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }

    // Check if plugin is available
    if (plugin.isAvailable) {
      const available = await plugin.isAvailable();
      if (!available) {
        throw new Error(`Plugin ${plugin.name} is not available in this environment`);
      }
    }

    // Create context for the plugin
    const context: PluginContext = {
      audio: this.audio,
      config: config || {},
      logger: new SimpleLogger(plugin.name),
    };

    // Initialize the plugin
    await plugin.init(context);

    // Store the plugin
    this.plugins.set(plugin.name, plugin);

    console.log(`✓ Registered plugin: ${plugin.name}`);
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    // Call destroy if available
    if (plugin.destroy) {
      await plugin.destroy();
    }

    this.plugins.delete(pluginName);
    console.log(`✓ Unregistered plugin: ${pluginName}`);
  }

  /**
   * Get a registered plugin
   */
  getPlugin(name: string): STTSPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): STTSPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Broadcast an event to all plugins that can handle it
   */
  async broadcastEvent(event: PluginEvent): Promise<void> {
    const handlers = Array.from(this.plugins.values()).filter((p) => p.handleEvent !== undefined);

    await Promise.all(
      handlers.map(async (plugin) => {
        try {
          await plugin.handleEvent!(event);
        } catch (error) {
          console.error(`Plugin ${plugin.name} failed to handle event:`, error);
        }
      })
    );
  }

  /**
   * Get the audio service
   */
  getAudioService(): AudioService {
    return this.audio;
  }

  /**
   * Initialize the registry
   */
  initialize(): void {
    if (this.initialized) return;

    // Load plugins from config or environment
    // This could be extended to auto-load plugins from a directory

    this.initialized = true;
  }
}

// Convenience function to get registry instance
export function getRegistry(config?: RegistryConfig): PluginRegistry {
  return PluginRegistry.getInstance(config);
}
