import { MultiVariableTextSchema } from "./types";

export const substituteVariables = (text: string, variablesIn: string | Record<string, string>): string => {
  if (!text) {
    return "";
  }

  let substitutedText = text;

  if (variablesIn) {
    const variables: Record<string, string> = (typeof variablesIn === "string") ? JSON.parse(variablesIn) || {} : variablesIn;

    Object.keys(variables).forEach((variableName) => {
      // handle special characters in variable name
      const variableForRegex = variableName.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp('{' + variableForRegex + '}', 'g');
      substitutedText = substitutedText.replace(regex, variables[variableName]);
    });
  }

  // Remove any variables that were not substituted from inputs
  substitutedText = substitutedText.replace(/{[^{}]+}/g, '');

  return substitutedText;
};

export const validateVariables = (value: string, schema: MultiVariableTextSchema): boolean => {
  if (schema.variables.length == 0) {
    return true;
  }

  let values;
  try {
    values = value ? JSON.parse(value) : {};
  } catch (e) {
    throw new SyntaxError(`[@pdfme/generator] invalid JSON string '${value}' for variables in field ${schema.name}`);
  }

  for (const variable of schema.variables) {
    if (!values[variable]) {
      if (schema.required) {
        throw new Error(`[@pdfme/generator] variable ${variable} is missing for field ${schema.name}`);
      }
      // If not required, then simply don't render this field if an input is missing
      return false;
    }
  }

  return true;
}