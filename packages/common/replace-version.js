const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const gitTag = execSync('git describe --tags $(git rev-list --tags --max-count=1)', { encoding: 'utf8' }).trim();

  const filePath = path.join(__dirname, 'src/constants.ts');

  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/export const PDFME_VERSION = '.*';/, `export const PDFME_VERSION = '${gitTag}';`);

  fs.writeFileSync(filePath, content, 'utf8');

  console.log(`Replaced PDFME_VERSION with '${gitTag}' in ${filePath}`);
} catch (error) {
  console.error('Error replacing PDFME_VERSION:', error);
  process.exit(1);
}
