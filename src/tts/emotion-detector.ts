import { Emotion } from './types';

export { Emotion };

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
    'critical',
    'alert',
    'warning',
    'immediately',
    'asap',
  ];
  if (urgentKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'urgent';
  }

  // Check for angry keywords
  const angryKeywords = ['angry', 'furious', 'rage', 'mad', 'frustrated', 'annoyed', 'irritated'];
  if (angryKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'angry';
  }

  // Check for excited keywords
  const excitedKeywords = [
    'excited',
    'amazing',
    'awesome',
    'fantastic',
    'incredible',
    'wow',
    'wonderful',
    'thrilled',
  ];
  if (excitedKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'excited';
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
    'happy',
    'good',
  ];
  if (cheerfulKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'cheerful';
  }

  // Check for sarcastic context (harder to detect, look for specific patterns)
  const sarcasticPatterns = [
    'oh great',
    'how wonderful',
    'just perfect',
    'lovely',
    'brilliant',
    'genius',
  ];
  if (sarcasticPatterns.some((pattern) => lowerText.includes(pattern))) {
    return 'sarcastic';
  }

  // Check for fearful keywords
  const fearfulKeywords = [
    'afraid',
    'scared',
    'fear',
    'terrified',
    'frightened',
    'anxious',
    'worried',
    'panic',
  ];
  if (fearfulKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'fearful';
  }

  // Check for confused keywords
  const confusedKeywords = [
    'confused',
    'unclear',
    'puzzled',
    'baffled',
    'perplexed',
    "don't understand",
    'what',
    'huh',
  ];
  if (confusedKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'confused';
  }

  // Check for hopeful keywords
  const hopefulKeywords = [
    'hope',
    'hopefully',
    'optimistic',
    'looking forward',
    'expect',
    'anticipate',
    'wish',
    'maybe',
  ];
  if (hopefulKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'hopeful';
  }

  // Check for melancholic keywords
  const melancholicKeywords = [
    'sad',
    'melancholy',
    'blue',
    'down',
    'depressed',
    'gloomy',
    'sorrowful',
    'lonely',
  ];
  if (melancholicKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'melancholic';
  }

  // Check for curious keywords
  const curiousKeywords = [
    'curious',
    'wonder',
    'interesting',
    'intriguing',
    'fascinating',
    'explore',
    'discover',
    'learn',
  ];
  if (curiousKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'curious';
  }

  // Check for empathetic keywords
  const empatheticKeywords = [
    'understand',
    'feel',
    'empathy',
    'sympathy',
    'compassion',
    'care',
    'support',
    'help',
  ];
  if (empatheticKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'empathetic';
  }

  // Check for calm keywords
  const calmKeywords = ['calm', 'peaceful', 'relax', 'serene', 'tranquil', 'steady', 'composed'];
  if (calmKeywords.some((keyword) => lowerText.includes(keyword))) {
    return 'calm';
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
    'disappointed',
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
      return 'concerned and thoughtful';
    case 'disappointed':
      return 'disappointed but understanding';
    case 'excited':
      return 'very enthusiastic and energetic';
    case 'sarcastic':
      return 'ironic and witty';
    case 'calm':
      return 'peaceful and composed';
    case 'angry':
      return 'frustrated and intense';
    case 'empathetic':
      return 'understanding and compassionate';
    case 'confused':
      return 'puzzled and uncertain';
    case 'hopeful':
      return 'optimistic and positive';
    case 'fearful':
      return 'anxious and worried';
    case 'melancholic':
      return 'sad and reflective';
    case 'curious':
      return 'interested and inquisitive';
    case 'neutral':
    default:
      return 'calm and professional';
  }
}
