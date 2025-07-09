# STTS Architecture Flow

```mermaid
graph TB
    %% User Entry Points
    User[User Application] --> API[Audio API]
    CLI[CLI Tool] --> API

    %% Core Audio API
    API --> AS[AudioService]
    AS --> ED[Emotion Detector]
    AS --> TL[TTS Loader]

    %% TTS System
    TL --> TP[TTS Providers]
    TP --> Say[Say Provider<br/>Local System Voice]
    TP --> OAI[OpenAI Provider<br/>Neural Voices]
    TP --> EL[ElevenLabs Provider<br/>Premium Synthesis]

    %% Plugin System
    API --> PR[Plugin Registry]
    PR --> BP[Base Plugin]
    BP --> CP[Custom Plugins]
    BP --> CCP[Claude Code Plugin]

    %% Claude Code Integration
    CCP --> Hooks[Hook Handlers]
    Hooks --> PTU[PreToolUse]
    Hooks --> PSTU[PostToolUse]
    Hooks --> Not[Notification]
    Hooks --> Stop[Stop]
    Hooks --> Agent[Agent Events]
    Hooks --> SubAgent[SubAgent Stop]

    %% Event Flow
    CC[Claude Code] -.->|Events| CCP
    CP -.->|Custom Events| PR

    %% Emotion Flow
    ED --> |Emotion Detection| AS
    AS --> |Emotion + Text| TP

    %% Configuration
    Config[Environment Variables<br/>TTSConfig] --> AS
    Config --> TL

    style User fill:#e1f5fe
    style CLI fill:#e1f5fe
    style API fill:#81c784
    style AS fill:#81c784
    style PR fill:#ffb74d
    style CCP fill:#ffb74d
    style CC fill:#f8bbd0
    style Config fill:#b0bec5
```

## Component Descriptions

### Core Components

1. **Audio API** - Main entry point providing `speak()`, `speakWithEmotion()` functions
2. **AudioService** - Manages TTS providers and emotion handling
3. **Emotion Detector** - Analyzes text/context to determine appropriate emotion
4. **TTS Loader** - Loads and manages available TTS providers

### TTS Providers

- **Say Provider** - Local system voice (macOS/Windows/Linux)
- **OpenAI Provider** - High-quality neural voices
- **ElevenLabs Provider** - Premium voice synthesis with advanced emotion control

### Plugin System

1. **Plugin Registry** - Manages plugin lifecycle and event broadcasting
2. **Base Plugin** - Abstract base class for all plugins
3. **Claude Code Plugin** - Handles Claude Code specific events
4. **Custom Plugins** - User-defined plugins for extending functionality

### Event Flow

1. Events flow from external sources (Claude Code, custom apps) to plugins
2. Plugins process events and trigger appropriate audio responses
3. Audio responses are routed through the emotion system to TTS providers
