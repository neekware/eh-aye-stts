export type Emotion =
  | 'cheerful'
  | 'neutral'
  | 'concerned'
  | 'urgent'
  | 'disappointed'
  | 'excited'
  | 'sarcastic'
  | 'calm'
  | 'angry'
  | 'empathetic'
  | 'confused'
  | 'hopeful'
  | 'fearful'
  | 'melancholic'
  | 'curious';

export interface TTSConfig {}

export interface TTSProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  speak(text: string, emotion?: Emotion): Promise<boolean>;
}
