# Audio Command

Control STTS (Smart Text-to-Speech) for Claude.

## Quick Usage

- `/audio enable` - Turn on text-to-speech announcements
- `/audio disable` - Turn off text-to-speech announcements
- `/audio status` - Check if audio is currently enabled

## Detailed Instructions

### Enable Audio

```bash
stts claude enable
```

Turns on voice announcements for tool usage, notifications, and session events.

### Disable Audio

```bash
stts claude disable
```

Turns off all voice announcements. Restart Claude for changes to take full effect.

### Check Status

```bash
stts claude status
```

Shows whether audio is currently enabled and which hooks are active.

### Test Audio

```bash
stts test
```

Tests the text-to-speech functionality with a sample announcement.
