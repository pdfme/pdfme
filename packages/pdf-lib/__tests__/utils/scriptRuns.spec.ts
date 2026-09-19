import { splitTextIntoShapingRuns } from '../../src/utils';

const CASES: Array<[string, string[]]> = [
  ['', []],
  ['Hello world!', ['Hello world!']],
  ['วันที่', ['วันที่']],
  ['A วันที่', ['A ', 'วันที่']],
  ['1 วันที่', ['1 วันที่']],
  ['วันที่ ABC', ['วันที่ ', 'ABC']],
  ['A น้ำ', ['A ', 'น้ำ']],
  ['日 วันที่', ['日 ', 'วันที่']],
  ['日本語のテスト', ['日本語のテスト']],
  ['Invoice 請求書 2024年1月', ['Invoice 請求書 2024年1月']],
  ['วันe\u0301', ['วัน', 'e\u0301']],
  ['฿100 วันที่', ['฿100 วันที่']],
  ['👍 วันที่', ['👍 วันที่']],
  ['   ', ['   ']],
  ['ວັນ', ['ວັນ']],
  ['A ວັນ', ['A ', 'ວັນ']],
];

describe(`splitTextIntoShapingRuns`, () => {
  it.each(CASES)(`splits %j into %j`, (input, expected) => {
    expect(splitTextIntoShapingRuns(input)).toEqual(expected);
  });

  it(`always concatenates back to the input`, () => {
    for (const [input] of CASES) {
      expect(splitTextIntoShapingRuns(input).join('')).toBe(input);
    }
  });
});
