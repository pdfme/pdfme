// TODO refactor. plugins and font should be reused
// playground/src/helper.ts

const fs = require('fs');
const path = require('path');

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
    }
  }
}

const font = {
  ...getDefaultFont(),
  NotoSerifJP: {
    fallback: false,
    data: 'https://fonts.gstatic.com/s/notoserifjp/v30/xn71YHs72GKoTvER4Gn3b5eMRtWGkp6o7MjQ2bwxOubAILO5wBCU.ttf',
  },
  NotoSansJP: {
    fallback: false,
    data: 'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75vY0rw-oME.ttf',
  },
  "PinyonScript-Regular": {
    fallback: false,
    data: 'https://fonts.gstatic.com/s/pinyonscript/v22/6xKpdSJbL9-e9LuoeQiDRQR8aOLQO4bhiDY.ttf',
  }
}

async function createThumbnailFromTemplate(templatePath, thumbnailPath) {
  try {
    const templateJsonStr = fs.readFileSync(templatePath, 'utf-8');
    const templateJson = JSON.parse(templateJsonStr);

    const pdf = await generate({
      template: templateJson,
      inputs: getInputFromTemplate(templateJson),
      options: { font },
      plugins
    });

    const images = await pdf2img(pdf.buffer, {
      imageType: 'png',
      range: { end: 1 }
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

  const dirs = fs
    .readdirSync(templatesPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const dir of dirs) {
    const templateJsonPath = path.join(templatesPath, dir, 'template.json');
    if (!fs.existsSync(templateJsonPath)) {
      continue;
    }

    const thumbnailPngPath = path.join(templatesPath, dir, 'thumbnail.png');
    await createThumbnailFromTemplate(templateJsonPath, thumbnailPngPath);
  }
  console.log(`Thumbnails generated from template.json for ${dirs.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
