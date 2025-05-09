import * as dynamicTemplateModule from '../src/dynamicTemplate.js';

const { getDynamicTemplate } = dynamicTemplateModule;

describe('dynamicTemplate', () => {
  it('should export functions', () => {
    expect(getDynamicTemplate).toBeDefined();
  });
});
