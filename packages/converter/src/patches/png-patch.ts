/**
 * Patch for PNG handling in pdf-lib to fix ESM import issues
 */
import { loadUPNG } from '../utils/upng-loader.js';

export async function patchPngLib() {
  try {
    // Get the original PNG module from pdf-lib
    const pdfLibPngPath = require.resolve('@pdfme/pdf-lib/es/utils/png');
    const fs = await import('fs');
    
    // Read the original file
    const originalContent = fs.readFileSync(pdfLibPngPath, 'utf8');
    
    // Check if already patched
    if (originalContent.includes('loadUPNG')) {
      return;
    }
    
    // Create patched content
    const patchedContent = originalContent
      .replace(
        "import UPNG from '@pdf-lib/upng';", 
        `// Modified by pdfme ESM patch
// Original: import UPNG from '@pdf-lib/upng';
let UPNG;
(async () => {
  try {
    UPNG = await import('@pdf-lib/upng').then(m => m.default || m);
  } catch (e) {
    try {
      UPNG = require('@pdf-lib/upng');
    } catch (e2) {
      console.error('Failed to load UPNG module:', e2);
    }
  }
})();`
      );
    
    // Write the patched file
    fs.writeFileSync(pdfLibPngPath, patchedContent, 'utf8');
    console.log('Successfully patched PNG module in pdf-lib');
  } catch (error) {
    console.error('Failed to patch PNG module:', error);
  }
}
