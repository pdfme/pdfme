import { MultiVariableTextSchema } from './types.js';
import { escapeInlineMarkdown } from '../text/inlineMarkdown.js';

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
