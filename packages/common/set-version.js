import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

try {
  const gitTag = execSync('git describe --tags $(git rev-list --tags --max-count=1)', { encoding: 'utf8' }).trim();
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const filePath = path.join(__dirname, 'src/version.ts');
  let content = '';

  if (!fs.existsSync(filePath)) {
    content = `export const PDFME_VERSION = '${gitTag}';\n`;
  } else {
    content = fs.readFileSync(filePath, 'utf8');
    const versionRegex = /export const PDFME_VERSION = '.*';/;

    if (versionRegex.test(content)) {
      content = content.replace(versionRegex, `export const PDFME_VERSION = '${gitTag}';`);
    } else {
      content += `\nexport const PDFME_VERSION = '${gitTag}';\n`;
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Replaced PDFME_VERSION with '${gitTag}' in ${filePath}`);
} catch (error) {
  console.error('Error replacing PDFME_VERSION:', error);
  process.exit(1);
}
