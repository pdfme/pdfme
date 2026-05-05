import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFME_VERSION } from '@pdfme/common';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatesDir = path.join(__dirname, '..', 'public', 'template-assets');
const indexFilePath = path.join(templatesDir, 'index.json');
const manifestFilePath = path.join(templatesDir, 'manifest.json');
const versionedManifestDir = path.join(templatesDir, 'manifests');

const featuredTemplates = [
  'invoice',
  'quotes',
  'pedigree',
  'certificate-black',
  'a4-blank',
  'QR-lines',
];

function generateTemplatesListJson() {
  const cliVersion = PDFME_VERSION;
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
      return buildTemplateEntry(item.name, templateJson);
    })
    .sort((a, b) => {
      const aIndex = featuredTemplates.indexOf(a.name);
      const bIndex = featuredTemplates.indexOf(b.name);

      if (aIndex > -1 && bIndex > -1) return aIndex - bIndex;

      if (aIndex > -1) return -1;

      if (bIndex > -1) return 1;

      return 0;
    });

  const manifest = {
    schemaVersion: 1,
    cliVersion,
    templates: result,
  };

  if (!fs.existsSync(versionedManifestDir)) {
    fs.mkdirSync(versionedManifestDir, { recursive: true });
  }

  for (const entry of fs.readdirSync(versionedManifestDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    const manifestPath = path.join(versionedManifestDir, entry.name);
    if (entry.name !== `${cliVersion}.json`) {
      fs.rmSync(manifestPath);
    }
  }

  fs.writeFileSync(indexFilePath, JSON.stringify(result, null, 2));
  fs.writeFileSync(manifestFilePath, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(versionedManifestDir, `${cliVersion}.json`), JSON.stringify(manifest, null, 2));
  console.log(`Generated index.json with templates: ${result.map((t) => t.name).join(', ')}`);
  console.log(`Generated manifest.json for CLI version ${cliVersion}`);
}

function buildTemplateEntry(name, templateJson) {
  const schemas = normalizeSchemas(templateJson.schemas);
  const flattenedSchemas = schemas.flat();
  const schemaTypes = [...new Set(flattenedSchemas.map((schema) => schema.type).filter(Boolean))].sort();
  const fontNames = [...new Set(flattenedSchemas.map((schema) => schema.fontName).filter(Boolean))].sort();

  return {
    name,
    author: templateJson.author || 'pdfme',
    path: `${name}/template.json`,
    thumbnailPath: `${name}/thumbnail.png`,
    pageCount: schemas.length,
    fieldCount: flattenedSchemas.length,
    schemaTypes,
    fontNames,
    hasCJK: hasCJKContent(flattenedSchemas),
    basePdfKind: detectBasePdfKind(templateJson.basePdf),
  };
}

function normalizeSchemas(rawSchemas) {
  if (!Array.isArray(rawSchemas)) {
    return [];
  }

  return rawSchemas.map((page) => {
    if (Array.isArray(page)) {
      return page.filter((schema) => typeof schema === 'object' && schema !== null);
    }

    if (typeof page === 'object' && page !== null) {
      return Object.values(page).filter((schema) => typeof schema === 'object' && schema !== null);
    }

    return [];
  });
}

function hasCJKContent(schemas) {
  return schemas.some((schema) =>
    ['content', 'title', 'placeholder'].some((key) =>
      typeof schema[key] === 'string' && /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(schema[key]),
    ),
  );
}

function detectBasePdfKind(basePdf) {
  if (typeof basePdf === 'string') {
    if (basePdf.startsWith('data:')) return 'dataUri';
    if (basePdf.endsWith('.pdf')) return 'pdfPath';
    return 'string';
  }

  if (basePdf && typeof basePdf === 'object') {
    if ('width' in basePdf && 'height' in basePdf) return 'blank';
    return 'object';
  }

  return 'unknown';
}

generateTemplatesListJson();
