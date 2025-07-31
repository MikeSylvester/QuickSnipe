const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

console.log(`Creating release for version ${version}...`);

// Read CHANGELOG.md
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');

// Extract release notes for this version
const versionPattern = new RegExp(`## \\[${version}\\][\\s\\S]*?(?=## \\[|$)`);
const match = changelog.match(versionPattern);

let releaseNotes = '';
if (match) {
  // Remove the version header and clean up
  releaseNotes = match[0]
    .replace(`## [${version}]`, '')
    .replace(/^\s*-\s*/, '') // Remove the date line
    .trim();
} else {
  releaseNotes = 'Update available with bug fixes and improvements.';
}

console.log('Release Notes:');
console.log(releaseNotes);

// Create git tag (force overwrite if exists)
console.log('Creating git tag...');
try {
  execSync(`git tag v${version}`, { stdio: 'inherit' });
} catch (error) {
  console.log('Tag already exists, forcing overwrite...');
  execSync(`git tag -f v${version}`, { stdio: 'inherit' });
}

// Push tag to trigger GitHub Actions
console.log('Pushing tag to GitHub...');
execSync(`git push -f origin v${version}`, { stdio: 'inherit' });

console.log(`Release v${version} created successfully!`);
console.log('GitHub Actions will automatically build and publish the release.'); 