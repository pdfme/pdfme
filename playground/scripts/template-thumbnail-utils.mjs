import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDefaultFont, getInputFromTemplate } from '@pdfme/common';
import { pdf2img } from '@pdfme/converter';
import { generate } from '@pdfme/generator';
import {
  multiVariableText,
  text,
  barcodes,
  image,
  signature,
  svg,
  line,
  table,
  list,
  rectangle,
  ellipse,
  dateTime,
  date,
  time,
  select,
  checkbox,
  radioGroup,
  circleMark,
} from '@pdfme/schemas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fontDir = path.resolve(__dirname, '../../packages/generator/__tests__/assets/fonts');

const readFont = (fileName) => fs.readFileSync(path.join(fontDir, fileName));

export const plugins = {
  multiVariableText,
  text,
  list,
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
  circleMark,
  signature,
};

export const font = {
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

export async function createThumbnailFromTemplateObject(template, thumbnailPath) {
  const pdf = await generate({
    template,
    inputs: getInputFromTemplate(template),
    options: { font },
    plugins,
  });

  const images = await pdf2img(pdf.buffer, {
    range: { end: 1 },
  });

  const thumbnail = images[0];
  if (!thumbnail) {
    throw new Error('Failed to create thumbnail image');
  }
  fs.writeFileSync(thumbnailPath, Buffer.from(thumbnail));
}

export async function createThumbnailFromTemplate(templatePath, thumbnailPath) {
  try {
    const templateJsonStr = fs.readFileSync(templatePath, 'utf-8');
    const templateJson = JSON.parse(templateJsonStr);
    await createThumbnailFromTemplateObject(templateJson, thumbnailPath);
  } catch (err) {
    console.error(`Failed to create thumbnail from ${templatePath}:`, err);
    throw err;
  }
}
