import { createAudioService } from '../src/audio';
import { TTSConfig } from '../src/tts/types';
import { detectEmotion } from '../src/tts/emotion-detector';

async function customServiceExample() {
  console.log('Custom Audio Service Example\n');

  // Create a custom audio service with specific configuration
  const config: TTSConfig = {
    priority: ['openai', 'elevenlabs', 'say'], // Custom provider priority
    voiceType: 'female',
    defaultEmotion: 'calm',
    openaiModel: 'tts-1-hd', // Use high-quality OpenAI model
  };

  const audioService = createAudioService(config);

  // Example 1: Use the custom service
  console.log('1. Speaking with custom configuration:');
  await audioService.speak('This uses a custom audio configuration');

  // Example 2: Process multiple messages with different emotions
  console.log('\n2. Multiple messages with emotions:');
  const messages = [
    { text: 'Starting the deployment process...', emotion: 'neutral' as const },
    { text: 'Deployment successful!', emotion: 'excited' as const },
    { text: 'Warning: High memory usage detected', emotion: 'concerned' as const },
  ];

  for (const msg of messages) {
    await audioService.speak(msg.text, { emotion: msg.emotion });
    // Add a small delay between messages
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Example 3: Dynamic emotion detection
  console.log('\n3. Dynamic emotion detection:');
  const userMessages = [
    'This is amazing! I love how this works!',
    "Hmm, I'm not sure about this...",
    'Oh no! The system crashed!',
    'Everything is working smoothly now.',
  ];

  for (const msg of userMessages) {
    const emotion = detectEmotion(msg);
    console.log(`Message: "${msg}" - Detected emotion: ${emotion}`);
    await audioService.speak(msg, { emotion });
  }
}

customServiceExample().catch(console.error);
