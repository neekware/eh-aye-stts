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
    AS --> LLM[LLM Service]

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

    %% LLM Integration
    LLM --> TC[Transcript Cache]
    LLM --> TE[Transcript Extractor]
    LLM --> Claude[Claude API]
    TE --> |Extract Info| TC
    Claude --> |Natural Response| LLM
    LLM --> |Enhanced Text| AS

    %% Configuration
    Config[Environment Variables<br/>TTSConfig] --> AS
    Config --> TL

    style User fill:#4fc3f7,stroke:#0288d1,stroke-width:2px,color:#000
    style CLI fill:#4fc3f7,stroke:#0288d1,stroke-width:2px,color:#000
    style API fill:#66bb6a,stroke:#2e7d32,stroke-width:2px,color:#000
    style AS fill:#66bb6a,stroke:#2e7d32,stroke-width:2px,color:#000
    style ED fill:#ab47bc,stroke:#6a1b9a,stroke-width:2px,color:#000
    style TL fill:#ffa726,stroke:#e65100,stroke-width:2px,color:#000
    style TP fill:#ffca28,stroke:#f57c00,stroke-width:2px,color:#000
    style Say fill:#e0e0e0,stroke:#616161,stroke-width:2px,color:#000
    style OAI fill:#e0e0e0,stroke:#616161,stroke-width:2px,color:#000
    style EL fill:#e0e0e0,stroke:#616161,stroke-width:2px,color:#000
    style PR fill:#ff7043,stroke:#d84315,stroke-width:2px,color:#000
    style BP fill:#a1887f,stroke:#4e342e,stroke-width:2px,color:#000
    style CP fill:#90a4ae,stroke:#37474f,stroke-width:2px,color:#000
    style CCP fill:#ff8a65,stroke:#bf360c,stroke-width:2px,color:#000
    style CC fill:#f48fb1,stroke:#ad1457,stroke-width:2px,color:#000
    style Config fill:#78909c,stroke:#263238,stroke-width:2px,color:#000
    style Hooks fill:#ce93d8,stroke:#6a1b9a,stroke-width:2px,color:#000
    style PTU fill:#b39ddb,stroke:#4527a0,stroke-width:2px,color:#000
    style PSTU fill:#b39ddb,stroke:#4527a0,stroke-width:2px,color:#000
    style Not fill:#b39ddb,stroke:#4527a0,stroke-width:2px,color:#000
    style Stop fill:#b39ddb,stroke:#4527a0,stroke-width:2px,color:#000
    style Agent fill:#b39ddb,stroke:#4527a0,stroke-width:2px,color:#000
    style SubAgent fill:#b39ddb,stroke:#4527a0,stroke-width:2px,color:#000
    style LLM fill:#81c784,stroke:#388e3c,stroke-width:2px,color:#000
    style TC fill:#aed581,stroke:#689f38,stroke-width:2px,color:#000
    style TE fill:#aed581,stroke:#689f38,stroke-width:2px,color:#000
    style Claude fill:#4db6ac,stroke:#00796b,stroke-width:2px,color:#000
```

## Component Descriptions

### Core Components

1. **Audio API** - Main entry point providing `speak()`, `speakWithEmotion()` functions
2. **AudioService** - Manages TTS providers, emotion handling, and LLM integration
3. **Emotion Detector** - Analyzes text/context to determine appropriate emotion
4. **TTS Loader** - Loads and manages available TTS providers
5. **LLM Service** - Provides natural language processing and enhanced feedback generation

### TTS Providers

- **Say Provider** - Local system voice (macOS/Windows/Linux)
- **OpenAI Provider** - High-quality neural voices
- **ElevenLabs Provider** - Premium voice synthesis with advanced emotion control

### Plugin System

1. **Plugin Registry** - Manages plugin lifecycle and event broadcasting
2. **Base Plugin** - Abstract base class for all plugins
3. **Claude Code Plugin** - Handles Claude Code specific events
4. **Custom Plugins** - User-defined plugins for extending functionality

### LLM Integration

1. **LLM Service** - Manages Claude API integration for natural language responses
2. **Transcript Cache** - Caches Claude Code transcripts for context
3. **Transcript Extractor** - Extracts relevant information from transcripts
4. **Claude API** - Generates natural, contextual responses

### Event Flow

1. Events flow from external sources (Claude Code, custom apps) to plugins
2. Plugins process events and trigger appropriate audio responses
3. For LLM-enabled events, responses are enhanced through Claude API
4. Audio responses are routed through the emotion system to TTS providers
