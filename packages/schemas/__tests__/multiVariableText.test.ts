import { substituteVariables, validateVariables } from '../src/multiVariableText/helper';
import { MultiVariableTextSchema } from '../src/multiVariableText/types';


describe('substituteVariables', () => {
  it('should substitute variables in a string', () => {
    const text = 'Hello, {name}!';
    const variables = { name: 'World' };
    const result = substituteVariables(text, variables);
    expect(result).toBe('Hello, World!');
  });

  it('should handle special characters in variable names', () => {
    const text = 'Hello, {na-me}!';
    const variables = { 'na-me': 'World' };
    const result = substituteVariables(text, variables);
    expect(result).toBe('Hello, World!');
  });

  it('should remove variables that were not substituted', () => {
    const text = 'Hello, {name}! Welcome to {place}.';
    const variables = { name: 'World' };
    const result = substituteVariables(text, variables);
    expect(result).toBe('Hello, World! Welcome to .');
  });

  it('should handle empty input strings', () => {
    const text = '';
    const variables = { name: 'World' };
    const result = substituteVariables(text, variables);
    expect(result).toBe('');
  });

  it('should handle empty variables', () => {
    const text = 'Hello, {name}!';
    const variables = {};
    const result = substituteVariables(text, variables);
    expect(result).toBe('Hello, !');
  });

  it('should handle variables as a JSON string', () => {
    const text = 'Hello, {name}!';
    const variables = '{"name": "World"}';
    const result = substituteVariables(text, variables);
    expect(result).toBe('Hello, World!');
  });

  it('should handle invalid JSON string for variables', () => {
    const text = 'Hello, {name}!';
    const variables = 'invalid json';
    expect(() => substituteVariables(text, variables)).toThrow(SyntaxError);
  });
});

describe('validateVariables', () => {
  // @ts-ignore
  const schema: MultiVariableTextSchema = {
    variables: ['var1', 'var2'],
    required: true,
  };

  it('should return true for valid input with all required variables', () => {
    const key = 'testKey';
    const value = JSON.stringify({ var1: 'value1', var2: 'value2' });
    expect(validateVariables(key, value, schema)).toBe(true);
  });

  it('should throw an error for missing required variables', () => {
    const key = 'testKey';
    const value = JSON.stringify({ var1: 'value1' });
    expect(() => validateVariables(key, value, schema)).toThrowError(
      '[@pdfme/generator] variable var2 is missing for field testKey'
    );
  });

  it('should return false for missing non-required variables', () => {
    // @ts-ignore
    const nonRequiredSchema: MultiVariableTextSchema = {
      variables: ['var1', 'var2'],
      required: false,
    };
    const key = 'testKey';
    const value = JSON.stringify({ var1: 'value1' });
    expect(validateVariables(key, value, nonRequiredSchema)).toBe(false);
  });

  it('should throw an error for invalid JSON input', () => {
    const key = 'testKey';
    const value = '{ var1: value1 var2: value2 }'; // Invalid JSON
    expect(() => validateVariables(key, value, schema)).toThrowError(SyntaxError);
  });

  it('should return true for a string with no variables', () => {
    // @ts-ignore
    const readOnlyText: MultiVariableTextSchema = {
      variables: [],
      required: true,
    };
    const key = 'testKey';
    const value = '';
    expect(validateVariables(key, value, readOnlyText)).toBe(true);
  });
});