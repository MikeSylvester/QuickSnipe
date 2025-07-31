// Update Server Configuration
// This file explains how to set up auto-updates for Quicksnipe

/*
AUTO-UPDATE SETUP INSTRUCTIONS:

1. GitHub Repository Setup:
   - Create a GitHub repository for your app
   - Update the "publish" configuration in package.json:
     - Replace "your-github-username" with your actual GitHub username
     - Replace "QuickSnipe-Newest" with your actual repository name

2. GitHub Token Setup:
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Generate a new token with "repo" permissions
   - Set the token as an environment variable: GITHUB_TOKEN=your_token_here

3. Building and Publishing:
   - Update the version in package.json (e.g., "1.0.1")
   - Run: npm run dist
   - Run: npx electron-builder --publish=always

4. Alternative: Manual Release:
   - Build the app: npm run dist
   - Create a GitHub release with the built installer
   - Upload the .exe file to the release

5. Update Server Options:
   - GitHub Releases (recommended for public repos)
   - S3 (for private deployments)
   - Custom server (for enterprise deployments)

EXAMPLE GITHUB WORKFLOW (.github/workflows/release.yml):

name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - run: npm run dist
      - uses: electron-userland/electron-builder-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish: always

USAGE:
1. Update version in package.json
2. Commit and push changes
3. Create and push a tag: git tag v1.0.1 && git push origin v1.0.1
4. GitHub Actions will automatically build and release
5. Users will receive update notifications in the app

NOTE: For testing, you can use a local update server or GitHub releases.
The auto-updater will check for updates when the app starts and when
users click "Check for Updates".
*/

module.exports = {
  // Configuration for different update providers
  providers: {
    github: {
      provider: 'github',
      owner: 'your-github-username',
      repo: 'QuickSnipe-Newest',
      private: false,
      releaseType: 'release'
    },
    s3: {
      provider: 's3',
      bucket: 'your-update-bucket',
      region: 'us-east-1'
    },
    generic: {
      provider: 'generic',
      url: 'https://your-update-server.com/updates'
    }
  }
}; 