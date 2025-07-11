import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SayProvider } from '../../../tts/providers/say';

describe('SayProvider', () => {
  let provider: SayProvider;

  beforeEach(() => {
    provider = new SayProvider({});
  });

  describe('name', () => {
    it('should have the correct name', () => {
      expect(provider.name).toBe('system');
    });
  });

  describe('getVoice', () => {
    it('should return appropriate voice for female config on macOS', () => {
      if (process.platform === 'darwin') {
        const femaleProvider = new SayProvider({ voiceType: 'female' });
        expect(femaleProvider['getVoice']()).toBe('Samantha');
      }
    });

    it('should return appropriate voice for male config on macOS', () => {
      if (process.platform === 'darwin') {
        const maleProvider = new SayProvider({ voiceType: 'male' });
        expect(maleProvider['getVoice']()).toBe('Alex');
      }
    });
  });

  describe('isAvailable', () => {
    it('should check if say command exists', async () => {
      // This will actually check if say is available on the system
      const result = await provider.isAvailable();

      // On macOS, say should be available
      if (process.platform === 'darwin') {
        expect(result).toBe(true);
      } else {
        expect(typeof result).toBe('boolean');
      }
    });
  });
});
