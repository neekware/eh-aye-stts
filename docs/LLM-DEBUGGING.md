# LLM Debugging Guide

This guide helps you debug and monitor the LLM integration in STTS.

## Testing LLM Functionality

### Run Test Scenarios

Test the LLM with predefined scenarios:

```bash
# Run all test scenarios
stts llm test

# Test with debug output
DEBUG=1 stts llm test

# Test specific prompt
stts llm test -p "Generate a friendly message about completing a build"

# Test with custom context
stts llm test -c '{"eventType":"post-tool-use","tool":"build","exitCode":0}'

# Test with different style
stts llm test -s professional
```

### Example Test Scenarios

The `stts llm test` command runs these scenarios:

1. **Successful build** - Long running build that completes
2. **Failed test** - Test command that fails
3. **Long install** - Package installation taking 2 minutes
4. **Documentation update** - File editing for documentation
5. **Session end** - Work session completion with mixed results

## Cache Monitoring

The LLM caches responses to avoid redundant API calls. Each cache entry stores:

- The full prompt sent to Claude
- The response received
- Context information
- Timestamp

### View Cache Contents

```bash
# Show cache statistics and recent entries
stts llm cache show

# Export all cache entries to JSON
stts llm cache export
stts llm cache export -o my-cache.json
```

### Real-time Cache Monitoring

Monitor cache activity as it happens:

```bash
# Watch cache in real-time (like tail -f)
stts llm cache tail

# Show last 10 entries then watch
stts llm cache tail -n 10
```

Example output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2025-01-10 17:23:45] CACHE ADD
Key: post-tool-use-build-0
Context: Build succeeded (45s)
Prompt: Generate a 10 word or less casual conversational feedback...
Response: "Nice the build worked lets keep the momentum going"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[2025-01-10 17:24:12] CACHE HIT
Key: post-tool-use-build-0
Reused cached response
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Press `Ctrl+C` to exit tail mode.

### Clear Cache

```bash
# Clear all cached responses
stts llm cache clear
```

## Debug Output

Enable detailed debug logging to see:

- Context extraction from hook events
- Prompt generation
- Claude CLI invocation
- Response processing
- Cache operations

```bash
# Enable debug mode for any command
DEBUG=1 stts llm test
DEBUG=1 stts test  # When testing actual hooks
```

Debug output includes:

- Full context objects
- Generated prompts
- Claude CLI commands
- Raw and cleaned responses
- Cache keys and operations

## Troubleshooting

### Claude CLI Not Found

If you see "Claude CLI not available" errors:

```bash
# Check if Claude CLI is installed
claude --version

# If not installed, install Claude Code
# The CLI comes bundled with Claude Code
```

### Timeouts

If Claude CLI times out:

- Check your internet connection
- Try a simpler prompt with `stts llm test -p "hello"`
- The default timeout is 30 seconds

### Cache Issues

If responses seem stale:

- Check cache contents: `stts llm cache show`
- Clear cache if needed: `stts llm cache clear`
- Cache TTL is configurable via `stts config set llmCacheTTL 300`

### No LLM Responses

If you're getting fallback messages instead of LLM responses:

1. Check if LLM is enabled: `stts llm status`
2. Enable if needed: `stts llm enable`
3. Check Claude CLI availability
4. Review debug logs with `DEBUG=1`

## Cache Management

The cache automatically manages its size:

- Maximum 500 entries
- When full, removes oldest 100 entries
- Uses LRU (Least Recently Used) strategy
- Persists across sessions in memory

Cache keys are generated from:

- Event type (e.g., "post-tool-use")
- Tool name (e.g., "build", "test")
- Exit code (0 for success, other for failure)
- Quick commands (duration < 3 seconds) get a different key

## Performance Tips

1. **Cache is your friend** - Let it work to reduce API calls
2. **Adjust cache TTL** - Default is 5 minutes, adjust based on needs
3. **Monitor hit rate** - Use `stts llm cache show` to see effectiveness
4. **Clear sparingly** - Only clear cache when testing prompt changes

## Integration with Claude Code

When Claude Code triggers hooks, the flow is:

1. Hook receives event data → 2. Context extracted → 3. Check cache → 4. Generate prompt → 5. Call Claude CLI → 6. Cache response → 7. Play audio

You can monitor this entire flow with:

```bash
# Terminal 1: Watch cache
stts llm cache tail

# Terminal 2: Watch debug logs
tail -f ~/.stts/logs/*/hook-debug.json | jq .

# Terminal 3: Use Claude Code normally
```
