/**
 * Utility to load UPNG in an ESM-compatible way
 */
let upngModule: any = null;

export async function loadUPNG() {
  if (!upngModule) {
    try {
      // Try dynamic import first (ESM)
      upngModule = await import('@pdf-lib/upng');
      // Handle both default export and named exports
      return upngModule.default || upngModule;
    } catch (e) {
      // Fallback to require (CommonJS)
      try {
        // @ts-ignore
        upngModule = require('@pdf-lib/upng');
        return upngModule;
      } catch (e2) {
        throw new Error(`Failed to load UPNG module: ${e2.message}`);
      }
    }
  }
  return upngModule;
}
