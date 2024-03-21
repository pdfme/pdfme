export const substituteVariables = (text: string, variablesStr: string): string => {
  if (!text || !variablesStr) {
    return text;
  }

  let substitutedText = text;

  const variables: Record<string, string> = JSON.parse(variablesStr) || {}

  Object.keys(variables).forEach((variableName) => {
    const variableForRegex = variableName.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp('{' + variableForRegex + '}', 'g');

    substitutedText = substitutedText.replace(regex, variables[variableName]);
  });

  return substitutedText;
};
