import {RerenderCheckProps} from "@pdfme/common";

export const substituteVariables = (text: string, variablesIn: string | Record<string, string>): string => {
  if (!text || !variablesIn) {
    return text;
  }

  let substitutedText = text;

  const variables: Record<string, string> = (typeof variablesIn === "string") ? JSON.parse(variablesIn) || {} : variablesIn;

  Object.keys(variables).forEach((variableName) => {
    // handle special characters in variable name
    const variableForRegex = variableName.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp('{' + variableForRegex + '}', 'g');
    substitutedText = substitutedText.replace(regex, variables[variableName]);
  });

  return substitutedText;
};

export const shouldRerenderVars = (args: RerenderCheckProps) => {
  const {value, mode, scale, schema, options} = args;

  if (mode === 'form' || mode === 'designer') {
    // If this schema is actively being edited (e.g. typing into a field)
    // then we don't want changes to that schema made elsewhere to trigger a re-render and lose focus.
    return [mode, scale, '', JSON.stringify(options)]
  }
  return [mode, scale, JSON.stringify(schema), JSON.stringify(options)];
}