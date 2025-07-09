import { TTSProvider, TTSConfig, Emotion } from '../types';

export abstract class BaseTTSProvider implements TTSProvider {
  abstract readonly name: string;

  constructor(protected config: TTSConfig) {}

  abstract isAvailable(): Promise<boolean>;
  abstract speak(text: string, emotion?: Emotion): Promise<boolean>;
}
