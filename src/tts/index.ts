import { config } from 'dotenv';
import { TTSLoader } from './loader.js';
import { TTSConfig } from './types.js';

config(); // Load .env file

export function loadTTS(userConfig: TTSConfig = {}): TTSLoader {
  const envConfig: TTSConfig = {};

  // Only set properties if they have values
  if (process.env.TTS_PRIORITY) {
    envConfig.priority = process.env.TTS_PRIORITY.split(',').map((s) => s.trim());
  }
  if (process.env.TTS_VOICE_GENDER) {
    envConfig.voiceGender = process.env.TTS_VOICE_GENDER as any;
  }
  if (process.env.ELEVENLABS_API_KEY) {
    envConfig.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  }
  if (process.env.OPENAI_API_KEY) {
    envConfig.openaiApiKey = process.env.OPENAI_API_KEY;
  }
  if (process.env.TTS_ELEVENLABS_VOICE_ID) {
    envConfig.elevenLabsVoiceId = process.env.TTS_ELEVENLABS_VOICE_ID;
  }
  if (process.env.TTS_OPENAI_MODEL) {
    envConfig.openaiModel = process.env.TTS_OPENAI_MODEL;
  }

  const finalConfig = { ...envConfig, ...userConfig };
  return new TTSLoader(finalConfig);
}

export * from './types.js';
export * from './loader.js';
