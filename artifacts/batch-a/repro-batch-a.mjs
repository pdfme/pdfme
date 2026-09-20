import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { generate } from '../../packages/generator/dist/index.js';
import { BLANK_PDF, getDefaultFont, mm2pt } from '../../packages/common/dist/index.js';
import { pdf2img, pdf2size } from '../../packages/converter/dist/index.js';
import { PDFDocument, PDFName, PDFDict, rgb } from '../../packages/pdf-lib/dist/index.js';
import { text, rectangle, svg, barcodes } from '../../packages/schemas/dist/index.js';
import * as fontkit from 'fontkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const outDir = __dirname;

const write = async (name, data) => fs.writeFile(path.join(outDir, name), data);
const logLines = [];
const log = (msg) => {
  logLines.push(msg);
  console.log(msg);
};

const fontData = {
  NotoSansJP: await fs.readFile(
    path.join(root, 'packages/generator/__tests__/assets/fonts/NotoSansJP-Regular.ttf'),
  ),
  NotoSerifJP: await fs.readFile(
    path.join(root, 'packages/generator/__tests__/assets/fonts/NotoSerifJP-Regular.ttf'),
  ),
};

const defaultFont = Object.fromEntries(
  Object.entries(getDefaultFont()).map(([name, value]) => [name, { ...value, fallback: false }]),
);

const font = {
  ...defaultFont,
  NotoSansJP: { data: fontData.NotoSansJP, fallback: true, subset: true },
  NotoSerifJP: { data: fontData.NotoSerifJP, fallback: false, subset: true },
};

const getFirstPageXObjects = (pdfDoc) => {
  const page = pdfDoc.getPage(0);
  const resources = page.node.Resources();
  const xObject = resources?.lookupMaybe(PDFName.of('XObject'), PDFDict);
  return xObject;
};

const inspectImageColorSpaces = async (pdfBytes) => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const xObject = getFirstPageXObjects(pdfDoc);
  const raw = Buffer.from(pdfBytes).toString('latin1');
  const rawMatches = [...raw.matchAll(/\/ColorSpace\s+(\/[A-Za-z0-9]+)/g)].map((match) => match[1]);
  if (!xObject) return rawMatches.map((colorSpace) => ({ name: 'raw', colorSpace }));

  const results = [];
  for (const key of xObject.keys()) {
    const obj = xObject.lookup(key);
    if (!(obj instanceof PDFDict)) continue;
    const subtype = obj.get(PDFName.of('Subtype'))?.toString();
    const colorSpace = obj.get(PDFName.of('ColorSpace'))?.toString();
    results.push({ name: key.toString(), subtype, colorSpace });
  }
  return results.length > 0 ? results : rawMatches.map((colorSpace) => ({ name: 'raw', colorSpace }));
};

const issue460 = async () => {
  log('\n#460 CMYK QR code');
  const template = {
    basePdf: BLANK_PDF,
    schemas: [
      [
        {
          name: 'qr',
          type: 'qrcode',
          position: { x: 20, y: 20 },
          width: 45,
          height: 45,
          barColor: '#000000',
          backgroundColor: '#ffffff',
        },
        {
          name: 'cmykRect',
          type: 'rectangle',
          position: { x: 80, y: 20 },
          width: 35,
          height: 35,
          color: '#00ffff',
        },
      ],
    ],
  };
  const pdf = await generate({
    template,
    inputs: [{ qr: 'https://pdfme.com' }],
    plugins: { qrcode: barcodes.qrcode, rectangle },
    options: { colorType: 'cmyk' },
  });
  await write('issue-460-cmyk-qr.pdf', pdf);
  const images = await inspectImageColorSpaces(pdf);
  log(`generated issue-460-cmyk-qr.pdf (${pdf.length} bytes)`);
  log(`embedded XObject color spaces: ${JSON.stringify(images)}`);
  return { status: images.some((x) => x.colorSpace === '/DeviceRGB') ? 'reproduces' : 'cannot_reproduce', images };
};

