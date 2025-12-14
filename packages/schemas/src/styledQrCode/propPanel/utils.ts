/**
 * Helper to get nested values from schema
 */
export const getNestedValue = (
  obj: unknown,
  path: string[],
): Record<string, unknown> | undefined => {
  let current: unknown = obj;
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current && typeof current === 'object' ? (current as Record<string, unknown>) : undefined;
};

