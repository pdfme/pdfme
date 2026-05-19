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

function generateTemplatesListJson() {
  const cliVersion = PDFME_VERSION;
  const items = fs.readdirSync(templatesDir, { withFileTypes: true });
  const metadataByTemplate = loadTemplateMetadata();
  const templateDirs = items
    .filter((item) => {
      if (!item.isDirectory() || item.name.startsWith('.')) return false;

      const templateJsonPath = path.join(templatesDir, item.name, 'template.json');
      return fs.existsSync(templateJsonPath);
    })
    .map((item) => item.name);

  validateTemplateMetadata(metadataByTemplate, templateDirs);

  const result = templateDirs
    .map((name) => {
      const templateJsonPath = path.join(templatesDir, name, 'template.json');
      const templateJson = JSON.parse(fs.readFileSync(templateJsonPath, 'utf8'));
      return buildTemplateEntry(name, templateJson, metadataByTemplate[name]);
    })
    .sort(compareTemplateEntries);

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
  fs.writeFileSync(
    path.join(versionedManifestDir, `${cliVersion}.json`),
    JSON.stringify(manifest, null, 2),
  );
  console.log(`Generated index.json with templates: ${result.map((t) => t.name).join(', ')}`);
  console.log(`Generated manifest.json for CLI version ${cliVersion}`);
}

function loadTemplateMetadata() {
  const metadataByTemplate = {};
  const items = fs.readdirSync(templatesDir, { withFileTypes: true });
  for (const item of items) {
    if (!item.isDirectory() || item.name.startsWith('.')) continue;

    const itemMetadataPath = path.join(templatesDir, item.name, 'metadata.json');
    if (!fs.existsSync(itemMetadataPath)) continue;

    const parsed = JSON.parse(fs.readFileSync(itemMetadataPath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`template-assets/${item.name}/metadata.json must be an object.`);
    }
    metadataByTemplate[item.name] = parsed;
  }

  return metadataByTemplate;
}

function normalizeMetadata(rawMetadata) {
  if (!rawMetadata || typeof rawMetadata !== 'object' || Array.isArray(rawMetadata)) {
    return {};
  }

  const metadata = {};
  if (typeof rawMetadata.title === 'string' && rawMetadata.title.trim()) {
    metadata.title = rawMetadata.title.trim();
  }
  if (typeof rawMetadata.description === 'string') metadata.description = rawMetadata.description;
  if (typeof rawMetadata.order === 'number' && Number.isFinite(rawMetadata.order)) {
    metadata.order = rawMetadata.order;
  }
  if (['designer', 'jsx', 'md2pdf', 'pdf'].includes(rawMetadata.sourceKind)) {
    metadata.sourceKind = rawMetadata.sourceKind;
  }
  if (Array.isArray(rawMetadata.tags)) {
    metadata.tags = [
      ...new Set(rawMetadata.tags.filter((tag) => typeof tag === 'string' && tag.trim())),
    ];
  }

  return metadata;
}

