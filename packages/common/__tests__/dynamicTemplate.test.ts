import * as common from '../src/index.js';

describe.skip('dynamicTemplate', () => {
  it('should export functions', () => {
    expect(common.getDynamicTemplate).toBeDefined();
  });
});
