import { spawn } from 'child_process';
import { BaseTTSProvider } from './base.js';
import { TTSConfig, Emotion } from '../types.js';
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

  async speak(text: string, emotion?: Emotion): Promise<boolean> {
    try {
      const axios = await import('axios');
      const voiceId = this.getVoiceId();
      const voiceSettings = this.getVoiceSettings(emotion);
      const { enhancedText, nextText } = this.addEmotionalContext(text, emotion);

      const requestBody: {
        text: string;
        model_id: string;
        voice_settings: { stability: number; similarity_boost: number };
        next_text?: string;
      } = {
        text: enhancedText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: voiceSettings,
      };

      // Add next_text for emotional context if provided
      if (nextText) {
        requestBody.next_text = nextText;
      }

      const response = await axios.default.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        requestBody,
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

  private getVoiceSettings(emotion?: Emotion): { stability: number; similarity_boost: number } {
    switch (emotion) {
      case 'cheerful':
        return { stability: 0.3, similarity_boost: 0.7 };
      case 'urgent':
        return { stability: 0.2, similarity_boost: 0.5 };
      case 'concerned':
        return { stability: 0.4, similarity_boost: 0.6 };
      case 'disappointed':
        return { stability: 0.7, similarity_boost: 0.3 };
      case 'neutral':
      default:
        return { stability: 0.5, similarity_boost: 0.5 };
    }
  }

  private addEmotionalContext(
    text: string,
    emotion?: Emotion
  ): { enhancedText: string; nextText?: string } {
    if (!emotion || emotion === 'neutral') {
      return { enhancedText: text };
    }

    let contextualPrefix = '';
    let nextText = '';

    switch (emotion) {
      case 'cheerful':
        contextualPrefix = '';
        nextText = ' she said excitedly.';
        break;
      case 'urgent':
        contextualPrefix = '';
        nextText = ' she said urgently, with emphasis.';
        break;
      case 'concerned':
        contextualPrefix = '';
        nextText = ' she said with concern in her voice.';
        break;
      case 'disappointed':
        contextualPrefix = '';
        nextText = ' she said disappointedly.';
        break;
    }

    return {
      enhancedText: contextualPrefix + text,
      nextText: nextText,
    };
  }
}
