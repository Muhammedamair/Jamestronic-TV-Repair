const fs = require('fs');
const path = require('path');

// Guarantee the public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate a version hash based on the Vercel deployment commit, or fallback to the current Unix timestamp
const payload = {
  version: process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString()
};

// Write it out directly to the public folder so it can be fetched via /version.json
const outputPath = path.join(publicDir, 'version.json');
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));

console.log(`[Version Generator] Successfully wrote build version hash: ${payload.version}`);
