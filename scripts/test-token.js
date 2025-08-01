const https = require('https');

const GITHUB_TOKEN = process.env.GH_TOKEN;
const OWNER = 'MikeSylvester';
const REPO = 'QuickSnipe';

if (!GITHUB_TOKEN) {
  console.error('❌ GH_TOKEN environment variable is not set');
  process.exit(1);
}

function testToken() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}`,
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'QuickSnipe-Token-Test',
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
            console.log('✅ Token is valid!');
            console.log(`📁 Repository: ${response.full_name}`);
            console.log(`🔗 URL: ${response.html_url}`);
            resolve(response);
          } else {
            console.error('❌ Token validation failed:');
            console.error(`Status: ${res.statusCode}`);
            console.error(`Message: ${response.message}`);
            reject(new Error(response.message));
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

testToken().catch(error => {
  console.error('❌ Error testing token:', error.message);
  console.log('\n💡 Possible solutions:');
  console.log('1. Check if the token is expired');
  console.log('2. Make sure the token has "repo" permissions');
  console.log('3. Generate a new token at: https://github.com/settings/tokens');
  process.exit(1);
}); 