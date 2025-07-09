import { BaseTTSProvider } from './base';
import { Emotion } from '../types';

export class SayProvider extends BaseTTSProvider {
  readonly name = 'say';

  async isAvailable(): Promise<boolean> {
    try {
      const say = await import('say');
      return !!say.default;
    } catch {
      return false;
    }
  }

  async speak(text: string, emotion?: Emotion): Promise<boolean> {
    try {
      const say = await import('say');
      const voice = this.getVoice();
      const rate = this.getRate(emotion);
      const emotionalText = this.addEmotionalContext(text, emotion);

      return new Promise((resolve) => {
        say.default.speak(emotionalText, voice, rate, (err?: string) => {
          resolve(!err);
        });
      });
    } catch (error) {
      console.error('Say provider error:', error);
      return false;
    }
  }

  private getVoice(): string | undefined {
    const platform = process.platform;
    const gender = this.config.voiceGender || 'female';

    if (platform === 'darwin') {
      // macOS
      return gender === 'male' ? 'Alex' : 'Samantha';
    } else if (platform === 'win32') {
      // Windows
      return gender === 'male' ? 'David' : 'Zira';
    } else {
      // Linux
      return gender === 'male' ? 'male' : 'female';
    }
  }

  private getRate(emotion?: Emotion): number {
    switch (emotion) {
      case 'urgent':
        return 1.3; // Faster speech for urgency
      case 'disappointed':
        return 0.9; // Slower speech for disappointment
      case 'cheerful':
        return 1.1; // Slightly faster for enthusiasm
      case 'concerned':
        return 0.95; // Slightly slower for concern
      case 'excited':
        return 1.4; // Very fast for excitement
      case 'sarcastic':
        return 1.05; // Slightly faster with pauses
      case 'calm':
        return 0.85; // Slower and peaceful
      case 'angry':
        return 1.2; // Faster with intensity
      case 'empathetic':
        return 0.9; // Slower and thoughtful
      case 'confused':
        return 1.0; // Normal with hesitation
      case 'hopeful':
        return 1.05; // Slightly faster
      case 'fearful':
        return 1.15; // Faster with tension
      case 'melancholic':
        return 0.8; // Very slow and sad
      case 'curious':
        return 1.1; // Slightly faster with interest
      case 'neutral':
      default:
        return 1.0; // Normal speed
    }
  }

  private addEmotionalContext(text: string, emotion?: Emotion): string {
    if (!emotion || emotion === 'neutral') {
      return text;
    }

    // Add simple prefixes or suffixes to help convey emotion
    switch (emotion) {
      case 'cheerful':
        return `Yay! ${text}`;
      case 'urgent':
        return `Attention! ${text}`;
      case 'concerned':
        return `Hmm... ${text}`;
      case 'disappointed':
        return `Oh... ${text}`;
      case 'excited':
        return `Wow! ${text}!`;
      case 'sarcastic':
        return `Oh, ${text}`;
      case 'calm':
        return text;
      case 'angry':
        return `${text}!`;
      case 'empathetic':
        return `I understand... ${text}`;
      case 'confused':
        return `Um... ${text}?`;
      case 'hopeful':
        return `Maybe... ${text}`;
      case 'fearful':
        return `Oh no... ${text}`;
      case 'melancholic':
        return `*sigh* ${text}`;
      case 'curious':
        return `Hmm? ${text}`;
      default:
        return text;
    }
  }
}
