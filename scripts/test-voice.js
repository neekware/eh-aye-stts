#!/usr/bin/env node

import { loadTTS } from '../dist/src/tts/loader.js';
import { detectEmotion } from '../dist/src/tts/emotion-detector.js';

// Simple script to test TTS without building
async function testVoice() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  let message = 'Hello! This is a test of the text to speech system.';
  let provider = undefined;

  // Check for provider flags
  if (args.includes('--system')) {
    provider = 'system';
  } else if (args.includes('--elevenlabs')) {
    provider = 'elevenlabs';
  } else if (args.includes('--openai')) {
    provider = 'openai';
  }

  // Get message (first non-flag argument)
  const messageArg = args.find((arg) => !arg.startsWith('--'));
  if (messageArg) {
    message = messageArg;
  }

  const emotion = detectEmotion(message);

  console.log(`🔊 Testing TTS with message: "${message}"`);
  if (provider) {
    console.log(`📢 Using provider: ${provider}`);
  } else {
    console.log(`📢 Using default provider priority`);
  }
  console.log(`🎭 Detected emotion: ${emotion || 'neutral'}`);

  try {
    const tts = loadTTS();

    // List available providers
    const available = await tts.listAvailable();
    console.log(`📋 Available providers: ${available.join(', ')}`);

    // If specific provider requested but not available
    if (provider && !available.includes(provider)) {
      console.error(`❌ Provider "${provider}" is not available`);
      console.log(`💡 Try one of: ${available.join(', ')}`);
      process.exit(1);
    }

    const success = await tts.speak(message, provider || emotion, provider ? emotion : undefined);

    if (success) {
      console.log('✅ Audio played successfully!');
    } else {
      console.log('❌ Failed to play audio');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testVoice().catch(console.error);
