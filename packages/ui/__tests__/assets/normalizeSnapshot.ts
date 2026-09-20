export const normalizeElementIdsForSnapshot = (container: HTMLElement) => {
  const normalizeClassName = (className: string) =>
    className
      .split(/\s+/)
      .filter(Boolean)
      .filter(
        (token) =>
          !token.startsWith('css-dev-only-do-not-override-')
          && token !== 'css-var-root'
          && token !== 'ant-divider-rail',
      )
      .join(' ');

  container.querySelectorAll<HTMLElement>('*').forEach((element) => {
    element.removeAttribute('data-pdfme-render-ready');
    const className = element.getAttribute('class');
    if (className) {
      const normalizedClassName = normalizeClassName(className);
      if (normalizedClassName) {
        element.setAttribute('class', normalizedClassName);
      } else {
        element.removeAttribute('class');
      }
    }
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

      if (attributeName === 'aria-describedby') {
        element.removeAttribute(attributeName);
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
