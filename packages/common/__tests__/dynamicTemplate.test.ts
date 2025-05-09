import * as commonModule from '../src/index.js';

describe('dynamicTemplate', () => {
  it('should export functions', () => {
    expect(commonModule.getDynamicTemplate).toBeDefined();
  });
});
