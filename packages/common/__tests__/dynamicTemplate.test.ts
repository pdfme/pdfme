let getDynamicTemplate: any;

beforeAll(async () => {
  const module = await import('../src/dynamicTemplate.js');
  getDynamicTemplate = module.getDynamicTemplate;
});

describe('dynamicTemplate', () => {
  it('should export functions', () => {
    expect(getDynamicTemplate).toBeDefined();
  });
});
