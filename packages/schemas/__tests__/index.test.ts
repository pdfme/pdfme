import { add } from "../src";


describe('add test', () => {
  it('add', () => {
    expect(add(1, 1)).toEqual(2);
  });
});