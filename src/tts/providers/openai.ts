import { spawn } from 'child_process';
import { BaseTTSProvider } from './base.js';
import { TTSConfig, Emotion } from '../types.js';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export class OpenAIProvider extends BaseTTSProvider {
  readonly name = 'openai';
  private apiKey: string;

  constructor(config: TTSConfig) {
    super(config);
    this.apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY || '';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const axios = await import('axios');
      const response = await axios.default.get('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async speak(text: string, emotion?: Emotion): Promise<boolean> {
    try {
      const axios = await import('axios');
      const voice = this.getVoice();
      const model = this.config.openaiModel || 'tts-1';
      const emotionalText = this.addEmotionalContext(text, emotion, model);

      const response = await axios.default.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model,
          input: emotionalText,
          voice,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        }
      );

      await this.playAudioStream(response.data as AsyncIterable<Uint8Array>);
      return true;
    } catch (error) {
      console.error('OpenAI provider error:', error);
      return false;
    }
  }

  private getVoice(): string {
    const gender = this.config.voiceGender || 'female';
    return gender === 'male' ? 'onyx' : 'nova';
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

  private addEmotionalContext(text: string, emotion?: Emotion, model: string): string {
    if (!emotion || emotion === 'neutral') {
      return text;
    }

    // For newer models that support instructions
    if (model === 'gpt-4o-mini-tts' || model === 'tts-1-hd') {
      let instruction = '';
      switch (emotion) {
        case 'cheerful':
          instruction = 'Speak enthusiastically and cheerfully: ';
          break;
        case 'urgent':
          instruction = 'Speak with urgency and emphasis: ';
          break;
        case 'concerned':
          instruction = 'Speak with concern and empathy: ';
          break;
        case 'disappointed':
          instruction = 'Speak sympathetically and softly: ';
          break;
      }
      return instruction + text;
    }

    // For standard models, add contextual hints
    switch (emotion) {
      case 'cheerful':
        return text + '!';
      case 'urgent':
        return text.toUpperCase();
      case 'concerned':
        return text + '...';
      case 'disappointed':
        return text + '.';
      default:
        return text;
    }
  }
}
