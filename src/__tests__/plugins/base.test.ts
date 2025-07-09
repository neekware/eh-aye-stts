import { describe, it, expect, vi } from 'vitest';
import { BasePlugin, PluginContext } from '../../plugins/base';
import { AudioService } from '../../audio/service';

class TestPlugin extends BasePlugin {
  name = 'test-plugin';
  description = 'A test plugin';
  version = '1.0.0';
}

describe('BasePlugin', () => {
  let plugin: TestPlugin;
  let mockContext: PluginContext;

  beforeEach(() => {
    plugin = new TestPlugin();
    mockContext = {
      audio: new AudioService(),
      config: { testConfig: true },
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    };
  });

  describe('properties', () => {
    it('should have required name property', () => {
      expect(plugin.name).toBe('test-plugin');
    });

    it('should have optional description property', () => {
      expect(plugin.description).toBe('A test plugin');
    });

    it('should have optional version property', () => {
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('init', () => {
    it('should initialize plugin with context', () => {
      plugin.init(mockContext);

      expect(plugin.audio).toBe(mockContext.audio);
      expect(plugin.config).toBe(mockContext.config);
      expect(plugin.logger).toBe(mockContext.logger);
    });

    it('should work without optional properties', () => {
      const minimalPlugin = new BasePlugin() as any;
      minimalPlugin.name = 'minimal';

      expect(() => minimalPlugin.init(mockContext)).not.toThrow();
    });
  });

  describe('protected properties', () => {
    it('should provide access to audio after init', () => {
      plugin.init(mockContext);

      expect(plugin.audio).toBeDefined();
      expect(plugin.audio).toBeInstanceOf(AudioService);
    });

    it('should provide access to config after init', () => {
      plugin.init(mockContext);

      expect(plugin.config).toEqual({ testConfig: true });
    });

    it('should provide access to logger after init', () => {
      plugin.init(mockContext);

      expect(plugin.logger).toBeDefined();
      expect(plugin.logger.info).toBeDefined();
      expect(plugin.logger.warn).toBeDefined();
      expect(plugin.logger.error).toBeDefined();
      expect(plugin.logger.debug).toBeDefined();
    });
  });

  describe('optional methods', () => {
    it('should allow plugins to implement handleEvent', async () => {
      class EventPlugin extends BasePlugin {
        name = 'event-plugin';
        handleEvent = vi.fn();
      }

      const eventPlugin = new EventPlugin();
      const event = { type: 'test', source: 'test', timestamp: '2025-07-09', data: {} };

      if (eventPlugin.handleEvent) {
        await eventPlugin.handleEvent(event);
      }

      expect(eventPlugin.handleEvent).toHaveBeenCalledWith(event);
    });

    it('should allow plugins to implement isAvailable', async () => {
      class AvailablePlugin extends BasePlugin {
        name = 'available-plugin';
        isAvailable = vi.fn().mockResolvedValue(true);
      }

      const availablePlugin = new AvailablePlugin();

      if (availablePlugin.isAvailable) {
        const result = await availablePlugin.isAvailable();
        expect(result).toBe(true);
      }
    });

    it('should allow plugins to implement destroy', async () => {
      class DestroyablePlugin extends BasePlugin {
        name = 'destroyable-plugin';
        destroy = vi.fn();
      }

      const destroyablePlugin = new DestroyablePlugin();

      if (destroyablePlugin.destroy) {
        await destroyablePlugin.destroy();
      }

      expect(destroyablePlugin.destroy).toHaveBeenCalled();
    });
  });

  describe('inheritance', () => {
    it('should allow extending plugins to override init', () => {
      class ExtendedPlugin extends BasePlugin {
        name = 'extended-plugin';
        customProperty?: string;

        init(context: PluginContext): void {
          super.init(context);
          this.customProperty = 'initialized';
        }
      }

      const extendedPlugin = new ExtendedPlugin();
      extendedPlugin.init(mockContext);

      expect(extendedPlugin.audio).toBe(mockContext.audio);
      expect(extendedPlugin.customProperty).toBe('initialized');
    });
  });
});
