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
      // Escape single quotes in text
      const escapedText = text.replace(/'/g, "'\"'\"'");

      // Build the say command with audio device preference
      let command = `say`;

      // Try to use external audio device if available
      const audioDevice = await this.getPreferredAudioDevice();
      if (audioDevice) {
        command += ` -a "${audioDevice}"`;
      }

      command += ` '${escapedText}'`;

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
}
