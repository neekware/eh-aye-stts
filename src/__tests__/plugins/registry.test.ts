import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginRegistry, getRegistry } from '../../plugins/registry';
import { BasePlugin } from '../../plugins/base';
import { AudioService } from '../../audio/service';

vi.mock('../../audio/service');

class TestPlugin extends BasePlugin {
  name = 'test-plugin';
  description = 'Test plugin';

  handleEvent = vi.fn();
  isAvailable = vi.fn().mockResolvedValue(true);
  destroy = vi.fn();
}

class UnavailablePlugin extends BasePlugin {
  name = 'unavailable-plugin';

  isAvailable = vi.fn().mockResolvedValue(false);
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    // Reset singleton
    (PluginRegistry as any).instance = undefined;
    registry = getRegistry();
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const registry1 = PluginRegistry.getInstance();
      const registry2 = PluginRegistry.getInstance();

      expect(registry1).toBe(registry2);
    });

    it('should accept config on first creation', () => {
      const newRegistry = PluginRegistry.getInstance({
        audioConfig: { voiceType: 'male' },
      });

      expect(newRegistry).toBeDefined();
    });
  });

  describe('register', () => {
    it('should register a plugin successfully', async () => {
      const plugin = new TestPlugin();

      await registry.register(plugin);

      expect(registry.getPlugin('test-plugin')).toBe(plugin);
    });

    it('should initialize plugin with context', async () => {
      const plugin = new TestPlugin();
      const initSpy = vi.spyOn(plugin, 'init');

      await registry.register(plugin, { customConfig: true });

      expect(initSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.any(AudioService),
          config: { customConfig: true },
          logger: expect.objectContaining({
            info: expect.any(Function),
            warn: expect.any(Function),
            error: expect.any(Function),
            debug: expect.any(Function),
          }),
        })
      );
    });

    it('should throw error if plugin already registered', async () => {
      const plugin = new TestPlugin();

      await registry.register(plugin);

      await expect(registry.register(plugin)).rejects.toThrow(
        'Plugin test-plugin is already registered'
      );
    });

    it('should throw error if plugin is not available', async () => {
      const plugin = new UnavailablePlugin();

      await expect(registry.register(plugin)).rejects.toThrow(
        'Plugin unavailable-plugin is not available in this environment'
      );
    });

    it('should work with plugins without isAvailable method', async () => {
      const plugin = new TestPlugin();
      plugin.isAvailable = undefined;

      await expect(registry.register(plugin)).resolves.not.toThrow();
    });
  });

  describe('unregister', () => {
    it('should unregister a plugin', async () => {
      const plugin = new TestPlugin();
      await registry.register(plugin);

      await registry.unregister('test-plugin');

      expect(registry.getPlugin('test-plugin')).toBeUndefined();
    });

    it('should call destroy on plugin if available', async () => {
      const plugin = new TestPlugin();
      await registry.register(plugin);

      await registry.unregister('test-plugin');

      expect(plugin.destroy).toHaveBeenCalled();
    });

    it('should throw error if plugin not found', async () => {
      await expect(registry.unregister('non-existent')).rejects.toThrow(
        'Plugin non-existent not found'
      );
    });

    it('should work with plugins without destroy method', async () => {
      const plugin = new TestPlugin();
      plugin.destroy = undefined;
      await registry.register(plugin);

      await expect(registry.unregister('test-plugin')).resolves.not.toThrow();
    });
  });

  describe('getAllPlugins', () => {
    it('should return all registered plugins', async () => {
      const plugin1 = new TestPlugin();
      plugin1.name = 'plugin1';
      const plugin2 = new TestPlugin();
      plugin2.name = 'plugin2';

      await registry.register(plugin1);
      await registry.register(plugin2);

      const plugins = registry.getAllPlugins();

      expect(plugins).toHaveLength(2);
      expect(plugins).toContain(plugin1);
      expect(plugins).toContain(plugin2);
    });

    it('should return empty array when no plugins registered', () => {
      expect(registry.getAllPlugins()).toEqual([]);
    });
  });

  describe('broadcastEvent', () => {
    it('should broadcast event to all plugins with handlers', async () => {
      const plugin1 = new TestPlugin();
      const plugin2 = new TestPlugin();
      plugin2.name = 'test-plugin-2';
      const plugin3 = new TestPlugin();
      plugin3.name = 'test-plugin-3';
      plugin3.handleEvent = undefined;

      await registry.register(plugin1);
      await registry.register(plugin2);
      await registry.register(plugin3);

      const event = {
        type: 'test-event',
        source: 'test',
        timestamp: new Date().toISOString(),
        data: { test: true },
      };

      await registry.broadcastEvent(event);

      expect(plugin1.handleEvent).toHaveBeenCalledWith(event);
      expect(plugin2.handleEvent).toHaveBeenCalledWith(event);
    });

    it('should handle plugin errors gracefully', async () => {
      const plugin1 = new TestPlugin();
      plugin1.handleEvent.mockRejectedValue(new Error('Plugin error'));
      const plugin2 = new TestPlugin();
      plugin2.name = 'test-plugin-2';

      await registry.register(plugin1);
      await registry.register(plugin2);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const event = {
        type: 'test-event',
        source: 'test',
        timestamp: new Date().toISOString(),
        data: {},
      };

      await registry.broadcastEvent(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Plugin test-plugin failed to handle event:',
        expect.any(Error)
      );
      expect(plugin2.handleEvent).toHaveBeenCalledWith(event);

      consoleSpy.mockRestore();
    });
  });

  describe('getAudioService', () => {
    it('should return audio service instance', () => {
      const audioService = registry.getAudioService();

      expect(audioService).toBeInstanceOf(AudioService);
    });
  });

  describe('initialize', () => {
    it('should initialize registry', () => {
      expect(() => registry.initialize()).not.toThrow();
    });

    it('should not re-initialize if already initialized', () => {
      registry.initialize();
      registry.initialize(); // Should not throw

      expect(true).toBe(true); // Just verify no errors
    });
  });
});
