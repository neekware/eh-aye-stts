import { describe, it, expect } from 'vitest';
import { detectEmotion, getEmotionDescription } from '../../tts/emotion-detector';

describe('emotion-detector', () => {
  describe('detectEmotion', () => {
    describe('context-based detection', () => {
      it('should return cheerful for success context', () => {
        expect(detectEmotion('Done', { success: true })).toBe('cheerful');
      });

      it('should return disappointed for error context', () => {
        expect(detectEmotion('Failed', { error: true })).toBe('disappointed');
      });

      it('should return disappointed for non-zero exit code', () => {
        expect(detectEmotion('Process exited', { exitCode: 1 })).toBe('disappointed');
      });

      it('should return cheerful for zero exit code', () => {
        expect(detectEmotion('Process exited', { exitCode: 0 })).toBe('cheerful');
      });
    });

    describe('keyword-based detection', () => {
      // Cheerful keywords
      it('should detect cheerful emotion', () => {
        expect(detectEmotion('Great job!')).toBe('cheerful');
        expect(detectEmotion('Success! Everything worked')).toBe('cheerful');
        expect(detectEmotion('Excellent work')).toBe('cheerful');
        expect(detectEmotion('Perfect execution')).toBe('cheerful');
        expect(detectEmotion('Great! Your achievement is done')).toBe('cheerful');
      });

      // Excited keywords
      it('should detect excited emotion', () => {
        expect(detectEmotion('Amazing! This is incredible!')).toBe('excited');
        expect(detectEmotion('Wow, that was fantastic!')).toBe('excited');
        expect(detectEmotion('Incredible performance!')).toBe('excited');
        expect(detectEmotion('Wow! Amazing results!')).toBe('excited');
      });

      // Disappointed keywords
      it('should detect disappointed emotion', () => {
        expect(detectEmotion('Failed to complete')).toBe('disappointed');
        expect(detectEmotion('Error occurred during process')).toBe('disappointed');
        expect(detectEmotion('It failed and did not work')).toBe('disappointed');
        expect(detectEmotion('Sorry, something went wrong')).toBe('disappointed');
      });

      // Urgent keywords
      it('should detect urgent emotion', () => {
        expect(detectEmotion('Critical error!')).toBe('urgent');
        expect(detectEmotion('Urgent: Emergency situation')).toBe('urgent');
        expect(detectEmotion('Fatal error! Immediate attention needed')).toBe('urgent');
        expect(detectEmotion('System blocked')).toBe('urgent');
        expect(detectEmotion('URGENT: Action required')).toBe('urgent');
      });

      // Concerned keywords
      it('should detect concerned emotion', () => {
        expect(detectEmotion('There is a concern about memory')).toBe('concerned');
        expect(detectEmotion('We need to check this issue')).toBe('concerned');
        expect(detectEmotion('Problem with CPU usage')).toBe('concerned');
        expect(detectEmotion('Issue detected')).toBe('concerned');
      });

      // Sarcastic keywords
      it('should detect sarcastic emotion', () => {
        // Use patterns that don't have conflicting keywords
        expect(detectEmotion('Oh how lovely')).toBe('sarcastic');
        expect(detectEmotion('Such a brilliant idea')).toBe('sarcastic');
        expect(detectEmotion('What a genius move')).toBe('sarcastic');
      });

      // Angry keywords
      it('should detect angry emotion', () => {
        expect(detectEmotion('I am so angry about this!')).toBe('angry');
        expect(detectEmotion('Absolutely furious about this')).toBe('angry');
        expect(detectEmotion('This makes me frustrated!')).toBe('angry');
      });

      // Empathetic keywords
      it('should detect empathetic emotion', () => {
        expect(detectEmotion('I understand your concern')).toBe('empathetic');
        expect(detectEmotion('I feel your frustration')).toBe('empathetic');
        expect(detectEmotion('We understand your patience')).toBe('empathetic');
      });

      // Confused keywords
      it('should detect confused emotion', () => {
        expect(detectEmotion('What? This makes no sense')).toBe('confused');
        expect(detectEmotion('Unclear what happened')).toBe('confused');
        expect(detectEmotion('Puzzled by this behavior')).toBe('confused');
        expect(detectEmotion("Huh? I don't understand")).toBe('confused');
      });

      // Hopeful keywords
      it('should detect hopeful emotion', () => {
        expect(detectEmotion('Hopefully this works')).toBe('hopeful');
        expect(detectEmotion('Looking forward to the results')).toBe('hopeful');
        expect(detectEmotion('Optimistic about the outcome')).toBe('hopeful');
      });

      // Fearful keywords
      it('should detect fearful emotion', () => {
        expect(detectEmotion('Scared this might break')).toBe('fearful');
        expect(detectEmotion('Afraid of the consequences')).toBe('fearful');
        expect(detectEmotion('Terrified of what might happen')).toBe('fearful');
      });

      // Melancholic keywords
      it('should detect melancholic emotion', () => {
        expect(detectEmotion('Feeling sad about this')).toBe('melancholic');
        expect(detectEmotion('Feeling gloomy about this')).toBe('melancholic');
        expect(detectEmotion('This is depressed')).toBe('melancholic');
      });

      // Curious keywords
      it('should detect curious emotion', () => {
        expect(detectEmotion('I wonder about this fascinating thing')).toBe('curious');
        expect(detectEmotion('Interesting behavior')).toBe('curious');
        expect(detectEmotion('Curious about the outcome')).toBe('curious');
        expect(detectEmotion('Let me explore this fascinating topic')).toBe('curious');
      });

      // Calm keywords
      it('should detect calm emotion', () => {
        expect(detectEmotion('Everything is peaceful')).toBe('calm');
        expect(detectEmotion('Relaxed and peaceful')).toBe('calm');
        expect(detectEmotion('Very calm and serene')).toBe('calm');
      });
    });

    describe('edge cases', () => {
      it('should return neutral for empty text', () => {
        expect(detectEmotion('')).toBe('neutral');
      });

      it('should return neutral for text with no emotion keywords', () => {
        expect(detectEmotion('The quick brown fox jumps over the lazy dog')).toBe('neutral');
      });

      it('should handle mixed case', () => {
        expect(detectEmotion('GREAT SUCCESS!')).toBe('cheerful');
        expect(detectEmotion('eRrOr OcCuRrEd')).toBe('disappointed');
      });

      it('should prioritize context over keywords', () => {
        expect(detectEmotion('Great job!', { error: true })).toBe('disappointed');
      });
    });
  });

  describe('getEmotionDescription', () => {
    it('should return descriptions for all emotions', () => {
      expect(getEmotionDescription('cheerful')).toBe('happy and enthusiastic');
      expect(getEmotionDescription('neutral')).toBe('calm and professional');
      expect(getEmotionDescription('concerned')).toBe('concerned and thoughtful');
      expect(getEmotionDescription('urgent')).toBe('urgent and attention-grabbing');
      expect(getEmotionDescription('disappointed')).toBe('disappointed but understanding');
      expect(getEmotionDescription('excited')).toBe('very enthusiastic and energetic');
      expect(getEmotionDescription('sarcastic')).toBe('ironic and witty');
      expect(getEmotionDescription('calm')).toBe('peaceful and composed');
      expect(getEmotionDescription('angry')).toBe('frustrated and intense');
      expect(getEmotionDescription('empathetic')).toBe('understanding and compassionate');
      expect(getEmotionDescription('confused')).toBe('puzzled and uncertain');
      expect(getEmotionDescription('hopeful')).toBe('optimistic and positive');
      expect(getEmotionDescription('fearful')).toBe('anxious and worried');
      expect(getEmotionDescription('melancholic')).toBe('sad and reflective');
      expect(getEmotionDescription('curious')).toBe('interested and inquisitive');
    });

    it('should return default description for unknown emotion', () => {
      expect(getEmotionDescription('unknown' as any)).toBe('calm and professional');
    });
  });
});
