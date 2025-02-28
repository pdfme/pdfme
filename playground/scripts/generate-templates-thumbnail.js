const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pLimit = require('p-limit');
const { generate } = require('@pdfme/generator');
const { pdf2img } = require('@pdfme/converter');
const { getInputFromTemplate, getDefaultFont } = require('@pdfme/common');
const {
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
} = require('@pdfme/schemas');

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

const font = {
  ...getDefaultFont(),
  'PinyonScript-Regular': {
    fallback: false,
    data: 'https://fonts.gstatic.com/s/pinyonscript/v22/6xKpdSJbL9-e9LuoeQiDRQR8aOLQO4bhiDY.ttf',
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
