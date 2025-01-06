// TODO refactor. plugins and font should be reused
// playground/src/helper.ts

const fs = require('fs');
const path = require('path');
const pdfjsDist = require('pdfjs-dist/legacy/build/pdf');
const pdfjsWorker = require('pdfjs-dist/build/pdf.worker');

const Canvas = require('canvas');
const { strict: invariant } = require('node:assert');
const { generate } = require('@pdfme/generator');
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
}


pdfjsDist.GlobalWorkerOptions.workerSrc = pdfjsWorker;


class NodeCanvasFactory {
  canvas = null;
  context = null;
  getOrCreateCanvas(
    width,
    height,
  ) {
    invariant(width > 0 && height > 0, 'Invalid canvas size');
    if (!this.canvas) {
      this.canvas = Canvas.createCanvas(width, height);
      this.context = this.canvas.getContext('2d');
    } else {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    return { canvas: this.canvas, context: this.context };
  }
}

async function pdf2Pngs(pdf) {
  const filePath = path.resolve('./public', 'cmaps');

  try {
    const pdfDocument = await pdfjsDist.getDocument({
      data: new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength),
      cMapUrl: filePath,
      cMapPacked: true,
    }).promise;

    const canvasFactory = new NodeCanvasFactory();

    const pages = async function* () {
      const limit = pdfDocument.numPages;
      for (let pg = 1; pg <= pdfDocument.numPages && pg <= limit; pg++) {
        try {
          const page = await pdfDocument.getPage(pg);
          const viewport = page.getViewport({ scale: 1 });

          const { canvas, context: canvasContext } = canvasFactory.getOrCreateCanvas(viewport.width, viewport.height);

          await page.render({ canvasContext, viewport, canvasFactory }).promise;
          yield canvas.toBuffer('image/png');
        } catch (error) {
          throw new Error(`Failed to process page ${pg}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };

    const imageStream = await pages();

    const images = [];

    for await (const image of imageStream) {
      images.push(image);
    }

    return images;
  } catch (error) {
    throw new Error(`Failed to convert PDF to PNGs: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function createThumbnailFromTemplate(templatePath, thumbnailPath) {
  try {
    const templateJsonStr = fs.readFileSync(templatePath, 'utf-8');
    const templateJson = JSON.parse(templateJsonStr);

    const pdfBuffer = await generate({
      template: templateJson,
      inputs: getInputFromTemplate(templateJson),
      options: { font },
      plugins
    });

    const pngBuffers = await pdf2Pngs(pdfBuffer);

    fs.writeFileSync(thumbnailPath, pngBuffers[0]);
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
