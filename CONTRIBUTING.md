# Contributing to STTS

Thank you for your interest in contributing to STTS! We welcome contributions from the community.

## Our Vision

The ultimate dream is to work with pioneers building meaningful technology that matters, for today, for tomorrow, and for the betterment of humanity. With the belief that AI should be developed responsibly, scalably, and intentionally, and getting ready to build it, hands-on, with the best.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Your environment (OS, Node.js version, etc.)
- Any relevant error messages or logs

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- A clear and descriptive title
- A detailed description of the proposed functionality
- Any possible drawbacks or considerations
- Examples of how the feature would be used

### Pull Requests

1. Fork the repository and create your branch from `main`
2. If you've added code, add tests that cover your changes
3. Ensure the test suite passes (`npm test`)
4. Make sure your code follows the existing style
5. Update documentation as needed
6. Write a clear commit message

## Development Setup

1. Clone your fork:

   ```bash
   git clone https://github.com/your-username/stts.git
   cd stts
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run in development mode:

   ```bash
   npm run dev -- [command]
   ```

4. Run tests:

   ```bash
   npm test
   ```

5. Test GitHub Actions locally (requires Docker):

   ```bash
   # Install act if not already installed
   brew install act  # macOS with Homebrew
   # or see https://github.com/nektos/act for other platforms

   # Run all workflows
   act push

   # Run specific job
   act push -j test

   # Run with specific Node version
   act push -j test --matrix node-version:20.x

   # For Apple M-series Macs, use this flag
   act push --container-architecture linux/amd64
   ```

   The project has three GitHub Actions workflows:
   - **CI workflow** (`.github/workflows/ci.yml`) - Runs linting, tests, and builds
   - **CodeQL** (`.github/workflows/codeql.yml`) - Security analysis
   - **Release** (`.github/workflows/release.yml`) - Automated releases

   Note: When running locally, the coverage upload step will fail (expected) as it requires GitHub authentication.

## Coding Standards

- Use TypeScript for all new code
- Follow the existing code style
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Write descriptive variable and function names
- Avoid abbreviations where possible

## Testing

- Write tests for new features
- Ensure existing tests pass
- Aim for good test coverage
- Test edge cases and error conditions

## Documentation

- Update README.md if you change functionality
- Add JSDoc comments to new functions
- Update technical docs if you change architecture
- Include examples for new features

## Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

## Publishing (Maintainers Only)

1. Update version in package.json
2. Update CHANGELOG.md
3. Run `npm test` to ensure tests pass
4. Run `npm run build` to build the package
5. Run `npm publish` to publish to npm
6. Create a GitHub release with the changelog

## Questions?

Feel free to open an issue for any questions about contributing!
