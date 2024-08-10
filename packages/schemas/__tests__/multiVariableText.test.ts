import { substituteVariables } from '../src/multiVariableText/helper';

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