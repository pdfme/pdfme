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
      } catch (e2: unknown) {
        const errorMessage = e2 instanceof Error ? e2.message : String(e2);
        throw new Error(`Failed to load UPNG module: ${errorMessage}`);
      }
    }
  }
  return upngModule;
}
