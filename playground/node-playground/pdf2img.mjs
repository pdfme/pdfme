import { pdf2img } from '@pdfme/converter';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfPath = path.join(__dirname, 'b.pdf');
const pdfBuffer = fs.readFileSync(pdfPath);
const pdfUint8Array = new Uint8Array(pdfBuffer);


pdf2img(pdfUint8Array)
  .then((images) => {
    console.log(`PDF has been converted to ${images.length} images`);
    
    images.forEach((imageBuffer, index) => {
      const outputPath = path.join(__dirname, `output-page-${index + 1}.png`);
      fs.writeFileSync(outputPath, Buffer.from(imageBuffer));
      console.log(`Page ${index + 1} saved: ${outputPath}`);
    });
  })
  .catch((error) => {
    console.error('PDF conversion error:', error);
  });
