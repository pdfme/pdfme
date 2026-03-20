import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { merge } from '@pdfme/manipulator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const aPdf = fs.readFileSync(path.join(__dirname, 'a.pdf'));
const bPdf = fs.readFileSync(path.join(__dirname, 'b.pdf'));

const pdf = await merge([aPdf, bPdf]);
console.log(pdf);
fs.writeFileSync(path.join(__dirname, 'test-merge.pdf'), pdf);
