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

## Optional GitHub Secrets (Code Signing)

For signed releases, set these secrets in your GitHub repository:

### macOS Code Signing & Notarization
- `CSC_LINK`: Base64-encoded PKCS12 certificate (.p12 file)
- `CSC_KEY_PASSWORD`: Password for the PKCS12 certificate
- `CSC_IDENTITY_AUTO_DISCOVERY`: Set to `true` to auto-discover signing identity
- `APPLE_ID`: Apple ID email for notarization
- `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password for Apple ID
- `APPLE_TEAM_ID`: Apple Developer Team ID

### Windows Code Signing
- `WIN_CSC_LINK`: Base64-encoded PKCS12 certificate for Windows
- `WIN_CSC_KEY_PASSWORD`: Password for Windows certificate

## Getting Started

1. **Push to main**: Every push to the main branch will trigger automatic builds and releases
2. **Optional**: Set up code signing secrets for signed releases

## Build Artifacts

The workflow produces the following artifacts:
- macOS: `.dmg` and `.zip` files (both Intel and Apple Silicon)
- Windows: `.exe` installer
- Linux: `.AppImage`, `.deb`, `.rpm`, and `.snap` packages

All artifacts are automatically uploaded to GitHub releases.
