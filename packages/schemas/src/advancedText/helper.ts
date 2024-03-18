export const getUniqueVariableNames = (content: string) => {
  const regex = /\{([^}]+)}/g;

  const uniqueMatchesSet = new Set();
  let match;
  while ((match = regex.exec(content)) !== null) {
    uniqueMatchesSet.add(match[1]);
  }

  return Array.from(uniqueMatchesSet);
};

export const substituteVariables = (text: string, variablesStr: string): string => {
  if (!text || !variablesStr) {
    return text;
  }

  let substitutedText = text;

  try {
    const variables: Record<string, string> = JSON.parse(variablesStr) || {}

    Object.keys(variables).forEach((variableName) => {
      const variableForRegex = variableName.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp('{' + variableForRegex + '}', 'g');

      substitutedText = substitutedText.replace(regex, variables[variableName]);
    });
  } catch (error: any) {
    console.error('Error parsing JSON:', error.message);
  }

  return substitutedText;
};
