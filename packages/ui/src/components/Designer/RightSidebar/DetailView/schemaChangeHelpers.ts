import type { ChangeSchemaItem, SchemaForUI } from '@pdfme/common';

// Keep identity, content, type, and coordinates scoped to the active schema. Bulk-applying
// these can duplicate names, rewrite field values, replace schema shapes, or stack fields.
const singleSchemaOnlyChangeKeys = new Set(['id', 'name', 'type', 'content', 'position']);

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const columnStylesOf = (schema: SchemaForUI): unknown =>
  (schema as SchemaForUI & { columnStyles?: unknown }).columnStyles;

// The Column Style card only registers `alignment`. form-render then submits that
// object alone, which would drop cellType, image heights, and unknown keys.
// Overlay the form value onto each table's stored columnStyles.
export const mergeColumnStylesFormValue = (stored: unknown, formValue: unknown): unknown => {
  if (!isPlainObject(formValue) || !isPlainObject(stored)) return formValue;
  const next: Record<string, unknown> = { ...stored };
  for (const key of Object.keys(formValue)) {
    next[key] = formValue[key];
  }
  return structuredClone(next);
};

const preserveColumnStyles = (
  changes: ChangeSchemaItem[],
  schemas: SchemaForUI[],
): ChangeSchemaItem[] => {
  if (!changes.some((change) => change.key === 'columnStyles')) {
    if (schemas.length <= 1) return changes;
    return changes.flatMap((change) =>
      schemas.map((schema) => ({ ...change, schemaId: schema.id })),
    );
  }

  return changes.flatMap((change) =>
    schemas.map((schema) =>
      change.key === 'columnStyles'
        ? {
            ...change,
            schemaId: schema.id,
            value: mergeColumnStylesFormValue(columnStylesOf(schema), change.value),
          }
        : { ...change, schemaId: schema.id },
    ),
  );
};

export const getSameTypeBulkUpdateSchemas = ({
  activeSchema,
  activeSchemas,
}: {
  activeSchema: SchemaForUI;
  activeSchemas: SchemaForUI[];
}): SchemaForUI[] => {
  if (
    activeSchemas.length > 1 &&
    activeSchemas.every((schema) => schema.type === activeSchema.type)
  ) {
    return activeSchemas;
  }

  return [activeSchema];
};

export const isSingleSchemaOnlyChange = (key: string) =>
  singleSchemaOnlyChangeKeys.has(key) || key.startsWith('position.');

export const expandSameTypeBulkUpdateChanges = ({
  activeSchema,
  activeSchemas,
  changes,
}: {
  activeSchema: SchemaForUI;
  activeSchemas: SchemaForUI[];
  changes: ChangeSchemaItem[];
}): ChangeSchemaItem[] => {
  const targetSchemas = getSameTypeBulkUpdateSchemas({ activeSchema, activeSchemas });
  if (targetSchemas.length <= 1) return preserveColumnStyles(changes, [activeSchema]);

  const isActiveSchemaOnlyChange = changes.every((change) => change.schemaId === activeSchema.id);
  if (!isActiveSchemaOnlyChange) return changes;

  // Some widgets send dependent updates in one batch. If any part of that batch must stay
  // single-schema-only, keep the whole batch together to avoid partial cross-schema state.
  if (changes.some((change) => isSingleSchemaOnlyChange(change.key))) {
    return preserveColumnStyles(changes, [activeSchema]);
  }

  return preserveColumnStyles(changes, targetSchemas);
};
