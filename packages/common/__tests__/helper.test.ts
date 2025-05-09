import * as commonModule from '../src/index.js';

describe('helper', () => {
  it('should export functions', () => {
    expect(commonModule.cloneDeep).toBeDefined();
    expect(commonModule.getFallbackFontName).toBeDefined();
    expect(commonModule.getDefaultFont).toBeDefined();
    expect(commonModule.mm2pt).toBeDefined();
    expect(commonModule.pt2mm).toBeDefined();
    expect(commonModule.pt2px).toBeDefined();
    expect(commonModule.px2mm).toBeDefined();
    expect(commonModule.isHexValid).toBeDefined();
    expect(commonModule.getInputFromTemplate).toBeDefined();
    expect(commonModule.getB64BasePdf).toBeDefined();
    expect(commonModule.isBlankPdf).toBeDefined();
    expect(commonModule.b64toUint8Array).toBeDefined();
    expect(commonModule.checkFont).toBeDefined();
    expect(commonModule.checkInputs).toBeDefined();
    expect(commonModule.checkUIOptions).toBeDefined();
    expect(commonModule.checkPreviewProps).toBeDefined();
    expect(commonModule.checkDesignerProps).toBeDefined();
    expect(commonModule.checkUIProps).toBeDefined();
    expect(commonModule.checkTemplate).toBeDefined();
    expect(commonModule.checkGenerateProps).toBeDefined();
  });
});
