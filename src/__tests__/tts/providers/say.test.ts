import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SayProvider } from '../../../tts/providers/say';

describe('SayProvider', () => {
  let provider: SayProvider;

  beforeEach(() => {
    provider = new SayProvider({});
  });

  describe('name', () => {
    it('should have the correct name', () => {
      expect(provider.name).toBe('say');
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

  describe('getRate', () => {
    it('should return correct rate for different emotions', () => {
      expect(provider['getRate']('urgent')).toBe(1.3);
      expect(provider['getRate']('disappointed')).toBe(0.9);
      expect(provider['getRate']('cheerful')).toBe(1.1);
      expect(provider['getRate']('neutral')).toBe(1.0);
      expect(provider['getRate']()).toBe(1.0);
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
