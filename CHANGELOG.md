# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- LLM-powered feedback using Claude CLI for dynamic, context-aware messages
- Context extraction from hook events with rich metadata
- Session aggregation and intelligent summaries
- Message caching system to optimize LLM usage
- New CLI commands: `stts config llm` and `stts config set`
- Support for feedback styles: casual, professional, encouraging
- Automatic fallback to static messages when Claude CLI unavailable
- Enhanced hook implementations with LLM integration

## [1.0.0] - 2025-01-08

### Added
- Initial release of STTS (Smart Text-to-Speech)
- System text-to-speech support using built-in OS voice
- Claude Code integration with automatic hook installation
- Security features to block dangerous commands
- CLI interface with enable/disable/test/status commands
- Support for PreToolUse, PostToolUse, Notification, Stop, and SubagentStop hooks
- Environment variable and programmatic configuration
- Safe hook management (only affects STTS hooks)
- Cross-platform audio playback (macOS, Windows, Linux)
- TypeScript implementation with full type safety
- Development mode with hot reloading
- Comprehensive documentation

### Security
- Command filtering to prevent execution of dangerous commands
- Safe settings.json manipulation that preserves existing configurations
- Local-only execution (no external data collection)

[1.0.0]: https://github.com/ehaye/stts/releases/tag/v1.0.0