const issue623 = async () => {
  log('\n#623 CropBox vs MediaBox');
  const baseDoc = await PDFDocument.create();
  const basePage = baseDoc.addPage([300, 200]);
  basePage.setCropBox(50, 40, 200, 120);
  basePage.drawRectangle({ x: 50, y: 40, width: 200, height: 120, color: rgb(1, 1, 0.9) });
  basePage.drawText('crop origin marker', { x: 55, y: 145, size: 12, color: rgb(0, 0, 1) });
  const basePdf = await baseDoc.save();
  await write('issue-623-base-cropbox.pdf', basePdf);

  const template = {
    basePdf,
    schemas: [
      [
        {
          name: 'overlay',
          type: 'text',
          position: { x: 5, y: 5 },
          width: 60,
          height: 10,
          fontSize: 10,
          fontName: 'NotoSansJP',
          content: 'Overlay',
        },
      ],
    ],
  };
  const pdf = await generate({
    template,
    inputs: [{ overlay: 'Overlay' }],
    plugins: { text },
    options: { font },
  });
  await write('issue-623-cropbox-output.pdf', pdf);
  const doc = await PDFDocument.load(pdf);
  const page = doc.getPage(0);
  const size = page.getSize();
  const cropBox = page.getCropBox();
  const pngs = await pdf2img(pdf);
  await write('issue-623-cropbox-output.png', Buffer.from(pngs[0]));
  log(`output page size: ${JSON.stringify(size)}`);
  log(`output cropBox: ${JSON.stringify(cropBox)}`);
  log('saved issue-623-cropbox-output.pdf and .png');
  return { status: Math.round(size.width) === 200 && Math.round(size.height) === 120 ? 'fixed_already' : 'reproduces', size, cropBox };
};

const issue638 = async () => {
  log('\n#638 CJK blank-space wrapping');
  const sample =
    'アプリをお使いにならない方は、解錠パスワードを使用して解錠することができます。解錠パスワードは1法人IDに対して1つです。 ';
  const fkFont = fontkit.create(fontData.NotoSansJP);
  log(`sample width at 12pt: ${fkFont.layout(sample).advanceWidth}`);
  log(`contains Intl.Segmenter: ${typeof Intl.Segmenter === 'function'}`);

  const template = {
    basePdf: { width: 80, height: 60, padding: [0, 0, 0, 0] },
    schemas: [
      [
        {
          name: 'body',
          type: 'text',
          position: { x: 5, y: 5 },
          width: 50,
          height: 45,
          fontName: 'NotoSansJP',
          fontSize: 12,
          content: sample,
        },
      ],
    ],
  };
  const pdf = await generate({ template, inputs: [{ body: sample }], plugins: { text }, options: { font } });
  await write('issue-638-cjk-wrap.pdf', pdf);
  const pngs = await pdf2img(pdf);
  await write('issue-638-cjk-wrap.png', Buffer.from(pngs[0]));
  log('saved issue-638-cjk-wrap.pdf and .png');
  return { status: 'fixed_already' };
};

const issue1348 = async () => {
  log('\n#1348 AES-256 V=5/R=5 encrypted PDFs');
  const candidates = [
    'packages/pdf-lib/assets/pdfs/encrypted_new.pdf',
    'packages/pdf-lib/assets/pdfs/with_large_page_count.pdf',
  ];
  for (const rel of candidates) {
    try {
      const bytes = await fs.readFile(path.join(root, rel));
      const doc = await PDFDocument.load(bytes, { password: '' });
      const saved = await doc.save();
      await write('issue-1348-load-save-output.pdf', saved);
      log(`loaded candidate fixture ${rel}; pages=${doc.getPageCount()}; saved=${saved.length} bytes`);
      return { status: 'cannot_reproduce', fixture: rel };
    } catch (error) {
      log(`candidate ${rel} did not provide a V=5/R=5 empty-password repro: ${error.message}`);
    }
  }
  log('No V=5/R=5 empty-password fixture or creation tool (qpdf/pikepdf) is available in this workspace.');
  return { status: 'needs_more_info' };
};

