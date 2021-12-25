import { checkInputs } from '../../src/libs/generator';

describe.only('checkInputs test', () => {
  test('valid', () => {
    const inputs = [{ a: 'test' }];
    expect(checkInputs(inputs)).toBeUndefined();
  });
  test('invalid', () => {
    try {
      const inputs = [] as { [key: string]: string }[];
      checkInputs(inputs);
      fail();
    } catch (e: any) {
      expect(e.message).toBe('inputs should be more than one length');
    }
  });
});
