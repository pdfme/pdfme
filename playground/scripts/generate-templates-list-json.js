const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '..', 'public', 'template-assets');
const indexFilePath = path.join(templatesDir, 'index.json');

function generateTemplatesListJson() {
  const items = fs.readdirSync(templatesDir, { withFileTypes: true });

  const result = items
    .filter((item) => {
      if (!item.isDirectory() || item.name.startsWith('.')) return false;
      
      const templateJsonPath = path.join(templatesDir, item.name, 'template.json');
      return fs.existsSync(templateJsonPath);
    })
    .map((item) => item.name);

  fs.writeFileSync(indexFilePath, JSON.stringify(result, null, 2));
  console.log(`Generated index.json with templates: ${result.join(', ')}`);
}

generateTemplatesListJson();