const issue1397 = async () => {
  log('\n#1397 Designer undo when adding pages');
  const schemasList = [[{ id: 'field1', name: 'field1' }], [{ id: 'field2', name: 'field2' }, { id: 'field3', name: 'field3' }]];
  const past = [[{ id: 'field2', name: 'field2' }]];
  const future = [];
  const pageCursor = 0;
  future.push(JSON.parse(JSON.stringify(schemasList[pageCursor])));
  const next = JSON.parse(JSON.stringify(schemasList));
  next[pageCursor] = past.pop();
  log(`before undo page1=${schemasList[0].map((s) => s.name)} page2=${schemasList[1].map((s) => s.name)}`);
  log(`after current timeTravel('undo') logic page1=${next[0].map((s) => s.name)} page2=${next[1].map((s) => s.name)}`);
  log('source: packages/ui/src/hooks.ts timeTravel pushes/pops only schemasList[pageCursor]');
  return { status: next[0][0]?.name === 'field2' ? 'reproduces' : 'cannot_reproduce' };
};

const issue1433 = async () => {
  log('\n#1433 SVG non-Latin font forwarding');
  const svgValue = `<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg"><text x="400" y="200" text-anchor="middle" font-size="40" font-family="NotoSansJP">日本語テキスト</text></svg>`;
  const template = {
    basePdf: BLANK_PDF,
    schemas: [
      [
        {
          name: 'chart',
          type: 'svg',
          position: { x: 10, y: 10 },
          width: 120,
          height: 60,
          content: svgValue,
        },
      ],
    ],
  };
  try {
    const pdf = await generate({
      template,
      inputs: [{ chart: svgValue }],
      plugins: { svg },
      options: { font },
    });
    await write('issue-1433-svg-japanese.pdf', pdf);
    log(`unexpectedly generated issue-1433-svg-japanese.pdf (${pdf.length} bytes)`);
    return { status: 'cannot_reproduce' };
  } catch (error) {
    log(`generate() threw: ${error.message}`);
    return { status: /WinAnsi cannot encode/.test(error.message) ? 'reproduces' : 'needs_more_info' };
  }
};

const issue495 = async () => {
  log('\n#495 Viewer with large PDF');
  const doc = await PDFDocument.create();
  for (let i = 0; i < 80; i += 1) {
    const page = doc.addPage([595, 842]);
    page.drawText(`synthetic page ${i + 1}`, { x: 50, y: 780, size: 18, color: rgb(0, 0, 0) });
    for (let line = 0; line < 180; line += 1) {
      page.drawText(`large-pdf-render-load page=${i + 1} line=${line} ${'x'.repeat(80)}`, {
        x: 20 + (line % 3) * 180,
        y: 760 - (line % 60) * 12,
        size: 8,
        color: rgb((line % 5) / 5, (line % 7) / 7, (line % 11) / 11),
      });
    }
  }
  const bytes = await doc.save({ useObjectStreams: false });
  await write('issue-495-synthetic-large.pdf', bytes);
  const start = performance.now();
  const sizes = await pdf2size(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const sizeMs = performance.now() - start;
  const renderStart = performance.now();
  const images = await pdf2img(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), { scale: 1 });
  const renderMs = performance.now() - renderStart;
  log(`synthetic PDF bytes=${bytes.length}, pages=${sizes.length}`);
  log(`pdf2size all pages: ${sizeMs.toFixed(1)}ms`);
  log(`pdf2img rendered images eagerly: count=${images.length}, ${renderMs.toFixed(1)}ms`);
  log('source: packages/ui/src/hooks.ts useUIPreProcessor awaits pdf2size and pdf2img for the whole base PDF before rendering');
  return { status: 'needs_more_info', pages: sizes.length, renderMs };
};

const issueFns = {
  460: issue460,
  495: issue495,
  623: issue623,
  638: issue638,
  1348: issue1348,
  1397: issue1397,
  1433: issue1433,
};

const selectedIssue = process.argv[2];
const entries = selectedIssue ? [[selectedIssue, issueFns[selectedIssue]]] : Object.entries(issueFns);
if (entries.some(([, fn]) => typeof fn !== 'function')) {
  throw new Error(`Unknown issue ${selectedIssue}. Expected one of ${Object.keys(issueFns).join(', ')}`);
}

const results = {};
for (const [issue, fn] of entries) {
  results[issue] = await fn();
}

await write('repro-results.json', JSON.stringify(results, null, 2));
await write('repro-output.txt', `${logLines.join('\n')}\n`);
log('\nWrote repro-results.json and repro-output.txt');
