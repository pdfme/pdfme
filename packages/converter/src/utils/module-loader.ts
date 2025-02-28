/**
 * Utility to load modules in an ESM-compatible way
 */

/**
 * Dynamically loads a module in an ESM-compatible way
 * Falls back to CommonJS require if dynamic import fails
 */
export async function loadModule(modulePath: string) {
  try {
    // Try dynamic import first (ESM)
    const module = await import(modulePath);
    // Handle both default export and named exports
    return module.default || module;
  } catch (e) {
    // Fallback to require (CommonJS)
    try {
      // @ts-ignore
      const module = require(modulePath);
      return module;
    } catch (e2: unknown) {
      // Properly type the error
      const errorMessage = e2 instanceof Error ? e2.message : String(e2);
      throw new Error(`Failed to load module ${modulePath}: ${errorMessage}`);
    }
  }
}

/**
 * Loads PDF.js library in an ESM-compatible way
 */
export async function loadPdfJs(isNode = false) {
  const path = isNode 
    ? 'pdfjs-dist/legacy/build/pdf.js'
    : 'pdfjs-dist';
  
  return loadModule(path);
}

/**
 * Loads PDF.js worker in an ESM-compatible way
 */
export async function loadPdfJsWorker(isNode = false) {
  const path = isNode
    ? 'pdfjs-dist/build/pdf.worker.entry.js'
    : 'pdfjs-dist/legacy/build/pdf.worker.js';
  
  return loadModule(path);
}

/**
 * Loads UPNG module in an ESM-compatible way
 */
export async function loadUPNG() {
  return loadModule('@pdf-lib/upng');
}
