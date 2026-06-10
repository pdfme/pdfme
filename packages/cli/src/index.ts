import { defineCommand, runMain } from 'citty';
import generateCmd from './commands/generate.js';
import validateCmd from './commands/validate.js';
import pdf2imgCmd from './commands/pdf2img.js';
import pdf2sizeCmd from './commands/pdf2size.js';
import doctorCmd from './commands/doctor.js';
import { CLI_VERSION } from './version.js';

const main = defineCommand({
  meta: {
    name: 'pdfme',
    version: CLI_VERSION,
    description: 'CLI tool for pdfme - generate PDFs, convert images, validate templates',
  },
  subCommands: {
    generate: generateCmd,
    validate: validateCmd,
    pdf2img: pdf2imgCmd,
    pdf2size: pdf2sizeCmd,
    doctor: doctorCmd,
  },
});

runMain(main);
