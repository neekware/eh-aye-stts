# Release Process

This document describes the release process for maintainers of @eh-aye/stts.

## Overview

Releases are **manually triggered** by maintainers when a batch of changes is ready. This allows us to:

- Bundle multiple PRs into a single release
- Control the timing of releases
- Ensure proper testing before publishing

## How to Create a Release

1. **Review merged PRs**: Check what changes have been merged since the last release
2. **Trigger the release**:
   - Go to Actions → Release workflow
   - Click "Run workflow"
   - Select release type:
     - `auto` - Let semantic-release determine version based on commits
     - `patch` - Force a patch release (1.0.x)
     - `minor` - Force a minor release (1.x.0)
     - `major` - Force a major release (x.0.0)

3. **Monitor the release**: The workflow will:
   - Run all tests
   - Build the package
   - Update version in package.json
   - Generate/update CHANGELOG.md
   - Create a GitHub release
   - Publish to npm
   - Commit changes back to main

## Release Guidelines

- **Patch releases** (1.0.x): Bug fixes, documentation updates
- **Minor releases** (1.x.0): New features, non-breaking changes
- **Major releases** (x.0.0): Breaking changes

## Commit Message Convention

We use conventional commits to automatically determine version bumps:

- `fix:` - Patch release
- `feat:` - Minor release
- `BREAKING CHANGE:` in commit body - Major release
- `chore:`, `docs:`, `test:` - No release

## Alternative: Release Branch

If you prefer, you can also use a release branch:

1. Create a `release` branch from `main`
2. Push to the `release` branch to trigger automatic release
3. This is commented out in the workflow but can be enabled

## Troubleshooting

- **Release fails**: Check Actions logs for errors
- **Version conflict**: Ensure no manual version changes in PRs
- **npm publish fails**: Verify NPM_TOKEN secret is valid
