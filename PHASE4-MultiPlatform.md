# PHASE 4: Cross-Platform NPM Package Installation for @eh-aye/stts

## Overview

Make `npm install -g @eh-aye/stts` handle all installation steps automatically on all platforms (macOS, Linux, Windows), ensuring the `stts` command works seamlessly without manual intervention.

## Current State Analysis

- **Unix-biased**: All scripts use bash, Unix paths, and commands like `rm -rf`
- **Manual steps required**: Users must run `stts enable claude-code` after npm install
- **Windows partially supported**: Runtime code generates batch wrappers, but build/install scripts are bash-only
- **Uninstall issues**: Manual hook cleanup required before npm uninstall

## Implementation Plan

### 1. **Create Cross-Platform Build Scripts** (LEVER: 8/10)

- **Replace bash scripts with Node.js scripts** in `scripts/` directory
- Create platform-aware scripts:
  - `scripts/build.js` - Replace bash build commands
  - `scripts/clean.js` - Cross-platform file deletion
  - `scripts/test-install.js` - Platform-aware testing
- Update `package.json` scripts to use Node.js instead of bash commands
- Use Node.js built-ins: `fs`, `path`, `child_process` for cross-platform compatibility

### 2. **Add NPM Lifecycle Scripts** (LEVER: 9/10)

- **postinstall script**: Auto-detect and enable hooks for installed tools
  - Create `scripts/postinstall.js`
  - Detect Claude Code, Cursor, etc. on all platforms
  - Silently enable hooks with sensible defaults
  - Handle missing tools gracefully
- **preuninstall script**: Clean up hooks before removal
  - Create `scripts/preuninstall.js`
  - Disable all active hooks
  - Clean temporary files

### 3. **Enhance Platform Detection** (LEVER: 7/10)

- Extend existing platform detection in `src/installer/detector.ts`
- Add Windows-specific paths for tool detection:
  - Claude Code: `%APPDATA%/.claude/settings.json`
  - Support PowerShell and CMD environments
- Improve path normalization using `path.join()` everywhere

### 4. **Create Windows-Compatible Installers** (LEVER: 8/10)

- Enhance `SettingsManager` to handle Windows paths correctly
- Ensure wrapper scripts work in both CMD and PowerShell
- Handle Windows file permissions appropriately
- Test with Windows path separators and spaces in paths

### 5. **Simplify User Experience** (LEVER: 9/10)

- Make `npm install -g @eh-aye/stts` the only required command
- Auto-enable for detected tools with safe defaults
- Provide clear console output during installation
- Add `--skip-hooks` flag for users who want manual control

### 6. **Testing Strategy**

- Create cross-platform test suite
- Test on Windows 10/11, macOS, and Linux
- Verify npm install/uninstall lifecycle
- Test with various shell environments (CMD, PowerShell, bash, zsh)

## File Changes Required

### New Files to Create:

- `scripts/postinstall.js` - Auto-enable hooks after npm install
- `scripts/preuninstall.js` - Clean up before npm uninstall
- `scripts/build.js` - Cross-platform build script
- `scripts/clean.js` - Cross-platform cleanup
- `scripts/utils/platform.js` - Shared platform utilities

### Files to Modify:

- `package.json` - Add postinstall/preuninstall scripts, update existing scripts
- `src/installer/detector.ts` - Enhance Windows tool detection
- `src/installer/settings-manager.ts` - Improve path handling
- `src/defaults.ts` - Add Windows-specific defaults

### Files to Keep for Development:

- Keep existing `.sh` scripts for developer convenience
- Add `.ps1` equivalents for Windows developers

## Benefits

- **Zero manual steps**: Install and go on all platforms
- **Consistent experience**: Same commands work everywhere
- **Backward compatible**: Existing users unaffected
- **Developer friendly**: Keep convenient dev scripts

## Implementation Order

1. Create platform utilities and Node.js build scripts
2. Add npm lifecycle hooks (postinstall/preuninstall)
3. Enhance Windows detection and path handling
4. Update package.json scripts
5. Test on all platforms
6. Update documentation

## LEVER Score

This approach leverages existing code (LEVER score 8/10) while ensuring full cross-platform compatibility.

## Implementation with LEVER Principles

### Platform Utilities Module (LEVER: 9/10)

- **Locate**: Extend existing `src/utils/` directory
- **Extend**: Build on existing path handling in codebase
- Create `src/utils/platform.ts` with:
  - Cross-platform path resolution
  - Tool detection for all OSes
  - Shell command execution wrapper
- No bash scripts - pure TypeScript/Node.js

### NPM Lifecycle Scripts (LEVER: 8/10)

- **Extend**: Use existing detector and settings manager
- Create minimal new files:
  - `scripts/postinstall.js` - Auto-detect and enable
  - `scripts/preuninstall.js` - Clean up hooks
- Reuse existing TypeScript modules via imports

### Enhanced Detection (LEVER: 9/10)

- **Locate**: `src/installer/detector.ts` already exists
- **Extend**: Add Windows-specific detection methods
- **Enhance**: Improve existing `detect()` method
- No new files needed

### Cross-Platform Scripts (LEVER: 8/10)

- **Reduce**: Replace multiple bash scripts with single Node.js scripts
- Convert only essential scripts:
  - `scripts/build.js` - Use TypeScript compiler API
  - `scripts/clean.js` - Use fs.rmSync
- Keep dev scripts as-is (`.sh` files remain)

### Settings Manager Updates (LEVER: 10/10)

- **Locate**: `src/installer/settings-manager.ts`
- **Enhance**: Improve existing path handling
- **Validate**: Ensure backward compatibility
- Zero new files

## Key LEVER Decisions

- **NO** bash scripts embedded in TypeScript
- **NO** new directories or major restructuring
- **YES** to extending existing modules
- **YES** to reusing existing patterns
- **YES** to minimal new files (only where necessary)

Total LEVER Score: 8.8/10 - Excellent reuse of existing code
