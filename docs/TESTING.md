# Testing Claude TTS

## Quick Tests During Installation

### 1. Basic Installation Test
```bash
# After npm install, test if everything is working
npm run test:quick
```

### 2. List Available Providers
```bash
npm run test:providers
# or
npx claude-tts list
```

### 3. Run Full Installation Test Suite
```bash
npm run test:install
```

## Manual Testing Commands

### Test Different Providers
```bash
# Test local Say provider (default)
npx claude-tts speak "Testing Say provider"

# Test with specific provider
npx claude-tts speak "Testing ElevenLabs" --provider elevenlabs
npx claude-tts speak "Testing OpenAI" --provider openai
```

### Test Voice Options
```bash
# Test male voice
npx claude-tts speak "Testing male voice" --gender male

# Test female voice  
npx claude-tts speak "Testing female voice" --gender female
```

### Test Hook Functionality
```bash
# Test as notification hook
echo '{"message": "Test notification"}' | npx claude-tts hook

# Test with custom options
echo '{"message": "Test"}' | npx claude-tts hook --gender male --priority say,openai
```

## Programmatic Testing

Create a test file `test.js`:

```javascript
import { loadTTS } from '@eh-aye/stts';

async function test() {
  const tts = loadTTS();
  
  // List providers
  const providers = await tts.listAvailable();
  console.log('Available providers:', providers);
  
  // Test speaking
  const success = await tts.speak('Hello from programmatic test');
  console.log('Speech successful:', success);
  
  // Test specific provider
  await tts.speak('Testing OpenAI', 'openai');
}

test();
```

## Debugging Installation Issues

### 1. Check Build Output
```bash
# Verify TypeScript compiled successfully
ls -la dist/
```

### 2. Check Claude Integration
```bash
# Verify hook was installed
cat ~/.claude/settings.json | grep "claude-tts"
```

### 3. Test Without Building
```bash
# Run TypeScript directly with tsx
npx tsx bin/cli.ts speak "Test"
```

### 4. Enable Debug Logging
```bash
# Set DEBUG environment variable
DEBUG=* npx claude-tts speak "Debug test"
```

## Common Issues and Solutions

### "No providers available"
- Check that `say` package is installed
- On Linux, install `espeak`: `sudo apt-get install espeak`
- On macOS, check System Preferences → Security & Privacy → Speech

### "Cannot find module"
- Run `npm run build` first
- Check that `dist/` directory exists

### API Provider Not Working
- Verify API keys in `.env` file
- Check API key has sufficient credits
- Test API connectivity separately

### Audio Not Playing
- Check system volume
- Verify audio output device
- Test with system TTS first: `say "test"` (macOS) or `espeak "test"` (Linux)