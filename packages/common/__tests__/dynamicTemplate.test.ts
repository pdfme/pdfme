import * as common from '../src/index.js';

describe('dynamicTemplate', () => {
  it('should export functions', () => {
    expect(common.getDynamicTemplate).toBeDefined();
  });
});
