import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pLimit from 'p-limit';
import { getDefaultFont, getInputFromTemplate } from '@pdfme/common';
import { pdf2img } from '@pdfme/converter';
import { generate } from '@pdfme/generator';
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
} from '@pdfme/schemas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fontDir = path.resolve(__dirname, '../../packages/generator/__tests__/assets/fonts');

const readFont = (fileName) => fs.readFileSync(path.join(fontDir, fileName));

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
    ui: async () => {},
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

const font = {
  ...getDefaultFont(),
  'PinyonScript-Regular': {
    fallback: false,
    data: readFont('PinyonScript-Regular.ttf'),
  },
  NotoSerifJP: {
    fallback: false,
    data: readFont('NotoSerifJP-Regular.ttf'),
  },
  NotoSansJP: {
    fallback: false,
    data: readFont('NotoSansJP-Regular.ttf'),
  },
};

const limit = pLimit(4);

function calcHash(content) {
  return crypto.createHash('md5').update(content, 'utf8').digest('hex');
}

async function createThumbnailFromTemplate(templatePath, thumbnailPath) {
  try {
    const templateJsonStr = fs.readFileSync(templatePath, 'utf-8');
    const templateJson = JSON.parse(templateJsonStr);

    const pdf = await generate({
      template: templateJson,
      inputs: getInputFromTemplate(templateJson),
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
    throw err;
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
