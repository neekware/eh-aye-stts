# Technical Documentation for @eh-aye/stts

## Architecture Overview

STTS (Smart Text-to-Speech) is a modular TypeScript application that integrates with development tools through their hook systems. It consists of:

- **CLI Interface**: Commander-based CLI for user interaction
- **Hook System**: Event-driven hooks for tool integration
- **TTS Providers**: Abstracted TTS implementations with fallback support
- **Settings Management**: Safe JSON manipulation for tool configurations
- **LLM Integration**: Claude API integration for natural language responses

## Hook System Details

### Hook Types and Implementation

#### PreToolUse Hook (`src/plugins/claude-code/hooks/pre-tool-use.ts`)

- **Purpose**: Intercepts tool execution before it happens
- **Security**: Blocks dangerous commands using pattern matching
- **Pattern List**:
  ```javascript
  ('rm -rf', 'dd if=', ':(){:|:&};:', 'mkfs', 'format', '> /dev/sda', 'chmod -R 777 /', 'chown -R');
  ```
- **Exit Codes**:
  - `0`: Allow execution
  - `2`: Block dangerous command

#### PostToolUse Hook (`src/plugins/claude-code/hooks/post-tool-use.ts`)

- **Metrics Collection**: Duration, exit code, tool type
- **Threshold**: Announces completion for tasks >5 seconds
- **Performance Tracking**: JSON logs for analysis

#### Notification Hook (`src/plugins/claude-code/hooks/notification.ts`)

- **Input Format**: `{"message": "text", "type": "optional", "level": "optional"}`
- **Graceful Failures**: TTS errors don't break the hook chain
- **LLM Enhancement**: Optional Claude-powered natural responses for specific event types

### Hook Installation Process

1. **Detection**: Searches for tool-specific settings files
2. **Parsing**: Safely loads existing JSON configuration
3. **Merging**: Adds STTS hooks without removing existing ones
4. **Validation**: Uses regex pattern to identify STTS hooks:
   ```javascript
   /stts\/dist\/hooks\/|@ehaye\/stts|node .*\/stts\/dist\/hooks\//;
   ```

## LLM Integration Architecture

### Claude API Integration

- **Service**: `src/services/llm-service.ts` - Manages Claude API communication
- **Configuration**: Environment variables for API key and model selection
- **Caching**: In-memory transcript cache for context retention
- **Fallback**: Graceful degradation when LLM is unavailable

### Transcript Processing

- **Extractor**: `src/services/transcript-extractor.ts` - Extracts relevant information from Claude Code transcripts
- **Context Management**: Maintains conversation history for better responses
- **Information Extraction**:
  - Task summaries
  - Code changes
  - Error messages
  - Test results

### LLM Features

1. **Natural Language Responses**: Contextual feedback based on conversation history
2. **Transcript Caching**: Stores Claude Code transcripts for context
3. **Smart Extraction**: Identifies key information from transcripts
4. **Flexible Configuration**: Enable/disable per hook type

## Security Implementation

### Command Validation

- Pattern-based dangerous command detection
- Case-insensitive matching
- Subprocess isolation
- Exit code signaling (2 = blocked)

### Safe Settings Management

- Atomic file operations
- Preserves non-STTS configurations
- JSON schema validation
- Backup consideration for future versions

## Logging System

### JSON Log Structure

```json
{
  "type": "event-type",
  "timestamp": "ISO-8601",
  "data": {
    "tool": "tool-name",
    "duration": 1234,
    "exitCode": 0
  }
}
```

### Log Rotation

- Max file size: 10MB
- Max files: 5
- Location: `~/.stts/logs/`

## Development Guide

### Project Structure

