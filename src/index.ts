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
export { Emotion, VoiceType, TTSConfig } from './tts/types';

// Utility exports
export { detectEmotion, getEmotionDescription } from './tts/emotion-detector';

// Plugin system exports
export {
  STTSPlugin,
  BasePlugin,
  PluginContext,
  PluginEvent,
  PluginRegistry,
  getRegistry,
} from './plugins';

// Claude Code plugin (separate export for optional use)
export { ClaudeCodePlugin } from './plugins/claude-code';
