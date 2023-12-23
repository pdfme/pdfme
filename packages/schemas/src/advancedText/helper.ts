export const getUniqueVariableNames = (content: string) => {
    const regex = /\{([^}]+)}/g;

    const uniqueMatchesSet = new Set();
    let match;
    while ((match = regex.exec(content)) !== null) {
        uniqueMatchesSet.add(match[1]);
    }

    return Array.from(uniqueMatchesSet);
}

export const substituteVariables = (
    content: string,
    variableString: string
) => {
    if (!content || !variableString) {
        return content;
    }

    let substitutedContent = content;

    try {
        const variables = JSON.parse(variableString);

        for (const variableName in variables) {
            // Ensure we add escape characters for anything that could break the regex
            const variableForRegex = variableName.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp('{' + variableForRegex + '}', 'g');

            substitutedContent = substitutedContent.replace(regex, variables[variableName]);
        }
    } catch (error: Error) {
        console.error('Error parsing JSON:', error.message);
    }

    return substitutedContent;
};