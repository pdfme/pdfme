const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  // Step 1: Get the latest tag commit hash
  const latestTagCommit = execSync('git rev-list --tags --max-count=1', {
    encoding: 'utf8',
    shell: true, // Ensure compatibility with Windows
  }).trim();

  // Step 2: Get the tag name corresponding to the latest commit
  const gitTag = execSync(`git describe --tags ${latestTagCommit}`, {
    encoding: 'utf8',
    shell: true,
  }).trim();

  const filePath = path.join(__dirname, 'src/constants.ts');

  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(
    /export const PDFME_VERSION = '.*';/,
    `export const PDFME_VERSION = '${gitTag}';`
  );

  fs.writeFileSync(filePath, content, 'utf8');

  console.log(`Replaced PDFME_VERSION with '${gitTag}' in ${filePath}`);
} catch (error) {
  console.error('Error replacing PDFME_VERSION:', error);
  process.exit(1);
}