function validateTemplateMetadata(metadataByTemplate, templateDirs) {
  const templateNameSet = new Set(templateDirs);
  const metadataNames = Object.keys(metadataByTemplate);
  const missingMetadata = templateDirs.filter((name) => !metadataByTemplate[name]);
  const orphanMetadata = metadataNames.filter((name) => !templateNameSet.has(name));

  if (missingMetadata.length > 0) {
    throw new Error(
      `template asset metadata is missing entries for templates: ${missingMetadata.join(', ')}`,
    );
  }

  if (orphanMetadata.length > 0) {
    throw new Error(
      `template asset metadata contains entries without template.json: ${orphanMetadata.join(', ')}`,
    );
  }

  for (const [name, rawMetadata] of Object.entries(metadataByTemplate)) {
    const metadata = normalizeMetadata(rawMetadata);
    if (!metadata.title) {
      throw new Error(`template asset metadata entry "${name}" must include title.`);
    }
    if (!metadata.description) {
      throw new Error(`template asset metadata entry "${name}" must include description.`);
    }
    if (!metadata.sourceKind) {
      throw new Error(`template asset metadata entry "${name}" must include sourceKind.`);
    }
    if (!metadata.tags || metadata.tags.length === 0) {
      throw new Error(`template asset metadata entry "${name}" must include tags.`);
    }

    const inferredSourceKind = inferSourceKind(name);
    if (metadata.sourceKind !== inferredSourceKind) {
      throw new Error(
        `template asset metadata entry "${name}" has sourceKind "${metadata.sourceKind}", expected "${inferredSourceKind}".`,
      );
    }
  }

  const orderedEntries = Object.entries(metadataByTemplate)
    .map(([name, rawMetadata]) => [name, normalizeMetadata(rawMetadata)])
    .filter(([, metadata]) => metadata.order != null);
  const seenOrders = new Map();
  for (const [name, metadata] of orderedEntries) {
    const existingName = seenOrders.get(metadata.order);
    if (existingName) {
      throw new Error(
        `template asset metadata entries "${existingName}" and "${name}" both use order ${metadata.order}.`,
      );
    }
    seenOrders.set(metadata.order, name);
  }
}

function inferSourceKind(name) {
  if (name.startsWith('jsx-')) return 'jsx';
  if (name.startsWith('md2pdf-')) return 'md2pdf';
  if (fs.existsSync(path.join(templatesDir, name, 'source.pdf'))) return 'pdf';
  return 'designer';
}

function buildTemplateEntry(name, templateJson, rawMetadata) {
  const schemas = normalizeSchemas(templateJson.schemas);
  const flattenedSchemas = schemas.flat();
  const metadata = normalizeMetadata(rawMetadata);
  if (!metadata.title) {
    throw new Error(`template asset metadata entry "${name}" must include title.`);
  }
  if (!metadata.sourceKind) {
    throw new Error(`template asset metadata entry "${name}" must include sourceKind.`);
  }
  const sourceKind = metadata.sourceKind;
  const schemaTypes = [
    ...new Set(flattenedSchemas.map((schema) => schema.type).filter(Boolean)),
  ].sort();
  const fontNames = [
    ...new Set(flattenedSchemas.map((schema) => schema.fontName).filter(Boolean)),
  ].sort();

  return {
    name,
    author: templateJson.author || 'pdfme',
    path: `${name}/template.json`,
    thumbnailPath: `${name}/thumbnail.png`,
    sourcePath: getSourcePath(name, sourceKind),
    pageCount: schemas.length,
    fieldCount: flattenedSchemas.length,
    schemaTypes,
    fontNames,
    hasCJK: hasCJKContent(flattenedSchemas),
    basePdfKind: detectBasePdfKind(templateJson.basePdf),
    description: metadata.description,
    order: metadata.order,
    sourceKind,
    tags: metadata.tags,
    title: metadata.title,
  };
}

function getSourcePath(name, sourceKind) {
  if (sourceKind === 'jsx') {
    const sourcePath = path.join(templatesDir, name, 'source.tsx');
    return fs.existsSync(sourcePath) ? `${name}/source.tsx` : undefined;
  }
  if (sourceKind === 'md2pdf') {
    const sourcePath = path.join(templatesDir, name, 'source.md');
    return fs.existsSync(sourcePath) ? `${name}/source.md` : undefined;
  }
  if (sourceKind === 'pdf') {
    const sourcePath = path.join(templatesDir, name, 'source.pdf');
    return fs.existsSync(sourcePath) ? `${name}/source.pdf` : undefined;
  }
  return undefined;
}

function compareTemplateEntries(a, b) {
  if (a.order != null && b.order != null) return a.order - b.order;
  if (a.order != null) return -1;
  if (b.order != null) return 1;

  const titleResult = a.title.localeCompare(b.title);
  if (titleResult !== 0) return titleResult;

  return a.name.localeCompare(b.name);
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
    ['content', 'title', 'placeholder'].some(
      (key) =>
        typeof schema[key] === 'string' &&
        /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(schema[key]),
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
