import { spawn } from 'child_process';
import { BaseTTSProvider } from './base.js';
import { TTSConfig } from '../types.js';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export class ElevenLabsProvider extends BaseTTSProvider {
  readonly name = 'elevenlabs';
  private apiKey: string;

  constructor(config: TTSConfig) {
    super(config);
    this.apiKey = config.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY || '';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const axios = await import('axios');
      const response = await axios.default.get('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': this.apiKey },
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async speak(text: string): Promise<boolean> {
    try {
      const axios = await import('axios');
      const voiceId = this.getVoiceId();

      const response = await axios.default.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        },
        {
          headers: {
            Accept: 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          responseType: 'stream',
        }
      );

      // Play the audio stream
      await this.playAudioStream(response.data as AsyncIterable<Uint8Array>);
      return true;
    } catch (error) {
      console.error('ElevenLabs provider error:', error);
      return false;
    }
  }

  private getVoiceId(): string {
    if (this.config.elevenLabsVoiceId) {
      return this.config.elevenLabsVoiceId;
    }

    // Default voices
    const gender = this.config.voiceGender || 'female';
    return gender === 'male' ? 'ErXwobaYiN019PkySvjV' : 'EXAVITQu4vr4xnSDxMaL'; // Antoni : Rachel
  }

  private async playAudioStream(audioStream: AsyncIterable<Uint8Array>): Promise<void> {
    // Save to temp file first for better compatibility
    const tempFile = join(tmpdir(), `stts-${Date.now()}.mp3`);

    try {
      // Write stream to temp file
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }
      await fs.writeFile(tempFile, Buffer.concat(chunks));

      // Play the temp file
      await this.playAudioFile(tempFile);

      // Clean up
      await fs.unlink(tempFile).catch(() => {});
    } catch (error) {
      // Clean up on error
      await fs.unlink(tempFile).catch(() => {});
      throw error;
    }
  }

  private async playAudioFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const platform = process.platform;
      let playerCmd: string;
      let playerArgs: string[];

      if (platform === 'darwin') {
        // macOS
        playerCmd = 'afplay';
        playerArgs = [filePath];
      } else if (platform === 'win32') {
        // Windows
        playerCmd = 'powershell';
        playerArgs = ['-c', `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`];
      } else {
        // Linux
        playerCmd = 'aplay';
        playerArgs = [filePath];
      }

      const player = spawn(playerCmd, playerArgs);

      player.on('close', (code: number | null) => {
        if (code === 0) resolve();
        else reject(new Error(`Audio player exited with code ${code}`));
      });

      player.on('error', reject);
    });
  }
}
