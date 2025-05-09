import * as common from '../src/index.js';

describe.skip('helper', () => {
  it('should export functions', () => {
    expect(common.cloneDeep).toBeDefined();
    expect(common.getFallbackFontName).toBeDefined();
    expect(common.getDefaultFont).toBeDefined();
    expect(common.mm2pt).toBeDefined();
    expect(common.pt2mm).toBeDefined();
    expect(common.pt2px).toBeDefined();
    expect(common.px2mm).toBeDefined();
    expect(common.isHexValid).toBeDefined();
    expect(common.getInputFromTemplate).toBeDefined();
    expect(common.getB64BasePdf).toBeDefined();
    expect(common.isBlankPdf).toBeDefined();
    expect(common.b64toUint8Array).toBeDefined();
    expect(common.checkFont).toBeDefined();
    expect(common.checkInputs).toBeDefined();
    expect(common.checkUIOptions).toBeDefined();
    expect(common.checkPreviewProps).toBeDefined();
    expect(common.checkDesignerProps).toBeDefined();
    expect(common.checkUIProps).toBeDefined();
    expect(common.checkTemplate).toBeDefined();
    expect(common.checkGenerateProps).toBeDefined();
  });
});
