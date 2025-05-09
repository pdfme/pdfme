describe('helper', () => {
  it('should export functions', async () => {
    const helperModule = await import('../src/index.js');
    
    expect(helperModule.cloneDeep).toBeDefined();
    expect(helperModule.getFallbackFontName).toBeDefined();
    expect(helperModule.getDefaultFont).toBeDefined();
    expect(helperModule.mm2pt).toBeDefined();
    expect(helperModule.pt2mm).toBeDefined();
    expect(helperModule.pt2px).toBeDefined();
    expect(helperModule.px2mm).toBeDefined();
    expect(helperModule.isHexValid).toBeDefined();
    expect(helperModule.getInputFromTemplate).toBeDefined();
    expect(helperModule.getB64BasePdf).toBeDefined();
    expect(helperModule.isBlankPdf).toBeDefined();
    expect(helperModule.b64toUint8Array).toBeDefined();
    expect(helperModule.checkFont).toBeDefined();
    expect(helperModule.checkInputs).toBeDefined();
    expect(helperModule.checkUIOptions).toBeDefined();
    expect(helperModule.checkPreviewProps).toBeDefined();
    expect(helperModule.checkDesignerProps).toBeDefined();
    expect(helperModule.checkUIProps).toBeDefined();
    expect(helperModule.checkTemplate).toBeDefined();
    expect(helperModule.checkGenerateProps).toBeDefined();
  });
});
