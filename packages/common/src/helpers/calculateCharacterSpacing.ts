type CalculateCharacterSpacing = (textContent: string, textCharacterSpacing: number) => number;

export const calculateCharacterSpacing: CalculateCharacterSpacing = (
  textContent,
  textCharacterSpacing
) => {
  const numberOfCharacters = textContent.length;

  if (numberOfCharacters <= 0) return 0;

  if (numberOfCharacters === 1) return 2 * textCharacterSpacing;

  const totalSpacing = (numberOfCharacters - 1) * textCharacterSpacing;

  return totalSpacing;
};
