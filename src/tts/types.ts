export type VoiceGender = 'male' | 'female';

export type Emotion = 'cheerful' | 'neutral' | 'concerned' | 'urgent' | 'disappointed';

export interface TTSConfig {
  priority?: string[];
  voiceGender?: VoiceGender;
  elevenLabsApiKey?: string;
  openaiApiKey?: string;
  elevenLabsVoiceId?: string;
  openaiModel?: string;
  defaultEmotion?: Emotion;
}

export interface TTSProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  speak(text: string, emotion?: Emotion): Promise<boolean>;
}
