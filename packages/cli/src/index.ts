import { defineCommand, runMain } from 'citty';
import generateCmd from './commands/generate.js';
import validateCmd from './commands/validate.js';
import pdf2imgCmd from './commands/pdf2img.js';
import pdf2sizeCmd from './commands/pdf2size.js';
import examplesCmd from './commands/examples.js';

const main = defineCommand({
  meta: {
    name: 'pdfme',
    version: '0.0.0',
    description: 'CLI tool for pdfme - generate PDFs, convert images, validate templates',
  },
  subCommands: {
    generate: generateCmd,
    validate: validateCmd,
    pdf2img: pdf2imgCmd,
    pdf2size: pdf2sizeCmd,
    examples: examplesCmd,
  },
});

runMain(main);
