import { merge } from '@pdfme/manipulator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const aPdf = fs.readFileSync(path.join(__dirname, 'a.pdf'));
const bPdf = fs.readFileSync(path.join(__dirname, 'b.pdf'));

merge([aPdf, bPdf]).then((pdf) => {
  console.log(pdf);
  fs.writeFileSync(path.join(__dirname, `test-merge.pdf`), pdf);
});
