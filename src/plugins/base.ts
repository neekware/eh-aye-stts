import { AudioService } from '../audio/service';

export interface PluginContext {
  audio: AudioService;
  config: PluginConfig;
  logger: PluginLogger;
}

export interface PluginConfig {
  [key: string]: unknown;
}

export interface PluginLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export interface STTSPlugin {
  /** Unique identifier for the plugin */
  name: string;

  /** Human-readable description */
  description?: string;

  /** Plugin version */
  version?: string;

  /** Initialize the plugin with context */
  init(context: PluginContext): Promise<void> | void;

  /** Handle incoming events (optional) */
  handleEvent?(event: PluginEvent): Promise<void>;

  /** Cleanup when plugin is disabled */
  destroy?(): Promise<void> | void;

  /** Check if plugin requirements are met */
  isAvailable?(): Promise<boolean> | boolean;
}

export interface PluginEvent {
  type: string;
  source: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export abstract class BasePlugin implements STTSPlugin {
  abstract name: string;
  protected context!: PluginContext;

  init(context: PluginContext): void {
    this.context = context;
  }

  protected get audio(): AudioService {
    return this.context.audio;
  }

  protected get config(): PluginConfig {
    return this.context.config;
  }

  protected get logger(): PluginLogger {
    return this.context.logger;
  }
}
