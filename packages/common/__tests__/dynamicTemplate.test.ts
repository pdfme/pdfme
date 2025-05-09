import { getDynamicTemplate } from '../dist/esm/src/dynamicTemplate.js';

describe('dynamicTemplate', () => {
  it('should export functions', () => {
    expect(getDynamicTemplate).toBeDefined();
  });
});
