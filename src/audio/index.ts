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
export { TTSConfig, Emotion, VoiceGender } from '../tts/types';

// Re-export emotion utilities
export { detectEmotion, getEmotionDescription } from '../tts/emotion-detector';
