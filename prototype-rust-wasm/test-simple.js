#!/usr/bin/env node

const { generate } = require('./pkg-node/pdfme_core.js');
const fs = require('fs');

console.log('Testing Rust + Wasm PDF generation...\n');

const template = {
  basePdf: {
    width: 210,
    height: 297
  },
  schemas: [[
    {
      name: "name",
      type: "text",
      position: { x: 20, y: 20 },
      width: 100,
      height: 10
    }
  ]]
};

const inputs = [
  {
    name: "John Doe"
  }
];

try {
  console.log('Calling generate...');
  const pdfBytes = generate(
    JSON.stringify(template),
    JSON.stringify(inputs)
  );

  console.log('PDF generated!');
  console.log('PDF size:', pdfBytes.length, 'bytes');

  fs.writeFileSync('output-test.pdf', Buffer.from(pdfBytes));
  console.log('✅ PDF saved to output-test.pdf');

} catch (error) {
  console.error('❌ Error:', error);
  console.error('Stack:', error.stack);
}
