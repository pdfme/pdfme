import { 
  cloneDeep,
  getFallbackFontName,
  getDefaultFont,
  mm2pt,
  pt2mm,
  pt2px,
  px2mm,
  isHexValid,
  migrateTemplate,
  getInputFromTemplate,
  getB64BasePdf,
  isBlankPdf,
  b64toUint8Array,
  checkFont,
  checkPlugins,
  checkInputs,
  checkUIOptions,
  checkPreviewProps,
  checkDesignerProps,
  checkUIProps,
  checkTemplate,
  checkGenerateProps
} from '../src/helper.js';

describe('helper', () => {
  it('should export functions', () => {
    expect(cloneDeep).toBeDefined();
    expect(getFallbackFontName).toBeDefined();
    expect(getDefaultFont).toBeDefined();
    expect(mm2pt).toBeDefined();
    expect(pt2mm).toBeDefined();
    expect(pt2px).toBeDefined();
    expect(px2mm).toBeDefined();
    expect(isHexValid).toBeDefined();
    expect(migrateTemplate).toBeDefined();
    expect(getInputFromTemplate).toBeDefined();
    expect(getB64BasePdf).toBeDefined();
    expect(isBlankPdf).toBeDefined();
    expect(b64toUint8Array).toBeDefined();
    expect(checkFont).toBeDefined();
    expect(checkPlugins).toBeDefined();
    expect(checkInputs).toBeDefined();
    expect(checkUIOptions).toBeDefined();
    expect(checkPreviewProps).toBeDefined();
    expect(checkDesignerProps).toBeDefined();
    expect(checkUIProps).toBeDefined();
    expect(checkTemplate).toBeDefined();
    expect(checkGenerateProps).toBeDefined();
  });
});
