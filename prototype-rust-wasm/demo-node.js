#!/usr/bin/env node

/**
 * PDFme Rust + Wasm - Node.js Demo
 *
 * Shows how to use the Wasm module in Node.js for server-side PDF generation
 */

const fs = require('fs');
const path = require('path');

// Import the Wasm module
const { generate } = require('./pkg-node/pdfme_core.js');

console.log('🦀 PDFme Rust + Wasm - Node.js Demo\n');

// Template definition (same as browser)
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
    },
    {
      name: "email",
      type: "text",
      position: { x: 20, y: 40 },
      width: 150,
      height: 10
    },
    {
      name: "company",
      type: "text",
      position: { x: 20, y: 60 },
      width: 150,
      height: 10
    },
    {
      name: "title",
      type: "text",
      position: { x: 20, y: 80 },
      width: 170,
      height: 15,
      content: "Invoice - Powered by Rust + Wasm"
    }
  ]]
};

// Input data
const inputs = [
  {
    name: "John Doe",
    email: "john@example.com",
    company: "Acme Corp"
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    company: "Tech Solutions"
  },
  {
    name: "Bob Johnson",
    email: "bob@example.com",
    company: "Digital Innovations"
  }
];

async function main() {
  try {
    console.log('📝 Template:', JSON.stringify(template, null, 2).substring(0, 100) + '...');
    console.log(`📊 Generating PDF for ${inputs.length} records...\n`);

    // Benchmark
    const iterations = 100;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      const pdfBytes = generate(
        JSON.stringify(template),
        JSON.stringify(inputs)
      );
      const end = Date.now();
      times.push(end - start);

      if (i === 0) {
        // Save first iteration
        const outputPath = path.join(__dirname, 'output-node.pdf');
        fs.writeFileSync(outputPath, Buffer.from(pdfBytes));
        console.log(`✅ PDF saved to: ${outputPath}`);
        console.log(`📦 PDF size: ${formatBytes(pdfBytes.length)}\n`);
      }
    }

    // Calculate statistics
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];

    console.log(`⚡ Benchmark Results (${iterations} iterations):`);
    console.log(`   Average: ${avg.toFixed(2)}ms`);
    console.log(`   Median:  ${median.toFixed(2)}ms`);
    console.log(`   Min:     ${min.toFixed(2)}ms`);
    console.log(`   Max:     ${max.toFixed(2)}ms`);

    // Compare with existing TypeScript version
    console.log('\n🔄 Comparison with TypeScript version:');
    console.log('   Current TS (@pdfme/generator): ~50-100ms (estimate)');
    console.log(`   Rust + Wasm: ${avg.toFixed(2)}ms`);
    console.log(`   Improvement: ~${((100 / avg) * 50).toFixed(0)}% faster (if TS is 50ms)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

main();
