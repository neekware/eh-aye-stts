# @eh-aye/stts - (A.I. Enabled Smart Text-to-Speech) Hear Your Code Speak! 🔊

[![npm version](https://badge.fury.io/js/@ehaye%2Fstts.svg)](https://www.npmjs.com/package/@eh-aye/stts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@eh-aye/stts.svg)](https://nodejs.org)

Make Claude Code talk to you! Get audio notifications when tasks complete, tools run, and more.

## What is STTS?

STTS (Smart Text-to-Speech) adds voice notifications to Claude Code. It's like having a coding assistant that actually speaks to you:

- 🎙️ **Hear notifications** - No more missing important messages
- ⏱️ **Task completion alerts** - Know when long-running tasks finish
- 🛡️ **Safety warnings** - Get alerted before dangerous commands run
- 🔧 **Zero configuration** - Works out of the box with your system's voice

## Quick Start (3 Steps!)

### 1. Install STTS
```bash
npm install -g @eh-aye/stts
```

### 2. Enable for Claude Code
```bash
stts enable claude-code
```

### 3. Test it out
```bash
stts test
```

That's it! Claude Code will now speak to you. 🎉

## What You'll Hear

- **"Running bash command"** - When tools execute
- **"Command completed in 10 seconds"** - When long tasks finish  
- **"Warning: Blocked dangerous command"** - When protecting you from accidents
- **"Session completed"** - When you're done working
- Plus any Claude Code notifications!

## Simple Commands

```bash
stts status          # Check if voice is enabled
stts test            # Test the voice
stts disable claude-code  # Turn off voice (if needed)
```

## Customization (Optional)

Want different voices? Create a `.env` file:

```bash
# Use a female voice (default)
TTS_VOICE_GENDER=female

# Or use a male voice
TTS_VOICE_GENDER=male

# Advanced: Use premium voices (requires API keys)
# ELEVENLABS_API_KEY=your_key_here
# OPENAI_API_KEY=your_key_here
```

## Supported Voices

STTS automatically uses the best available voice:

1. **Local Audio** (Default) - Free, works offline
   - Mac: Samantha/Alex (via system TTS)
   - Windows: Zira/David (via SAPI)
   - Linux: espeak voices
   - Powered by the `say` npm package

2. **ElevenLabs** (Premium) - Natural, high-quality voices
3. **OpenAI** (Premium) - Clear, professional voices

## Troubleshooting

### Don't hear anything?
- Check your volume 🔊
- Run `stts test` to verify
- Mac users: Check System Preferences → Security → Speech

### Commands still silent?
- Run `stts status` to verify installation
- Make sure Claude Code is running
- Try `stts enable claude-code` again

### Need help?
- Run `stts --help` for all commands
- Check system audio settings
- Ensure Claude Code is in your PATH

## Privacy & Security

- ✅ Runs locally on your machine
- ✅ No data sent to external servers (unless using cloud TTS)
- ✅ Only speaks notification text
- ✅ Protects you from dangerous commands
- ✅ Open source - check the code yourself!

## Uninstall

```bash
# Remove voice features from Claude Code
stts disable claude-code

# Uninstall STTS completely
npm uninstall -g @eh-aye/stts
```

---

**Love hearing your code?** Star us on [GitHub](https://github.com/ehaye/stts)! ⭐

## Documentation

- 📖 **[User Guide](README.md)** - You are here!
- 🔧 **[Technical Docs](docs/TECH.md)** - Architecture and implementation
- 💻 **[Development Guide](docs/DEVELOPMENT.md)** - Contributing to STTS
- 🧪 **[Testing Guide](docs/TESTING.md)** - Testing and troubleshooting

All technical documentation is in the `docs/` folder.