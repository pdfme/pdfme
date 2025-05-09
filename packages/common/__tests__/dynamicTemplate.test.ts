describe('dynamicTemplate', () => {
  it('should export functions', async () => {
    const { getDynamicTemplate } = await import('../src/index.js');
    expect(getDynamicTemplate).toBeDefined();
  });
});