```
stts/
├── src/                      # Source code
│   ├── cli/                  # CLI command implementations
│   │   └── index.ts          # Commander setup and commands
│   ├── plugins/              # Plugin system
│   │   ├── base.ts           # Base plugin class
│   │   ├── claude-code/      # Claude Code integration
│   │   │   ├── hooks/        # Claude-specific hook implementations
│   │   │   │   ├── base.ts   # Abstract base class for hooks
│   │   │   │   └── *.ts      # Specific hook implementations
│   │   │   └── claude-code-plugin.ts
│   │   └── registry.ts       # Plugin registry
│   ├── installer/            # Tool detection and settings
│   │   ├── detector.ts       # Tool discovery logic
│   │   └── settings-manager.ts # JSON manipulation
│   ├── services/             # Core services
│   │   ├── llm-service.ts    # Claude API integration
│   │   ├── transcript-cache.ts # In-memory transcript storage
│   │   └── transcript-extractor.ts # Information extraction
│   ├── tts/                  # TTS provider system
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── loader.ts         # Provider management
│   │   └── providers/        # Provider implementations
│   └── __tests__/            # Jest test files
├── docs/                     # Documentation
│   ├── README.md             # Documentation index
│   ├── TECH.md               # Technical documentation (this file)
│   ├── DEVELOPMENT.md        # Development guide
│   └── TESTING.md            # Testing guide
├── dist/                     # Compiled output (git ignored)
├── README.md                 # User guide
├── package.json              # NPM configuration
├── tsconfig.json             # TypeScript configuration
├── jest.config.js            # Jest configuration
└── dev.js                    # Development runner
```

### Adding New Tools

1. Register in `detector.ts`:

```typescript
this.tools.set('tool-name', {
  name: 'Tool Display Name',
  executable: 'tool-command',
  settingsPath: join(homedir(), '.tool', 'settings.json'),
  detected: false,
});
```

2. Implement detection logic if needed
3. Add tool-specific configuration handling

### Adding New Hooks

1. Create hook class extending `BaseHook`:

```typescript
export class NewHook extends BaseHook {
  constructor() {
    super('hook-name');
  }

  async execute(): Promise<void> {
    // Implementation
  }
}
```

2. Add to `settings-manager.ts` hook list
3. Create corresponding test file

### Provider System

#### TTS Provider Details

**Local Audio Provider (`say`)**
The local audio provider uses the `say` npm package which provides cross-platform text-to-speech:

- **macOS**: Uses system `NSSpeechSynthesizer` API
- **Windows**: Uses Windows SAPI (Speech API)
- **Linux**: Uses `espeak` or `festival`

Note: While we refer to this as "Local Audio" in user documentation for clarity, the actual implementation uses the `say` npm package.

#### Adding TTS Providers

1. Extend `BaseTTSProvider`:

```typescript
export class CustomProvider extends BaseTTSProvider {
  readonly name = 'custom';

  async isAvailable(): Promise<boolean> {
    // Check availability
  }

  async speak(text: string): Promise<boolean> {
    // Implement TTS
  }
}
```

2. Register in `loader.ts`
3. Add to priority configuration

## Testing

For comprehensive testing information, see the [Testing Guide](TESTING.md).

### Quick Test Reference

- **Unit Tests**: `npm test` (Jest framework)
- **Manual Hook Testing**: See examples in [TESTING.md](TESTING.md)
- **Integration Testing**: Full workflow in testing guide
- **Debug Mode**: `DEBUG=* stts enable claude-code`

## Building and Publishing

### Build Process

```bash
# Clean build
npm run clean
npm run build

# Verify output
ls -la dist/

# Test built version
node dist/cli/index.js --help
```

### Pre-publish Checklist

1. Update version in `package.json`
2. Run all tests: `npm test`
3. Build package: `npm run build`
4. Test locally: `npm pack && npm install -g *.tgz`
5. Update CHANGELOG.md
6. Tag release: `git tag v1.0.0`

### NPM Publishing

```bash
# Dry run
npm publish --dry-run

# Publish
npm publish --access public
```

## Contributing Guidelines

### Code Style

- TypeScript strict mode
- ESLint configuration provided
- Async/await over callbacks
- Descriptive variable names

### Pull Request Process

1. Fork and create feature branch
2. Add tests for new features
3. Ensure all tests pass
4. Update documentation
5. Submit PR with clear description

### Commit Convention

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Build/tooling changes

## Performance Considerations

- Hook execution timeout: 30 seconds
- TTS provider timeout: 10 seconds
- Log file rotation at 10MB
- Async operations for I/O
- Provider caching for 15 minutes
- LLM response timeout: 5 seconds
- Transcript cache limit: 100 entries
- Cache TTL: 1 hour

## Future Enhancements

- [ ] Additional tool support (VSCode, Cursor, etc.)
- [ ] Plugin system for custom providers
- [ ] Web dashboard for metrics
- [ ] Configuration UI
- [ ] Backup/restore settings
- [ ] Hook templating system
- [x] LLM-powered natural language responses
- [ ] Extended LLM context management
- [ ] Multi-model LLM support
