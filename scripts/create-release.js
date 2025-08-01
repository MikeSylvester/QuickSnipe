const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the current version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = packageJson.version;

// Get the previous version (you can modify this logic)
const previousVersion = 'v1.0.6'; // This should be dynamic

// Generate release notes from git commits
function generateReleaseNotes() {
  try {
    // Get commits since the last tag
    const commits = execSync(`git log --oneline ${previousVersion}..HEAD`, { encoding: 'utf8' });
    
    // Parse commits and format them
    const commitLines = commits.trim().split('\n').filter(line => line.trim());
    
    let releaseNotes = `## Version ${currentVersion}\n\n`;
    
    // Group commits by type
    const features = [];
    const fixes = [];
    const improvements = [];
    
    commitLines.forEach(commit => {
      const message = commit.split(' ').slice(1).join(' ');
      if (message.toLowerCase().includes('fix') || message.toLowerCase().includes('bug')) {
        fixes.push(`• ${message}`);
      } else if (message.toLowerCase().includes('add') || message.toLowerCase().includes('new')) {
        features.push(`• ${message}`);
      } else {
        improvements.push(`• ${message}`);
      }
    });
    
    if (features.length > 0) {
      releaseNotes += '### New Features\n';
      releaseNotes += features.join('\n') + '\n\n';
    }
    
    if (fixes.length > 0) {
      releaseNotes += '### Bug Fixes\n';
      releaseNotes += fixes.join('\n') + '\n\n';
    }
    
    if (improvements.length > 0) {
      releaseNotes += '### Improvements\n';
      releaseNotes += improvements.join('\n') + '\n\n';
    }
    
    return releaseNotes;
  } catch (error) {
    console.error('Error generating release notes:', error);
    return `## Version ${currentVersion}\n\n• Auto-generated release notes`;
  }
}

// Create a release notes file for GitHub
function createReleaseNotesFile() {
  const releaseNotes = generateReleaseNotes();
  
  // Write release notes to a file
  fs.writeFileSync('RELEASE_NOTES_CURRENT.md', releaseNotes);
  
  console.log('Release notes generated:');
  console.log(releaseNotes);
  console.log('\nRelease notes saved to RELEASE_NOTES_CURRENT.md');
  console.log('\nAfter building, you can create a GitHub release with these notes using:');
  console.log(`gh release create v${currentVersion} --notes-file RELEASE_NOTES_CURRENT.md`);
}

createReleaseNotesFile(); 