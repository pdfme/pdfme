import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const updateVersion = (version) => {
  const filePath = path.join(__dirname, 'src/version.ts');
  let content = '';

  if (!fs.existsSync(filePath)) {
    content = `export const PDFME_VERSION = '${version}';\n`;
  } else {
    content = fs.readFileSync(filePath, 'utf8');
    const versionRegex = /export const PDFME_VERSION = '.*';/;
    if (versionRegex.test(content)) {
      content = content.replace(versionRegex, `export const PDFME_VERSION = '${version}';`);
    } else {
      content += `\nexport const PDFME_VERSION = '${version}';\n`;
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Replaced PDFME_VERSION with '${version}' in ${filePath}`);
};

try {
  const gitTag = execSync('git describe --tags $(git rev-list --tags --max-count=1)', { encoding: 'utf8' }).trim();
  updateVersion(gitTag);
} catch (error) {
  console.error('Error replacing PDFME_VERSION:', error);
  updateVersion('x.x.x');
}
