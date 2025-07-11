// Main audio API exports
export {
  speak,
  speakWithEmotion,
  createAudioService,
  getAvailableProviders,
  AudioService,
  AudioOptions,
  EMOTIONS,
} from './audio';

// Type exports
export { Emotion, TTSConfig } from './tts/types';

// Plugin system exports
export {
  STTSPlugin,
  BasePlugin,
  PluginContext,
  PluginEvent,
  PluginRegistry,
  getRegistry,
} from './plugins';

// Claude plugin (separate export for optional use)
export { ClaudeCodePlugin } from './plugins/claude';
