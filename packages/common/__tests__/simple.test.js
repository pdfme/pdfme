import * as common from '../dist/esm/src/index.js';

describe('Simple test', () => {
  it('should import functions from compiled output', () => {
    expect(common).toBeDefined();
    expect(typeof common).toBe('object');
    console.log('Available exports:', Object.keys(common));
  });
});
