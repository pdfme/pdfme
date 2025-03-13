import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const templatesDir = path.join(__dirname, '..', 'public', 'template-assets');
const indexFilePath = path.join(templatesDir, 'index.json');

const featuredTemplates = ['invoice', 'quotes','pedigree', 'certificate-black', 'a4-blank', 'QR-lines'];

function generateTemplatesListJson() {
  const items = fs.readdirSync(templatesDir, { withFileTypes: true });

  const result = items
    .filter((item) => {
      if (!item.isDirectory() || item.name.startsWith('.')) return false;

      const templateJsonPath = path.join(templatesDir, item.name, 'template.json');
      return fs.existsSync(templateJsonPath);
    })
    .map((item) => {
      const templateJsonPath = path.join(templatesDir, item.name, 'template.json');
      const templateJson = JSON.parse(fs.readFileSync(templateJsonPath, 'utf8'));
      return {
        name: item.name,
        author: templateJson.author || 'pdfme'
      };
    })
    .sort((a, b) => {
      const aIndex = featuredTemplates.indexOf(a.name);
      const bIndex = featuredTemplates.indexOf(b.name);

      if (aIndex > -1 && bIndex > -1) return aIndex - bIndex;

      if (aIndex > -1) return -1;

      if (bIndex > -1) return 1;

      return 0;
    });

  fs.writeFileSync(indexFilePath, JSON.stringify(result, null, 2));
  console.log(`Generated index.json with templates: ${result.map(t => t.name).join(', ')}`);
}

generateTemplatesListJson();