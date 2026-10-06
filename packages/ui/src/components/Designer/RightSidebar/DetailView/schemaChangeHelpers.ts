import type { ChangeSchemaItem, SchemaForUI } from '@pdfme/common';

// Keep identity, content, type, and coordinates scoped to the active schema. Bulk-applying
// these can duplicate names, rewrite field values, replace schema shapes, or stack fields.
const singleSchemaOnlyChangeKeys = new Set(['id', 'name', 'type', 'content', 'position']);

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
  if (targetSchemas.length <= 1) return changes;

  const isActiveSchemaOnlyChange = changes.every((change) => change.schemaId === activeSchema.id);
  if (!isActiveSchemaOnlyChange) return changes;

  // Some widgets send dependent updates in one batch. If any part of that batch must stay
  // single-schema-only, keep the whole batch together to avoid partial cross-schema state.
  if (changes.some((change) => isSingleSchemaOnlyChange(change.key))) return changes;

  return changes.flatMap((change) => {
    return targetSchemas.map((schema) => ({ ...change, schemaId: schema.id }));
  });
};
