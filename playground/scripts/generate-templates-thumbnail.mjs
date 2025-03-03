import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pLimit from 'p-limit';
import { generate } from '../../packages/generator/dist/cjs/src/index.js';
import { pdf2img } from '../../packages/converter/dist/cjs/src/index.node.js';
import { getInputFromTemplate, getDefaultFont } from '../../packages/common/dist/cjs/src/index.js';
import {
  multiVariableText,
  text,
  barcodes,
  image,
  svg,
  line,
  table,
  rectangle,
  ellipse,
  dateTime,
  date,
  time,
  select,
  checkbox,
  radioGroup,
} from '../../packages/schemas/dist/cjs/src/index.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const plugins = {
  multiVariableText,
  text,
  qrcode: barcodes.qrcode,
  japanpost: barcodes.japanpost,
  ean13: barcodes.ean13,
  code128: barcodes.code128,
  image,
  svg,
  line,
  table,
  rectangle,
  ellipse,
  dateTime,
  date,
  time,
  select,
  checkbox,
  radioGroup,
  signature: {
    ui: async () => { },
    pdf: image.pdf,
    propPanel: {
      schema: {},
      defaultSchema: {
        name: '',
        type: 'signature',
        content: '',
        position: { x: 0, y: 0 },
        width: 62.5,
        height: 37.5,
      },
    },
  },
};

const font = getDefaultFont();

const limit = pLimit(4);

function calcHash(content) {
  return crypto.createHash('md5').update(content, 'utf8').digest('hex');
}


async function createThumbnailFromTemplate(templatePath, thumbnailPath) {
  try {
    const templateJsonStr = fs.readFileSync(templatePath, 'utf-8');
    const templateJson = JSON.parse(templateJsonStr);

    // Create a copy of the template to modify if needed
    const modifiedTemplate = JSON.parse(JSON.stringify(templateJson));
    
    // Check if the template uses PinyonScript-Regular font and replace it with a default font
    if (modifiedTemplate.schemas) {
      modifiedTemplate.schemas.forEach(schemaPage => {
        if (schemaPage && Array.isArray(schemaPage)) {
          schemaPage.forEach(schema => {
            if (schema && schema.fontName === 'PinyonScript-Regular') {
              schema.fontName = 'Helvetica';
            }
          });
        } else if (schemaPage && typeof schemaPage === 'object') {
          // Handle case where schemaPage is an object, not an array
          if (schemaPage.fontName === 'PinyonScript-Regular') {
            schemaPage.fontName = 'Helvetica';
          }
        }
      });
    }

    const pdf = await generate({
      template: modifiedTemplate,
      inputs: getInputFromTemplate(modifiedTemplate),
      options: { font },
      plugins,
    });

    const images = await pdf2img(pdf.buffer, {
      imageType: 'png',
      range: { end: 1 },
    });

    const thumbnail = images[0];
    fs.writeFileSync(thumbnailPath, Buffer.from(thumbnail));
  } catch (err) {
    console.error(`Failed to create thumbnail from ${templatePath}:`, err);
    // Instead of throwing, we'll just log the error and continue
    // This allows the build to continue even if some templates can't be processed
    console.error('Continuing with build despite thumbnail generation error');
  }
}

async function main() {
  const playgroundPath = path.resolve(__dirname, '..');
  const templatesPath = path.join(playgroundPath, 'public', 'template-assets');

  const hashMapPath = path.join(__dirname, 'thumbnail-hash-map.json');
  let hashMap = {};
  if (fs.existsSync(hashMapPath)) {
    try {
      hashMap = JSON.parse(fs.readFileSync(hashMapPath, 'utf-8'));
    } catch (error) {
      console.warn('Failed to parse thumbnail-hash-map.json. Initializing empty map.');
    }
  }

  const dirs = fs
    .readdirSync(templatesPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const processDir = async (dir) => {
    const templateJsonPath = path.join(templatesPath, dir, 'template.json');
    if (!fs.existsSync(templateJsonPath)) {
      return;
    }

    const templateJsonStr = fs.readFileSync(templateJsonPath, 'utf-8');
    const currentHash = calcHash(templateJsonStr);

    if (hashMap[dir] && hashMap[dir] === currentHash) {
      console.log(`No changes in ${dir}. Skipping thumbnail generation.`);
      return;
    }

    const thumbnailPngPath = path.join(templatesPath, dir, 'thumbnail.png');
    await createThumbnailFromTemplate(templateJsonPath, thumbnailPngPath);

    hashMap[dir] = currentHash;
    console.log(`Generated thumbnail for ${dir}.`);
  };

  await Promise.all(dirs.map((dir) => limit(() => processDir(dir))));

  fs.writeFileSync(hashMapPath, JSON.stringify(hashMap, null, 2), 'utf-8');
  console.log('Thumbnails generation process completed!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
