# STTS Hooks Architecture (Simplified)

## Overview

STTS now uses a **dead simple** architecture where Claude directly calls Python scripts that handle everything - logging, TTS announcements, and transcript processing.

## Architecture

```
Claude → Python Hook Script → STTS CLI → TTS Engine
         (reads stdin)        (say cmd)   (audio out)
```

## Hook Scripts

All hooks are simple Python scripts located in `.claude/hooks/`:

- `pre_tool_use.py` - Announces tool usage before execution
- `post_tool_use.py` - Announces failures or long-running commands
- `notification.py` - Announces important notifications
- `stop.py` - Announces session end and processes transcript
- `subagent_stop.py` - Announces subagent completion

## How It Works

1. **Claude triggers hook** - Executes Python script directly
2. **Python script reads JSON from stdin** - Gets event data including session_id, transcript_path
3. **Script logs data** - Saves to `~/.stts/logs/` for debugging
4. **Script calls STTS** - Uses `stts say` command for TTS
5. **Script processes transcript** - On Stop events, converts .jsonl to chat.json

## Event Data Structure

Each hook receives complete event data from Claude:

```json
{
  "tool": "Bash",
  "args": { "command": "ls -la" },
  "session_id": "uuid",
  "transcript_path": "/path/to/transcript.jsonl",
  "hook_event_name": "PreToolUse"
}
```

## Installation

```bash
# Enable hooks
stts claude enable

# Disable hooks
stts claude disable

# Check status
stts claude status
```

## Benefits

- **Simple** - No TypeScript middleware, no wrappers, no complexity
- **Direct** - Claude calls Python directly, no layers in between
- **Debuggable** - All events logged to `~/.stts/logs/`
- **Reliable** - Fewer moving parts = fewer things to break
- **Flexible** - Easy to modify Python scripts for custom behavior

## Debugging

Check logs to see what data Claude is sending:

```bash
cat ~/.stts/logs/pre_tool_use.json
cat ~/.stts/logs/stop.json
cat ~/.stts/logs/chat.json  # Full conversation transcript
```
