# LLM Integration Debugging Guide

This directory contains scripts and tools to debug and test the LLM integration with Claude hooks.

## Overview

The LLM integration aims to generate intuitive, conversational messages instead of generic ones. For example:

- Instead of: "Documentation updated! I've added a comprehensive section..."
- We want: "Hey, I added act and example to the contribution docs"

## Scripts

### 1. `debug-llm.ts`

A comprehensive TypeScript debugger that:

- Tests Claude CLI availability
- Simulates various hook scenarios
- Tests prompt generation directly
- Logs all interactions for analysis
- Shows context extraction details

**Usage:**

```bash
DEBUG=1 tsx scripts/debug-llm.ts
```

### 2. `simulate-hook-events.ts`

Simulates real hook events to test the entire pipeline:

- Creates realistic event data
- Executes actual hook scripts
- Shows stdout/stderr output
- Tests different scenarios (success, failure, long-running, etc.)

**Usage:**

```bash
DEBUG=1 tsx scripts/simulate-hook-events.ts
```

### 3. `test-llm-integration.sh`

A comprehensive test runner that:

- Checks prerequisites (tsx, Claude CLI)
- Tests Claude CLI directly
- Runs all debug scripts
- Displays log files
- Provides a complete test report

**Usage:**

```bash
./scripts/test-llm-integration.sh
```

## Key Areas to Debug

### 1. Context Extraction

The `ContextBuilder` extracts relevant information from hook events:

- Event type, tool used, command executed
- Exit codes, duration, results
- Session statistics for stop events

**Location:** `src/plugins/claude/hooks/context-builder.ts`

### 2. Prompt Generation

The `LLMFeedbackGenerator.buildPrompt()` creates prompts for Claude:

- Event-specific guidance
- Style and word limits
- Special cases (long commands, documentation updates)

**Location:** `src/services/llm-feedback.ts`

### 3. Claude CLI Integration

The `callClaude()` method handles:

- Spawning the Claude CLI process
- Timeout handling (5 seconds)
- Output cleaning and formatting

**Debug output includes:**

- Generated prompts
- Claude CLI commands
- Raw and cleaned responses
- Error messages

### 4. Message Caching

Messages are cached to avoid repeated LLM calls:

- Cache key generation from context
- TTL-based expiration
- Debug logs show cache hits/misses

**Location:** `src/services/message-cache.ts`

## Debug Logs

All debug information is logged to:

```
~/.stts/logs/<project-name>/
├── llm-debug.json      # LLM-specific debug info
├── hook-debug.json     # Raw hook event data
├── post-tool-use.json  # Hook execution logs
└── ...
```

## Common Issues and Solutions

### 1. Generic Messages

**Issue:** Getting fallback messages instead of LLM-generated ones
**Check:**

- Is Claude CLI installed and accessible?
- Is `llmEnabled` config set to true?
- Are there timeout issues (check debug logs)?

### 2. Verbose Messages

**Issue:** Claude returns long, detailed messages
**Solution:** Adjust the prompt in `buildPrompt()`:

- Add more specific examples
- Emphasize brevity in rules
- Add event-specific guidance

### 3. Context Missing

**Issue:** Messages don't reflect the actual action
**Check:**

- Is context being extracted correctly?
- Check `ContextBuilder.getContextSummary()` output
- Verify event data structure

### 4. Performance Issues

**Issue:** Slow response times
**Solutions:**

- Check Claude CLI timeout (currently 5s)
- Enable message caching
- Use fallback messages for non-critical events

## Testing Workflow

1. **Enable Debug Mode:**

   ```bash
   export DEBUG=1
   ```

2. **Clear Previous Logs:**

   ```bash
   rm -rf ~/.stts/logs/$(basename $(pwd))/*.json
   ```

3. **Run Debug Script:**

   ```bash
   tsx scripts/debug-llm.ts
   ```

4. **Simulate Real Events:**

   ```bash
   tsx scripts/simulate-hook-events.ts
   ```

5. **Check Logs:**

   ```bash
   cat ~/.stts/logs/$(basename $(pwd))/llm-debug.json | jq '.'
   ```

6. **Test with Claude:**
   Actually use Claude to trigger real events and observe the messages.

## Improving Message Quality

To get better, more intuitive messages:

1. **Update Prompts:** Edit `buildPrompt()` in `llm-feedback.ts`
2. **Add Examples:** Include specific examples in the prompt
3. **Event-Specific Rules:** Add custom guidance for different event types
4. **Test Iterations:** Use the debug scripts to test prompt changes quickly

Remember: The goal is natural, conversational feedback that feels like a helpful assistant, not a verbose technical report.
