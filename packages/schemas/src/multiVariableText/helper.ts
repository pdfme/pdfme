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
