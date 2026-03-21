export const normalizeElementIdsForSnapshot = (container: HTMLElement) => {
  container.querySelectorAll<HTMLElement>('*').forEach((element) => {
    element.childNodes.forEach((childNode) => {
      if (childNode.nodeType === Node.TEXT_NODE && !childNode.textContent?.trim()) {
        childNode.remove();
      }
    });
  });

  const idMap = new Map<string, string>();
  let nextId = 1;

  const normalizeId = (value: string) => {
    const hasTextPrefix = value.startsWith('text-');
    const key = hasTextPrefix ? value.slice(5) : value;

    if (!idMap.has(key)) {
      idMap.set(key, String(nextId++));
    }

    const normalizedValue = idMap.get(key)!;
    return hasTextPrefix ? `text-${normalizedValue}` : normalizedValue;
  };

  container.querySelectorAll<HTMLElement>('[id]').forEach((element) => {
    element.id = normalizeId(element.id);
  });

  container.querySelectorAll<HTMLElement>('*').forEach((element) => {
    element.getAttributeNames().forEach((attributeName) => {
      const value = element.getAttribute(attributeName);

      if (!value) {
        return;
      }

      if (idMap.has(value)) {
        element.setAttribute(attributeName, idMap.get(value)!);
        return;
      }

      if (value.startsWith('text-')) {
        const key = value.slice(5);
        if (idMap.has(key)) {
          element.setAttribute(attributeName, `text-${idMap.get(key)!}`);
        }
      }
    });
  });

  return container.firstChild;
};
