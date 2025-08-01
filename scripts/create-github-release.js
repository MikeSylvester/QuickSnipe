const fs = require('fs');
const https = require('https');

// Configuration
const GITHUB_TOKEN = process.env.GH_TOKEN;
const OWNER = 'MikeSylvester';
const REPO = 'QuickSnipe';
const VERSION = '1.0.7';

if (!GITHUB_TOKEN) {
  console.error('❌ GH_TOKEN environment variable is not set');
  console.log('Please set it with: $env:GH_TOKEN="your_token_here"');
  process.exit(1);
}

// Read release notes from RELEASE_NOTES.md
function readReleaseNotes() {
  try {
    const allNotes = fs.readFileSync('RELEASE_NOTES.md', 'utf8');
    
    // Find the section for the current version
    const versionPattern = new RegExp(`## Version ${VERSION}\\s*\\n([\\s\\S]*?)(?=\\n## Version|$)`, 'i');
    const match = allNotes.match(versionPattern);
    
    if (match) {
      return `## Version ${VERSION}\n${match[1].trim()}`;
    } else {
      console.warn(`⚠️  No release notes found for version ${VERSION} in RELEASE_NOTES.md`);
      return `## Version ${VERSION}\n\n• Release notes not found for this version`;
    }
  } catch (error) {
    console.error('❌ Could not read RELEASE_NOTES.md');
    return `## Version ${VERSION}\n\n• Release notes file not found`;
  }
}

// Make GitHub API request
function makeGitHubRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}${path}`,
      method: method,
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'QuickSnipe-Release-Script',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    if (data) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`GitHub API Error: ${res.statusCode} - ${response.message || body}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Create GitHub release
async function createRelease() {
  try {
    console.log('📝 Reading release notes...');
    const releaseNotes = readReleaseNotes();
    
    console.log('🚀 Creating GitHub release...');
    const releaseData = {
      tag_name: `v${VERSION}`,
      name: `QuickSnipe v${VERSION}`,
      body: releaseNotes,
      draft: false,
      prerelease: false
    };

    const release = await makeGitHubRequest('/releases', 'POST', releaseData);
    console.log('✅ Release created successfully!');
    console.log(`🔗 Release URL: ${release.html_url}`);
    
    // Upload the built files
    console.log('📤 Uploading release assets...');
    
    const files = [
      'dist/Quicksnipe.exe',
      'dist/Quicksnipe.exe.blockmap'
    ];

    for (const file of files) {
      if (fs.existsSync(file)) {
        console.log(`📁 Uploading ${file}...`);
        const fileContent = fs.readFileSync(file);
        const fileName = file.split('/').pop();
        
        const uploadUrl = release.upload_url.replace('{?name,label}', `?name=${fileName}`);
        
        try {
          // Fix the upload URL path
          const uploadPath = uploadUrl.replace('https://api.github.com/repos', '');
          await makeGitHubRequest(uploadPath, 'POST', fileContent, true);
          console.log(`✅ ${fileName} uploaded successfully`);
        } catch (error) {
          console.error(`❌ Failed to upload ${fileName}:`, error.message);
        }
      } else {
        console.warn(`⚠️  File not found: ${file}`);
      }
    }
    
    console.log('\n🎉 Release process completed!');
    console.log(`📋 Release notes:\n${releaseNotes}`);
    
  } catch (error) {
    console.error('❌ Failed to create release:', error.message);
    process.exit(1);
  }
}

// Update the makeGitHubRequest function to handle binary data
function makeGitHubRequest(path, method = 'GET', data = null, isBinary = false) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}${path}`,
      method: method,
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'QuickSnipe-Release-Script',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    if (data && !isBinary) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`GitHub API Error: ${res.statusCode} - ${response.message || body}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(isBinary ? data : JSON.stringify(data));
    }

    req.end();
  });
}

createRelease(); 