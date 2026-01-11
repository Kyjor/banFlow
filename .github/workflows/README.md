# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated building and publishing of banFlow.

## Workflows

### `build.yml`
- **Triggers**: Push to `main`/`master` branches and pull requests
- **Platforms**: macOS (x64 + arm64), Windows (x64), Linux (x64)
- **Actions**:
  - Runs linting and tests
  - Builds the application for all platforms
  - Creates GitHub releases with all build artifacts

### `pr-check.yml`
- **Triggers**: Pull requests to `main`/`master` branches
- **Actions**: Runs linting, tests, and builds (no publishing)

## Required GitHub Secrets

For code signing and publishing to work properly, set these secrets in your GitHub repository:

### macOS Code Signing & Notarization
- `CSC_LINK`: Base64-encoded PKCS12 certificate (.p12 file)
- `CSC_KEY_PASSWORD`: Password for the PKCS12 certificate
- `CSC_IDENTITY_AUTO_DISCOVERY`: Set to `true` to auto-discover signing identity
- `APPLE_ID`: Apple ID email for notarization
- `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password for Apple ID
- `APPLE_TEAM_ID`: Apple Developer Team ID

### Windows Code Signing (Optional)
- `WIN_CSC_LINK`: Base64-encoded PKCS12 certificate for Windows
- `WIN_CSC_KEY_PASSWORD`: Password for Windows certificate

### Notes
- If no code signing secrets are configured, builds will be unsigned but will still complete successfully
- Code signing is automatically enabled when the appropriate secrets are present
- macOS builds require notarization which needs Apple credentials

## Getting Started

1. **Set up certificates**: Obtain code signing certificates for each platform
2. **Configure secrets**: Add the required secrets to your GitHub repository
3. **Push to main**: Every push to the main branch will trigger a full build and release

## Build Artifacts

The workflow produces the following artifacts:
- macOS: `.dmg` and `.zip` files (both Intel and Apple Silicon)
- Windows: `.exe` installer
- Linux: `.AppImage`, `.deb`, `.rpm`, and `.snap` packages

All artifacts are automatically uploaded to GitHub releases.
