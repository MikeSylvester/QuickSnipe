const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the current version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = packageJson.version;

// Get the previous version (you can modify this logic)
const previousVersion = 'v1.0.6'; // This should be dynamic

// Read release notes from RELEASE_NOTES.md
function readReleaseNotes() {
  try {
    const allNotes = fs.readFileSync('RELEASE_NOTES.md', 'utf8');
    
    // Find the section for the current version
    const versionPattern = new RegExp(`## Version ${currentVersion}\\s*\\n([\\s\\S]*?)(?=\\n## Version|$)`, 'i');
    const match = allNotes.match(versionPattern);
    
    if (match) {
      return `## Version ${currentVersion}\n${match[1].trim()}`;
    } else {
      console.warn(`⚠️  No release notes found for version ${currentVersion} in RELEASE_NOTES.md`);
      return `## Version ${currentVersion}\n\n• Release notes not found for this version`;
    }
  } catch (error) {
    console.error('❌ Could not read RELEASE_NOTES.md');
    return `## Version ${currentVersion}\n\n• Release notes file not found`;
  }
}

// Create a release notes file for GitHub
function createReleaseNotesFile() {
  const releaseNotes = readReleaseNotes();
  
  // Write release notes to a file
  fs.writeFileSync('RELEASE_NOTES_CURRENT.md', releaseNotes);
  
  console.log('Release notes read from RELEASE_NOTES.md:');
  console.log(releaseNotes);
  console.log('\nRelease notes saved to RELEASE_NOTES_CURRENT.md');
  console.log('\nAfter building, you can create a GitHub release with these notes using:');
  console.log(`gh release create v${currentVersion} --notes-file RELEASE_NOTES_CURRENT.md`);
}

createReleaseNotesFile(); 