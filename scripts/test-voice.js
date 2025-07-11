#!/usr/bin/env node

import { loadTTS } from '../dist/src/tts/loader.js';

// Simple script to test TTS without building
async function testVoice() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  let message = 'Hello! This is a test of the text to speech system.';

  // Get message (first non-flag argument)
  const messageArg = args.find((arg) => !arg.startsWith('--'));
  if (messageArg) {
    message = messageArg;
  }

  console.log(`🔊 Testing TTS with message: "${message}"`);

  try {
    const tts = loadTTS();

    const success = await tts.speak(message);

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
