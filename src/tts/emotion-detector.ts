import { Emotion } from './types.js';

export function detectEmotion(
  text: string,
  context?: { success?: boolean; error?: boolean; exitCode?: number }
): Emotion {
  const lowerText = text.toLowerCase();

  // Check context first
  if (context) {
    if (context.error || (context.exitCode !== undefined && context.exitCode !== 0)) {
      return 'disappointed';
    }
    if (context.success || context.exitCode === 0) {
      return 'cheerful';
    }
  }

  // Check for urgent keywords
  const urgentKeywords = [
    'urgent',
    'attention',
    'blocked',
    'waiting',
    'failed',
    'error',
    'critical',
    'alert',
    'warning',
  ];
  if (urgentKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'urgent';
  }

  // Check for success/cheerful keywords
  const cheerfulKeywords = [
    'success',
    'completed',
    'done',
    'finished',
    'ready',
    'great',
    'excellent',
    'perfect',
  ];
  if (cheerfulKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'cheerful';
  }

  // Check for concern keywords
  const concernedKeywords = [
    'concern',
    'issue',
    'problem',
    'check',
    'review',
    'look',
    'investigate',
  ];
  if (concernedKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'concerned';
  }

  // Check for disappointment keywords
  const disappointedKeywords = [
    'failed',
    'error',
    'sorry',
    'unable',
    'cannot',
    'could not',
    'mistake',
    'wrong',
  ];
  if (disappointedKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'disappointed';
  }

  // Default to neutral
  return 'neutral';
}

export function getEmotionDescription(emotion: Emotion): string {
  switch (emotion) {
    case 'cheerful':
      return 'happy and enthusiastic';
    case 'urgent':
      return 'urgent and attention-grabbing';
    case 'concerned':
      return 'concerned and empathetic';
    case 'disappointed':
      return 'disappointed but understanding';
    case 'neutral':
    default:
      return 'calm and professional';
  }
}
