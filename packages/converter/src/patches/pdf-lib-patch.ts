/**
 * Patch for pdf-lib to fix ESM import issues
 */
import { loadUPNG } from '../utils/module-loader.js';

// Create a patched version of the PNG class that uses our module loader
export class PatchedPNG {
  static async patchPdfLib() {
    try {
      // Load UPNG module
      const UPNG = await loadUPNG();
      
      // Make UPNG available globally for pdf-lib
      if (typeof window !== 'undefined') {
        // Browser environment
        (window as any).UPNG = UPNG;
      } else {
        // Node environment
        (global as any).UPNG = UPNG;
      }
      
      console.log('Successfully patched PDF-lib with UPNG module');
      return true;
    } catch (error) {
      console.error('Failed to patch PDF-lib:', error);
      return false;
    }
  }
}
