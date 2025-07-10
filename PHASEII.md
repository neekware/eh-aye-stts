# Phase II: Wrapper Script System Implementation

## Overview

Implementing a wrapper script system to handle Claude Code's side effect of wiping settings changes. The system will support both global (`~/.stts/hooks/`) and local (`.claude/hooks/`) wrapper script installation.

## Current Status

✅ **Phase I Complete**: Dynamic backup system implemented

- Provider-agnostic SettingsManager constructor
- Dynamic backup directories: `~/.stts/backups/{provider}/`
- New file naming: `settings.{timestamp}.json`
- All tests and linting fixed

## Phase II Requirements

### Core Features ✅ COMPLETED

- [x] Add `--global` and `--local` flags to enable/disable commands
- [x] Generate wrapper scripts for both installation modes
- [x] Global hooks directory: `~/.stts/hooks/` with warning if stts missing
- [x] Local hooks directory: `.claude/hooks/` with silent fallback if stts missing
- [x] Cross-platform script generation (bash for Unix, batch for Windows)

### Implementation Plan

#### 1. Constants and Configuration ✅

- [x] Add `HOOKS_DIR` constant to defaults.ts for global hooks
- [x] Add wrapper script templates for different platforms

#### 2. SettingsManager Extensions ✅

- [x] Add `generateWrapperScripts()` method for script creation
- [x] Add `installGlobalWrappers()` and `installLocalWrappers()` methods
- [x] Handle cross-platform script generation (bash/batch)

#### 3. CLI Command Updates ✅

- [x] Add `--global`/`--local` flags to enable command
- [x] Add `--global`/`--local` flags to disable command
- [x] Update command logic to call appropriate wrapper installation methods

#### 4. Script Templates ✅

- [x] Create bash wrapper template with stts availability check
- [x] Create batch wrapper template for Windows
- [x] Different fallback behaviors: warn for global, silent for local

#### 5. Quality Assurance ✅

- [x] Run comprehensive linting and fix all issues
- [x] Run formatting and fix all formatting issues
- [x] Run tests and fix any failures
- [x] Add new tests for wrapper functionality

## LEVER Principles Compliance

- **Locate**: Extending existing SettingsManager class
- **Extend**: Adding wrapper methods to existing class structure
- **Validate**: Maintaining backward compatibility
- **Enhance**: Cross-platform script generation
- **Reduce**: Minimal new files, leveraging existing architecture

## Technical Details

### Global vs Local Behavior

```bash
# Global installation (warns if stts missing)
stts enable claude-code --global
# Creates: ~/.stts/hooks/stts with warning fallback

# Local installation (silent if stts missing)
stts enable claude-code --local
# Creates: .claude/hooks/stts with silent fallback
```

### Wrapper Script Structure

- Check if `stts` command is available
- Global: Print warning and exit if stts missing
- Local: Silently pass through if stts missing
- Forward all arguments to actual stts command

### Directory Structure

```
~/.stts/hooks/stts              # Global wrapper
project/.claude/hooks/stts      # Local wrapper
```

## ✅ PHASE II COMPLETE

### Summary of Accomplishments

- **Wrapper Script System**: Full implementation with global and local modes
- **Cross-Platform Support**: Both bash (Unix) and batch (Windows) script generation
- **Intelligent Fallbacks**: Warning for global missing stts, silent for local
- **Quality Assurance**: All linting, formatting, and tests passing
- **LEVER Compliance**: Extended existing architecture without unnecessary complexity

### Usage Examples

```bash
# Install global wrapper (warns if stts missing)
stts enable claude-code --global

# Install local wrapper (silent if stts missing)
stts enable claude-code --local

# Remove wrappers
stts disable claude-code --global
stts disable claude-code --local
```

### Implementation Details

- Added `HOOKS_DIR` constant and wrapper script templates
- Extended SettingsManager with 4 new methods for wrapper management
- Updated CLI commands with mutually exclusive `--global`/`--local` flags
- Added comprehensive test coverage for wrapper script generation
- All 127 tests passing, linting clean, formatting applied
