import { speak, speakWithEmotion, getAvailableProviders, EMOTIONS } from '../src/audio';

async function basicExamples() {
  console.log('STTS Basic Usage Examples\n');

  // Example 1: Simple speech
  console.log('1. Simple speech:');
  await speak('Hello, world!');

  // Example 2: Speech with emotion
  console.log('\n2. Speech with specific emotion:');
  await speak('Great job! Task completed successfully!', { emotion: 'cheerful' });

  // Example 3: Auto-detect emotion
  console.log('\n3. Auto-detect emotion from text:');
  await speak('Oh no! Something went wrong!', { autoDetectEmotion: true });

  // Example 4: Use specific provider
  console.log('\n4. Use specific TTS provider:');
  await speak('Using ElevenLabs voice', { provider: 'elevenlabs', emotion: 'calm' });

  // Example 5: Context-based emotion
  console.log('\n5. Context-based emotion detection:');
  await speakWithEmotion('Process completed', { success: true });
  await speakWithEmotion('Process failed', { error: true });

  // Example 6: List available providers
  console.log('\n6. Available TTS providers:');
  const providers = await getAvailableProviders();
  console.log('Providers:', providers);

  // Example 7: All available emotions
  console.log('\n7. Available emotions:');
  console.log(EMOTIONS);
}

// Run examples
basicExamples().catch(console.error);
