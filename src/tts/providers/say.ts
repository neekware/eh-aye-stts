import { spawn } from 'child_process';
import { BaseTTSProvider } from './base.js';

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

  async speak(text: string): Promise<boolean> {
    try {
      const say = await import('say');
      const voice = this.getVoice();

      return new Promise((resolve) => {
        say.default.speak(text, voice, 1.0, (err: any) => {
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
}
