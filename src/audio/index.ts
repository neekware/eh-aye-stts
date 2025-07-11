// Audio API functions
export {
  speak,
  speakWithEmotion,
  createAudioService,
  getAvailableProviders,
  EMOTIONS,
} from './api';

// Service exports
export { AudioService, AudioOptions } from './service';

// Re-export TTS types
export { TTSConfig, Emotion } from '../tts/types';
