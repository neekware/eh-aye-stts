import { TTSProvider, TTSConfig } from '../types.js';

export abstract class BaseTTSProvider implements TTSProvider {
  abstract readonly name: string;

  constructor(protected config: TTSConfig) {}

  abstract isAvailable(): Promise<boolean>;
  abstract speak(text: string): Promise<boolean>;
}
