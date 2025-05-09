import { getDefaultFont } from '@pdfme/common';
import { pdf2img } from '@pdfme/converter';
import { generate } from '@pdfme/generator';
import { merge } from '@pdfme/manipulator';
import { text } from '@pdfme/schemas';
import { uuid } from '@pdfme/ui';

console.log('Testing ESM imports:');
console.log('- @pdfme/common:', getDefaultFont ? 'Available' : 'Not available');
console.log('- @pdfme/converter:', pdf2img ? 'Available' : 'Not available');
console.log('- @pdfme/generator:', generate ? 'Available' : 'Not available');
console.log('- @pdfme/manipulator:', merge ? 'Available' : 'Not available');
console.log('- @pdfme/schemas:', text ? 'Available' : 'Not available');
console.log('- @pdfme/ui:', uuid ? 'Available' : 'Not available');
console.log('All imports successful!');
