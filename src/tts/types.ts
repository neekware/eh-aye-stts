export type VoiceGender = 'male' | 'female';

export interface TTSConfig {
  priority?: string[];
  voiceGender?: VoiceGender;
  elevenLabsApiKey?: string;
  openaiApiKey?: string;
  elevenLabsVoiceId?: string;
  openaiModel?: string;
}

export interface TTSProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  speak(text: string): Promise<boolean>;
}
