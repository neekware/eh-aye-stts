# STTS Wrapper Script Templates

This directory contains cross-platform wrapper script templates that replace the dynamic script generation system.

## Files

- `stts-wrapper.sh` - Unix/Linux/macOS wrapper script
- `stts-wrapper.bat` - Windows batch wrapper script

## Usage

These templates are used by the `SettingsManager` to create wrapper scripts that:

1. Check if the `stts` command is available
2. Execute `stts` with all passed arguments if available
3. Fall back to configurable behavior if not available

## Fallback Modes

Scripts support different fallback modes via the `STTS_FALLBACK_MODE` environment variable:

- `user` (default): Show warning and exit with error code 1
- `workspace`: Silently exit with code 0 (useful for CI/workspace environments)

## Cross-Platform Compatibility

The templates handle platform differences:

- Unix scripts use `command -v` to check for command availability
- Windows scripts use `where` command to check for command availability
- Both handle argument passing correctly (`"$@"` vs `%*`)
- Both set appropriate exit codes for different scenarios

## Migration from Dynamic Templates

This replaces the old system that used string templates with `{{PROVIDER}}` and `{{FALLBACK_BEHAVIOR}}` placeholders, providing better maintainability and cross-platform reliability.
