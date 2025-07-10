# STTS Examples

This directory contains examples of how to use the STTS (Speech Text-to-Speech) library.

## Examples

### 1. Basic Usage (`basic-usage.ts`)

Demonstrates the core functionality:

- Simple text-to-speech
- Speech with emotions
- Auto-detect emotions
- Using specific TTS providers
- Context-based emotion detection

```bash
npx tsx examples/basic-usage.ts
```

### 2. Custom Audio Service (`custom-audio-service.ts`)

Shows how to create and configure a custom audio service:

- Custom provider priority
- Voice configuration
- Processing multiple messages
- Dynamic emotion detection

```bash
npx tsx examples/custom-audio-service.ts
```

### 3. Plugin System (`plugin-example.ts`)

Demonstrates the plugin architecture:

- Creating custom plugins
- Using the Claude Code plugin
- Handling custom events
- Plugin registration and configuration

```bash
npx tsx examples/plugin-example.ts
```

### 4. Agent Notifications (`agent-notifications.ts`)

Shows how background agents can send audio notifications:

- Agent task lifecycle (start, progress, complete, error)
- Subagent completion with timing info
- Custom emotions and priority levels
- Silent progress updates

```bash
npx tsx examples/agent-notifications.ts
```

## Running the Examples

1. Make sure you have the required dependencies installed:

```bash
npm install
```

2. Set up your environment variables (if using premium TTS providers):

```bash
export OPENAI_API_KEY="your-key-here"
export ELEVENLABS_API_KEY="your-key-here"
```

3. Run any example:

```bash
npx tsx examples/[example-name].ts
```

## Creating Your Own Examples

Feel free to create your own examples by:

1. Importing the necessary functions directly from their source files:
   - Audio functions: `../src/audio`
   - Plugin system: `../src/plugins/registry`, `../src/plugins/base`
   - Types: `../src/tts/types`
   - Utilities: `../src/tts/emotion-detector`
2. Using the audio API or plugin system
3. Experimenting with different emotions and configurations

## Available Emotions

The library supports 15 different emotions:

- cheerful, neutral, concerned, urgent, disappointed
- excited, sarcastic, calm, angry, empathetic
- confused, hopeful, fearful, melancholic, curious

Each emotion adjusts the voice characteristics differently depending on the TTS provider.
