const fs = require('fs');
const https = require('https');

// Configuration
const GITHUB_TOKEN = process.env.GH_TOKEN;
const OWNER = 'MikeSylvester';
const REPO = 'QuickSnipe';

// Get the current version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const VERSION = packageJson.version;

if (!GITHUB_TOKEN) {
  console.error('❌ GH_TOKEN environment variable is not set');
  process.exit(1);
}

// Get existing release
function getRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/releases/tags/v${VERSION}`,
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'QuickSnipe-Upload-Script',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode === 200) {
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

    req.end();
  });
}

// Upload file to release
function uploadFile(uploadUrl, filePath, fileName) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }

    const fileContent = fs.readFileSync(filePath);
    const url = uploadUrl.replace('{?name,label}', `?name=${fileName}`);

    const options = {
      hostname: 'uploads.github.com',
      path: url.replace('https://uploads.github.com', ''),
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'QuickSnipe-Upload-Script',
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileContent.length
      }
    };

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
            reject(new Error(`Upload failed: ${res.statusCode} - ${response.message || body}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse upload response: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(fileContent);
    req.end();
  });
}

// Main function
async function uploadAssets() {
  try {
    console.log('📋 Getting existing release...');
    const release = await getRelease();
    console.log(`✅ Found release: ${release.name}`);
    
    console.log('📤 Uploading assets...');
    
    const files = [
      { path: 'dist/Quicksnipe.exe', name: 'Quicksnipe.exe' },
      { path: 'dist/Quicksnipe.exe.blockmap', name: 'Quicksnipe.exe.blockmap' },
      { path: 'dist/latest.yml', name: 'latest.yml' }
    ];

    for (const file of files) {
      try {
        console.log(`📁 Uploading ${file.name}...`);
        await uploadFile(release.upload_url, file.path, file.name);
        console.log(`✅ ${file.name} uploaded successfully`);
      } catch (error) {
        console.error(`❌ Failed to upload ${file.name}:`, error.message);
      }
    }
    
    console.log('\n🎉 Asset upload completed!');
    console.log(`🔗 Release URL: ${release.html_url}`);
    
  } catch (error) {
    console.error('❌ Failed to upload assets:', error.message);
    process.exit(1);
  }
}

uploadAssets(); 