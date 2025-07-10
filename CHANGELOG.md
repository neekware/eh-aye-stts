# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-08

### Added
- Initial release of STTS (Smart Text-to-Speech)
- Multi-provider TTS support (Say, ElevenLabs, OpenAI)
- Claude Code integration with automatic hook installation
- Security features to block dangerous commands
- CLI interface with enable/disable/test/status commands
- Support for PreToolUse, PostToolUse, Notification, Stop, and SubagentStop hooks
- Configurable voice gender and provider priority
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