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

// Claude types
export { ClaudeSettings, HookMatcher } from './types';
