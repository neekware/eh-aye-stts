import { BaseTTSProvider } from './base';
import { Emotion } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getConfigValue } from '../../utils/config';

const execAsync = promisify(exec);

export class SayProvider extends BaseTTSProvider {
  readonly name = 'system';

  async isAvailable(): Promise<boolean> {
    try {
      // Check if 'say' command exists on macOS
      if (process.platform === 'darwin') {
        await execAsync('which say');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async speak(text: string, _emotion?: Emotion): Promise<boolean> {
    try {
      const voice = this.getVoice();

      // Escape single quotes in text
      const escapedText = text.replace(/'/g, "'\"'\"'");

      // Build the say command with audio device preference
      let command = `say`;

      // Try to use external audio device if available
      const audioDevice = await this.getPreferredAudioDevice();
      if (audioDevice) {
        command += ` -a "${audioDevice}"`;
      }

      command += ` -v "${voice}" '${escapedText}'`;

      await execAsync(command);
      return true;
    } catch (error) {
      console.error('Say provider error:', error);
      return false;
    }
  }

  private async getPreferredAudioDevice(): Promise<string | null> {
    try {
      // First check if user has configured a specific device
      const configuredDevice = getConfigValue('audioDevice', undefined);
      if (configuredDevice && typeof configuredDevice === 'string') {
        return configuredDevice;
      }

      // Get list of audio devices
      const { stdout } = await execAsync("say -a '?'");
      const devices = stdout
        .trim()
        .split('\n')
        .map((line) => line.trim());

      // Priority order for audio devices
      const preferredDevices = [
        'External Headphones',
        'Headphones',
        'External Speaker',
        'USB Audio',
        'DisplayPort',
        'HDMI',
      ];

      // Find first matching preferred device
      for (const preferred of preferredDevices) {
        const device = devices.find((d) => d.includes(preferred));
        if (device) {
          // Extract device name (everything after the ID number)
          const match = device.match(/^\s*\d+\s+(.+)$/);
          return match ? match[1].trim() : null;
        }
      }

      // If no preferred device found, return null to use system default
      return null;
    } catch {
      // If we can't get device list, just use system default
      return null;
    }
  }

  private getVoice(): string | undefined {
    const platform = process.platform;
    const voiceType = this.config.voiceType || 'female';

    if (platform === 'darwin') {
      // macOS
      return voiceType === 'male' ? 'Alex' : 'Samantha';
    } else if (platform === 'win32') {
      // Windows
      return voiceType === 'male' ? 'David' : 'Zira';
    } else {
      // Linux
      return voiceType === 'male' ? 'male' : 'female';
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
