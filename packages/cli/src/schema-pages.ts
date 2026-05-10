type NormalizeSchemaPagesOptions = {
  inferObjectSchemaNames?: boolean;
};

export function normalizeSchemaPages(
  rawSchemas: unknown,
  options: NormalizeSchemaPagesOptions = {},
): Array<Array<Record<string, unknown>>> {
  if (!Array.isArray(rawSchemas)) {
    return [];
  }

  return rawSchemas.map((page) => {
    if (Array.isArray(page)) {
      return page.filter(
        (schema): schema is Record<string, unknown> =>
          typeof schema === 'object' && schema !== null,
      );
    }

    if (typeof page === 'object' && page !== null) {
      return normalizeObjectSchemaPage(page, options);
    }

    return [];
  });
}

function normalizeObjectSchemaPage(
  page: object,
  options: NormalizeSchemaPagesOptions,
): Array<Record<string, unknown>> {
  if (!options.inferObjectSchemaNames) {
    return Object.values(page).filter(
      (schema): schema is Record<string, unknown> => typeof schema === 'object' && schema !== null,
    );
  }

  return Object.entries(page)
    .map(([name, schema]) =>
      typeof schema === 'object' && schema !== null
        ? {
            ...schema,
            name: (schema as Record<string, unknown>).name ?? name,
          }
        : null,
    )
    .filter((schema): schema is Record<string, unknown> => schema !== null);
}
