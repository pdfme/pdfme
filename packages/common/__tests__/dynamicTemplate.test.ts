describe('dynamicTemplate', () => {
  it('should export functions', async () => {
    const { getDynamicTemplate } = await import('../src/dynamicTemplate.js');
    expect(getDynamicTemplate).toBeDefined();
  });
});
