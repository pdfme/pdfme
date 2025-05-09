import type { SchemaPageArray } from '../src/types.js';
import * as common from '../src/index.js';

describe.skip('replacePlaceholders', () => {
  it('should return content as is if there are no placeholders', () => {
    const content = 'Hello, world!';
    const result = common.replacePlaceholders({ content, variables: {}, schemas: [] });
    expect(result).toBe(content);
  });

  it('should replace placeholders with variables', () => {
    const content = 'Hello, {name}!';
    const variables = { name: 'Alice' };
    const result = common.replacePlaceholders({ content, variables, schemas: [] });
    expect(result).toBe('Hello, Alice!');
  });

  it('should evaluate expressions within placeholders', () => {
    const content = 'The sum is {1 + 2}.';
    const result = common.replacePlaceholders({ content, variables: {}, schemas: [] });
    expect(result).toBe('The sum is 3.');
  });

  it('should handle date and dateTime placeholders', () => {
    const content = 'Today is {date} and now is {dateTime}.';
    const result = common.replacePlaceholders({ content, variables: {}, schemas: [] });
    const date = new Date();
    const padZero = (num: number) => String(num).padStart(2, '0');
    const formattedDate = `${date.getFullYear()}/${padZero(date.getMonth() + 1)}/${padZero(
      date.getDate()
    )}`;
    const formattedDateTime = `${formattedDate} ${padZero(date.getHours())}:${padZero(
      date.getMinutes()
    )}`;
    expect(result).toBe(`Today is ${formattedDate} and now is ${formattedDateTime}.`);
  });

  it('should handle data from schemas', () => {
    const content = 'Schema content: {name}';
    const variables = {};
    const schemas = [
      [
        {
          name: 'name',
          type: 'text',
          content: 'SchemaName',
          readOnly: true,
        },
      ],
    ] as SchemaPageArray;
    const result = common.replacePlaceholders({ content, variables, schemas });
    expect(result).toBe('Schema content: SchemaName');
  });
});
