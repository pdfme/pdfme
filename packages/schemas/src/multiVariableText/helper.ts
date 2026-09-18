import { MultiVariableTextSchema } from './types.js';
import { escapeInlineMarkdown } from '../text/inlineMarkdown.js';
import { isInlineMarkdownTextSchema } from '../text/richText.js';

export const tryParseVariableMap = (
  variablesIn: string | Record<string, string> | undefined,
): Record<string, string> | undefined => {
  if (!variablesIn) {
    return undefined;
  }
  if (typeof variablesIn === 'object' && !Array.isArray(variablesIn)) {
    return variablesIn;
  }
  if (typeof variablesIn !== 'string') {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(variablesIn);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // Designer content is variable JSON; jsx readOnly content is already plaintext.
  }
  return undefined;
};

/** Designer variable JSON uses exactly the schema's variable names as keys. */
export const isDesignerVariableMap = (
  variables: Record<string, string>,
  expectedNames: string[],
): boolean => {
  if (expectedNames.length === 0) {
    return false;
  }
  const keys = Object.keys(variables);
  if (keys.length !== expectedNames.length) {
    return false;
  }
  return expectedNames.every((name) => Object.prototype.hasOwnProperty.call(variables, name));
};

const readDesignerVariableMap = (
  source: string | Record<string, string> | undefined,
  expectedNames: string[],
): Record<string, string> | undefined => {
  const parsed = tryParseVariableMap(source);
  if (!parsed || !isDesignerVariableMap(parsed, expectedNames)) {
    return undefined;
  }
  return parsed;
};

const isJsonObjectSnapshot = (source: string | undefined): boolean => {
  if (!source) {
    return false;
  }
  return tryParseVariableMap(source) !== undefined;
};

export const substituteVariables = (
  text: string,
  variablesIn: string | Record<string, string>,
  valueMapper: (value: string, variableName: string) => string = (value) => value,
): string => {
  if (!text) {
    return '';
  }

  let substitutedText = text;

  if (variablesIn) {
    let variables: Record<string, string>;
    try {
      variables =
        typeof variablesIn === 'string'
          ? (JSON.parse(variablesIn || '{}') as Record<string, string>)
          : variablesIn;
    } catch {
      throw new SyntaxError(`[@pdfme/schemas] MVT: invalid JSON string '${variablesIn as string}'`);
    }

    Object.keys(variables).forEach((variableName) => {
      // handle special characters in variable name
      const variableForRegex = variableName.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp('\\{' + variableForRegex + '\\}', 'g');
      substitutedText = substitutedText.replace(
        regex,
        valueMapper(variables[variableName], variableName),
      );
    });
  }

  // Remove any variables that were not substituted from inputs
  substitutedText = substitutedText.replace(/{[^{}]+}/g, '');

  return substitutedText;
};

export const substituteVariablesAsInlineMarkdownLiterals = (
  text: string,
  variablesIn: string | Record<string, string>,
): string => substituteVariables(text, variablesIn, escapeInlineMarkdown);

/**
 * Resolve a read-only MVT field to display text.
 * Designer templates store variable JSON in `content` (keys == schema.variables).
 * jsx locked fields store an already-substituted snapshot there, including JSON
 * that is not a Designer variable map. Never treat `content` as an expression.
 */
export const resolveReadOnlyMultiVariableText = (
  schema: MultiVariableTextSchema,
  value?: string,
): string => {
  if (!schema.variables?.length) {
    return schema.text || '';
  }

  const variableMap =
    readDesignerVariableMap(schema.content, schema.variables) ??
    readDesignerVariableMap(value, schema.variables);
  if (variableMap) {
    return isInlineMarkdownTextSchema(schema)
      ? substituteVariablesAsInlineMarkdownLiterals(schema.text || '', variableMap)
      : substituteVariables(schema.text || '', variableMap);
  }

  // JSON that is not a Designer variable map is a pre-resolved snapshot (jsx).
  // Keep `content` so an expression-evaluated value like "name" cannot replace it.
  if (isJsonObjectSnapshot(schema.content) && schema.content) {
    return schema.content;
  }

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return schema.content || schema.text || '';
};

export const validateVariables = (value: string, schema: MultiVariableTextSchema): boolean => {
  if (schema.variables.length === 0) {
    return true;
  }

  let values;
  try {
    values = value ? (JSON.parse(value) as Record<string, string>) : {};
  } catch {
    throw new SyntaxError(
      `[@pdfme/generator] invalid JSON string '${value}' for variables in field ${schema.name}`,
    );
  }

  for (const variable of schema.variables) {
    if (
      !Object.prototype.hasOwnProperty.call(values, variable) ||
      values[variable] === null ||
      values[variable] === undefined
    ) {
      if (schema.required) {
        throw new Error(
          `[@pdfme/generator] variable ${variable} is missing for field ${schema.name}`,
        );
      }
      // If not required, then simply don't render this field if an input is missing
      return false;
    }
  }

  return true;
};
