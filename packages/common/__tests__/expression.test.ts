import { replacePlaceholders } from '../src/expression';
import { SchemaPageArray } from '../src';

describe('replacePlaceholders', () => {
  it('should return content as is if there are no placeholders', () => {
    const content = 'Hello, world!';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    expect(result).toBe(content);
  });

  it('should replace placeholders with variables', () => {
    const content = 'Hello, {name}!';
    const variables = { name: 'Alice' };
    const result = replacePlaceholders({ content, variables, schemas: [] });
    expect(result).toBe('Hello, Alice!');
  });

  it('should evaluate expressions within placeholders', () => {
    const content = 'The sum is {1 + 2}.';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    expect(result).toBe('The sum is 3.');
  });

  it('should handle date and dateTime placeholders', () => {
    const content = 'Today is {date} and now is {dateTime}.';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
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
    const result = replacePlaceholders({ content, variables, schemas });
    expect(result).toBe('Schema content: SchemaName');
  });

  it('should prioritize variables over schemas', () => {
    const content = 'Name: {name}';
    const variables = { name: 'VariableName' };
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
    const result = replacePlaceholders({ content, variables, schemas });
    expect(result).toBe('Name: VariableName');
  });

  it('should handle nested placeholders in variables', () => {
    const content = 'Nested variable: {greeting}';
    const variables = { greeting: 'Hello, {name}!' };
    const schemas = [
      [
        {
          name: 'name',
          type: 'text',
          content: 'Bob',
          readOnly: true,
        },
      ],
    ] as SchemaPageArray;
    const result = replacePlaceholders({ content, variables, schemas });
    expect(result).toBe('Nested variable: Hello, Bob!');
  });

  it('should return content unchanged when placeholders are invalid', () => {
    const content = 'Invalid placeholder: {name';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    expect(result).toBe('Invalid placeholder: {name');
  });

  it('should evaluate expressions even if they result in Infinity', () => {
    const content = 'Divide by zero: {1 / 0}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    expect(result).toBe('Divide by zero: Infinity');
  });

  it('should handle complex expressions', () => {
    const content = 'Result: {Math.max(1, 2, 3)}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    expect(result).toBe('Result: 3');
  });

  it('should parse JSON strings in variables', () => {
    const content = 'Data: {data.value}';
    const variables = { data: '{"value": "42"}' };
    const result = replacePlaceholders({ content, variables, schemas: [] });
    expect(result).toBe('Data: 42');
  });

  it('should handle variables of different types', () => {
    const content = 'Number: {num}, Boolean: {bool}, Array: {arr[0]}, Object: {obj.key}';
    const variables = {
      num: 42,
      bool: true,
      arr: ['first', 'second'],
      obj: { key: 'value' },
    };
    const result = replacePlaceholders({ content, variables, schemas: [] });
    expect(result).toBe('Number: 42, Boolean: true, Array: first, Object: value');
  });

  it('should use content from readOnly schemas', () => {
    const content = 'Content: {readOnlyField}';
    const variables = {};
    const schemas = [
      [
        {
          name: 'readOnlyField',
          type: 'text',
          content: 'ReadOnlyContent',
          readOnly: true,
        },
      ],
    ] as SchemaPageArray;
    const result = replacePlaceholders({ content, variables, schemas });
    expect(result).toBe('Content: ReadOnlyContent');
  });

  it('should use empty string for non-readOnly schema content', () => {
    const content = 'Content: {editableField}';
    const variables = {};
    const schemas = [
      [
        {
          name: 'editableField',
          type: 'text',
          content: 'Should not be used',
          readOnly: false,
        },
      ],
    ] as SchemaPageArray;
    const result = replacePlaceholders({ content, variables, schemas });
    expect(result).toBe('Content: ');
  });
});
