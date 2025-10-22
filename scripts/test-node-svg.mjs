import fs from 'fs';
import path from 'path';

import { generate } from '@pdfme/generator';
import { getDefaultFont } from '@pdfme/common';
import { barcodes } from '@pdfme/schemas';

const outPath = path.resolve(process.cwd(), 'out-node-svg.pdf');

const BLANK_PDF = 'data:application/pdf;base64,JVBERi0xLjcNJeLjz9MNCjYgMCBvYmoNPDwvTGluZWFyaXplZCAxL0wgMTg0NC9PIDgvRSAxMTEwL04gMi9UIDE1NzAvSCBbIDQyMyAxMzFdPj4NZW5kb2JqDSAgICAgICAgICAgICAgICAgICAgICAgDQoxMSAwIG9iag08PC9EZWNvZGVQYXJtczw8L0NvbHVtbnMgMy9QcmVkaWN0b3IgMTI+Pi9GaWx0ZXIvRmxhdGVEZWNvZGUvSURbPEJBMTk5MUY0MThCN0IyMTEwQTAwNjc0NThCNkJDNjIzPjxGOEE4OEZEMzMzNjQ2OTQ2QkE1ODMzM0M4MEFEMDFFNj5dL0luZGV4WzYgN10vTGVuZ3RoIDM2L1ByZXYgMTU3MS9Sb290IDcgMCBSL1NpemUgMTMvVHlwZS9YUmVmL1dbMSAyIDBdPj5zdHJlYW0NCmjeYmJkEGBiYJJiYmDQZWJgvA+k45gY/j4Aso0BAgwAISQDuA0KZW5kc3RyZWFtDWVuZG9iag1zdGFydHhyZWYNCjANCiUlRU9GDQogICAgICAgIA0KMTIgMCBvYmoNPDwvRmlsdGVyL0ZsYXRlRGVjb2RlL0xlbmd0aCA1Ny9TIDQ0Pj5zdHJlYW0NCmjeYmBgYGJgYLzCwAgkbRk4GBCAAyjGxMDCwNFwiOGAQvkhJCkGZihmYIhj4GhkSGEACDAAvy4F4g0KZW5kc3RyZWFtDWVuZG9iag03IDAgb2JqDTw8L1BhZ2VzIDUgMCBSL1R5cGUvQ2F0YWxvZz4+DWVuZG9iag04IDAgb2JqDTw8L0Fubm90c1tdL0JsZWVkQm94WzAgMCA1OTUuNDQgODQxLjkyXS9Db250ZW50cyA5IDAgUi9Dcm9wQm94WzAgMCA1OTUuNDQgODQxLjkyXS9NZWRpYUJveFswIDAgNTk1LjQ0IDg0MS45Ml0vUGFyZW50IDUgMCBSL1Jlc291cmNlczw8L1hPYmplY3Q8PC9GbTAgMTAgMCBSPj4+Pi9Sb3RhdGUgMC9UcmltQm94WzAgMCA1OTUuNDQgODQxLjkyXS9UeXBlL1BhZ2U+Pg1lbmRvYmoNOSAwIG9iag08PC9GaWx0ZXIvRmxhdGVEZWNvZGUvTGVuZ3RoIDI2Pj5zdHJlYW0NCkiJKlQwUAjx0XfLNVBwyVcIVAAIMAAiagP4DQplbmRzdHJlYW0NZW5kb2JqDTEwIDAgb2JqDTw8L0JCb3hbMzI3NjguMCAzMjc2OC4wIC0zMjc2OC4wIC0zMjc2OC4wXS9GaWx0ZXIvRmxhdGVEZWNvZGUvRm9ybVR5cGUgMS9MZW5ndGggMTQvTWF0cml4WzEgMCAwIDEgMCAwXS9SZXNvdXJjZXM8PD4+L1N1YnR5cGUvRm9ybS9UeXBlL1hPYmplY3Q+PnN0cmVhbQ0KSIkq5ArkAggwAAKSANcNCmVuZHN0cmVhbQ1lbmRvYmoNMSAwIG9iag08PC9Bbm5vdHNbXS9CbGVlZEJveFswIDAgNTk1LjQ0IDg0MS45Ml0vQ29udGVudHMgMiAwIFIvQ3JvcEJveFswIDAgNTk1LjQ0IDg0MS45Ml0vTWVkaWFCb3hbMCAwIDU5NS40NCA4NDEuOTJdL1BhcmVudCA1IDAgUi9SZXNvdXJjZXM8PC9YT2JqZWN0PDwvRm0wIDEwIDAgUj4+Pj4vUm90YXRlIDAvVHJpbUJveFswIDAgNTk1LjQ0IDg0MS45Ml0vVHlwZS9QYWdlPj4NZW5kb2JqDTIgMCBvYmoNPDwvRmlsdGVyL0ZsYXRlRGVjb2RlL0xlbmd0aCAyNj4+c3RyZWFtDQpIiSpUMFAI8dF3yzVQcMlXCFQACDAAImoD+A0KZW5kc3RyZWFtDWVuZG9iag0zIDAgb2JqDTw8L0ZpbHRlci9GbGF0ZURlY29kZS9GaXJzdCA0L0xlbmd0aCA1Mi9OIDEvVHlwZS9PYmpTdG0+PnN0cmVhbQ0KaN4yVTBQsLHRd84vzStRMNL3zkwpjrYAigUpGILIWP2QyoJU/YDE9NRiOzuAAAMAETgMkw0KZW5kc3RyZWFtDWVuZG9iag00IDAgb2JqDTw8L0RlY29kZVBhcm1zPDwvQ29sdW1ucyAzL1ByZWRpY3RvciAxMj4+L0ZpbHRlci9GbGF0ZURlY29kZS9JRFs8QkExOTkxRjQxOEI3QjIxMTBBMDA2NzQ1OEI2QkM2MjM+PEY4QTg4RkQzMzM2NDY5NDZCQTU4MzMzQzgwQUQwMUU2Pl0vTGVuZ3RoIDMzL1Jvb3QgNyAwIFIvU2l6ZSA2L1R5cGUvWFJlZi9XWzEgMiAwXT4+c3RyZWFtDQpo3mJiYGBgYmQJY2JgvM/EwBAHpCcwMf56ABBgABstBBINCmVuZHN0cmVhbQ1lbmRvYmoNc3RhcnR4cmVmDQoxMTYNCiUlRU9GDQo=';

const template = {
  basePdf: BLANK_PDF,
  schemas: [
    [
      {
        name: 'itf',
        type: 'itf',
        content: '',
        position: { x: 10, y: 10 },
        width: 80,
        height: 20,
        backgroundColor: '#ffffff',
        barColor: '#000000',
        includetext: true,
        format: 'svg',
        textxalign: 'center',
      },
      {
        name: 'qrcode',
        type: 'qrcode',
        content: '',
        position: { x: 10, y: 40 },
        width: 30,
        height: 30,
        backgroundColor: '#ffffff',
        barColor: '#000000',
        format: 'svg',
        eclevel: 'H',
      },
    ],
  ],
};

const run = async () => {
  const pdf = await generate({
    template,
    inputs: [{ itf: '00123456789012345678901234567890123456789012', qrcode: 'https://example.com' }],
    options: { font: getDefaultFont() },
    plugins: { ...barcodes },
  });

  fs.writeFileSync(outPath, Buffer.from(pdf.buffer));
  console.log(`Wrote ${outPath}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});


