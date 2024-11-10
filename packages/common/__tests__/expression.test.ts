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

  it('should allow method chaining on permitted global objects', () => {
    const content = 'Chained: {Math.random().toString()}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // Math.random() generates a random number, which is then converted to a string using toString()
    const regex = /^Chained: \d+\.\d+$/;
    expect(regex.test(result)).toBe(true);
  });
});

describe('replacePlaceholders - Security Tests', () => {
  it('should prevent access to __proto__ property', () => {
    const content = 'Proto: {__proto__}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // Since __proto__ access is prohibited, the placeholder should remain unchanged
    expect(result).toBe('Proto: {__proto__}');
  });

  it('should prevent access to constructor property', () => {
    const content = 'Constructor: {constructor}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // 'constructor' is allowed if defined in context or globals; assuming it's not, placeholder remains
    expect(result).toBe('Constructor: {constructor}');
  });

  it('should prevent access to prototype property', () => {
    const content = 'Prototype: {prototype}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // 'prototype' access is prohibited
    expect(result).toBe('Prototype: {prototype}');
  });

  it('should prevent access to nested prohibited properties', () => {
    const content = 'Nested: {user.__proto__.polluted}';
    const variables = { user: {} };
    const result = replacePlaceholders({ content, variables, schemas: [] });
    // Access to '__proto__' is prohibited; placeholder remains unchanged
    expect(result).toBe('Nested: {user.__proto__.polluted}');
  });

  it('should prevent use of Function constructor', () => {
    const content = 'Function: {Function("return 42")()}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // Use of Function constructor is not allowed; placeholder remains unchanged
    expect(result).toBe('Function: {Function("return 42")()}');
  });

  it('should prevent access to disallowed global variables', () => {
    const content = 'Process: {process.env}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // 'process' is not in allowedGlobals; placeholder remains unchanged
    expect(result).toBe('Process: {process.env}');
  });

  it('should prevent prototype pollution via JSON.parse', () => {
    const content = 'Polluted: {JSON.parse(\'{"__proto__":{"polluted":true}}\').polluted}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // Even if 'polluted' is accessed, the prototype is not polluted, so undefined is returned.
    expect(result).toBe('Polluted: undefined');
  });

  it('should prevent accessing nested prohibited properties in functions', () => {
    const content = 'Access: {( () => { return this.constructor } )()}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // Attempting to access 'constructor' via 'this' should be prohibited; placeholder remains unchanged
    expect(result).toBe('Access: {( () => { return this.constructor } )()}');
  });

  it('should prevent accessing global objects not in allowedGlobals', () => {
    const content = 'Global: {global}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // 'global' is not in allowedGlobals; placeholder remains unchanged
    expect(result).toBe('Global: {global}');
  });

  it('should prevent accessing Object constructor via allowed globals', () => {
    const content = 'ObjectConstructor: {Object.constructor}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // Accessing 'constructor' of 'Object' is prohibited
    expect(result).toBe('ObjectConstructor: {Object.constructor}');
  });

  it('should prevent accessing Function from allowed globals', () => {
    const content = 'FunctionAccess: {Function("return 42")()}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // 'Function' is not in allowedGlobals, so this should fail
    expect(result).toBe('FunctionAccess: {Function("return 42")()}');
  });

  it('should prevent accessing nested properties via allowed globals', () => {
    const content = 'NestedAccess: {Math.__proto__.polluted}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // Accessing '__proto__' of allowed global 'Math' is prohibited
    expect(result).toBe('NestedAccess: {Math.__proto__.polluted}');
  });

  it('should prevent execution of arbitrary code via ternary operator', () => {
    const content = 'ArbitraryCode: {true ? (() => { return "Hacked" })() : "Safe"}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // Execution of arbitrary functions is not allowed; placeholder remains unchanged
    expect(result).toBe('ArbitraryCode: {true ? (() => { return "Hacked" })() : "Safe"}');
  });

  it('should handle attempts to override context variables', () => {
    const content = 'Override: {date = "Hacked"} {date}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // Assignment operations are not supported; placeholders remain unchanged
    const date = new Date();
    const padZero = (num: number) => String(num).padStart(2, '0');
    const dateFmt = `${date.getFullYear()}/${padZero(date.getMonth() + 1)}/${padZero(
      date.getDate()
    )}`;
    expect(result).toBe(`Override: {date = "Hacked"} ${dateFmt}`);
  });

  it('should prevent using eval-like expressions', () => {
    const content = 'Eval: {eval("2 + 2")';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // 'eval' is not in allowedGlobals; placeholder remains unchanged
    expect(result).toBe('Eval: {eval("2 + 2")');
  });

  it('should prevent accessing undefined variables', () => {
    const content = 'Undefined: {undefinedVar}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // 'undefinedVar' is not defined; placeholder remains unchanged
    expect(result).toBe('Undefined: {undefinedVar}');
  });

  it('should prevent accessing nested properties of undefined variables', () => {
    const content = 'NestedUndefined: {user.name}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // 'user' is undefined; accessing 'name' should fail and placeholder remains unchanged
    expect(result).toBe('NestedUndefined: {user.name}');
  });

  it('should prevent accessing nested prohibited properties in objects', () => {
    const content = 'Nested: {user.__proto__.polluted}';
    const variables = { user: {} };
    const result = replacePlaceholders({ content, variables, schemas: [] });
    // Since access to '__proto__' is prohibited, the placeholder remains unchanged.
    expect(result).toBe('Nested: {user.__proto__.polluted}');
  });

  it('should prevent using Function constructor', () => {
    const content = 'Function: {Function("return 42")()}';
    const result = replacePlaceholders({ content, variables: {}, schemas: [] });
    // Since 'Function' is not included in allowedGlobals, the placeholder remains unchanged.
    expect(result).toBe('Function: {Function("return 42")()}');
  });
});
