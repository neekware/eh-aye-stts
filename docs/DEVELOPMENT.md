# Development Guide for @eh-aye/stts

## Quick Start for Development

### 1. **Setup Development Environment**

```bash
# Install dependencies
npm install

# Run in development mode (no build needed!)
npm run dev -- --help
npm run dev -- detect
npm run dev -- test
```

### 2. **Development Scripts**

#### Hot Reload Development (Recommended)

```bash
# Run CLI without building - changes take effect immediately
npm run dev -- [command] [args]

# Examples:
npm run dev -- detect
npm run dev -- enable claude-code
npm run dev -- test -m "Testing development mode"
```

#### Watch Mode Development

```bash
# In terminal 1: Watch and rebuild TypeScript
npm run dev:build

# In terminal 2: Use the built version
node dist/cli/index.js [command]
```

### 3. **Testing**

#### Run Tests

```bash
# Run all tests
npm test

# Watch mode for TDD
npm run test:watch

# Coverage report
npm run test:coverage
```

#### Writing Tests

Tests are in `src/__tests__/` mirroring the source structure:

```
src/
├── installer/
│   └── detector.ts
└── __tests__/
    └── installer/
        └── detector.test.ts
```

### 4. **Safe Installation/Uninstallation**

The STTS hooks are designed to be safe:

- **Install**: Only adds STTS-specific hooks, preserves existing hooks
- **Uninstall**: Only removes STTS hooks, leaves other hooks untouched

Pattern matching for STTS hooks:

```javascript
/stts\/dist\/hooks\/|@ehaye\/stts|node .*\/stts\/dist\/hooks\//;
```

### 5. **Development Workflow**

#### For Rapid Development:

```bash
# 1. Make changes to source files
# 2. Test immediately without building:
npm run dev -- status
npm run dev -- test

# 3. Run tests to ensure nothing broke:
npm test
```

#### For Testing Hook Installation:

```bash
# Enable hooks
npm run dev -- enable claude-code

# Check what was installed
cat ~/.claude/settings.json | jq '.hooks'

# Test hooks work
echo '{"message": "Test notification"}' | node dist/hooks/notification.js

# Disable hooks (only removes STTS hooks)
npm run dev -- disable claude-code
```

### 6. **Project Structure**

```
stts/
├── src/
│   ├── cli/              # CLI commands
│   ├── hooks/            # Hook implementations
│   ├── installer/        # Detection and settings management
│   ├── tts/              # TTS functionality
│   └── __tests__/        # Test files
├── docs/                 # Documentation
│   ├── README.md         # Documentation index
│   ├── TECH.md           # Technical documentation
│   ├── DEVELOPMENT.md    # This file
│   └── TESTING.md        # Testing guide
├── dist/                 # Built files (git ignored)
├── dev.js               # Development runner
├── jest.config.js       # Jest configuration
└── README.md            # User guide
```

### 7. **Adding New Features**

#### Add a New Hook:

1. Create hook in `src/hooks/new-hook.ts`
2. Add to hook types in `src/types.ts`
3. Update `settings-manager.ts` to install it
4. Write tests in `src/__tests__/hooks/new-hook.test.ts`

#### Add a New CLI Command:

1. Add command in `src/cli/index.ts`
2. Implement logic in appropriate module
3. Test with `npm run dev -- new-command`

### 8. **Environment Variables**

#### Configuration Variables:

```bash
# Enable/disable features
export STTS_ENABLE_DANGEROUS_COMMAND_BLOCKING=true
export STTS_AUDIO_ENABLED=false
export STTS_CUSTOM_DANGEROUS_COMMANDS="sudo rm,DROP TABLE"

# API Keys
export STTS_OPENAI_API_KEY="sk-..."
export STTS_ELEVENLABS_API_KEY="..."

# Claude settings path (for testing different configurations)
export STTS_CLAUDE_SETTINGS_PATH="/path/to/test/settings.json"
```

### 9. **Debugging**

#### Enable Debug Logging:

```bash
DEBUG=* npm run dev -- enable claude-code
```

#### Check Hook Execution:

```bash
# Logs are stored in ~/.stts/logs/
ls -la ~/.stts/logs/
tail -f ~/.stts/logs/notification.json
```

### 10. **Before Publishing**

```bash
# Clean and build
npm run clean
npm run build

# Run all tests
npm test

# Test the built package locally
npm pack
npm install -g ehaye-stts-1.0.0.tgz

# Test installed version
stts --version
stts test
```

## Tips

1. **Use `npm run dev`** for all development - no build step needed!
2. **Write tests first** - TDD helps catch issues early
3. **Test hook removal** - Always verify only STTS hooks are removed
4. **Check existing hooks** - Use `jq` to inspect settings.json
5. **Use debug logs** - They're JSON formatted for easy parsing

## Common Issues

### "Command not found" in dev mode

Make sure you're using `npm run dev --` with the double dash before commands.

### Tests failing with import errors

Run tests with: `npm test` (includes ES modules flag)

### Hooks not triggering

1. Check if hooks are installed: `stts status`
2. Verify hook files exist: `ls -la dist/hooks/`
3. Check Claude Code is reading the correct settings file
