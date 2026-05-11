import type { Schema } from './types.js';

export const DYNAMIC_CONTAINER_METADATA_KEY = '__pdfmeDynamicContainer' as const;

export type DynamicContainerMetadata = {
  childNames: string[];
  paddingBottom?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getDynamicContainerMetadata = (
  schema: Schema,
): DynamicContainerMetadata | undefined => {
  const value = (schema as Record<string, unknown>)[DYNAMIC_CONTAINER_METADATA_KEY];
  if (!isRecord(value) || !Array.isArray(value.childNames)) return undefined;

  const childNames = value.childNames.filter(
    (childName): childName is string => typeof childName === 'string' && childName.length > 0,
  );
  if (childNames.length === 0) return undefined;

  const paddingBottom =
    typeof value.paddingBottom === 'number' && Number.isFinite(value.paddingBottom)
      ? Math.max(0, value.paddingBottom)
      : undefined;

  return { childNames, paddingBottom };
};

export const setDynamicContainerMetadata = (schema: Schema, metadata: DynamicContainerMetadata) => {
  const childNames = metadata.childNames.filter((childName) => childName.length > 0);
  if (childNames.length === 0) return;
  const paddingBottom =
    typeof metadata.paddingBottom === 'number' && Number.isFinite(metadata.paddingBottom)
      ? Math.max(0, metadata.paddingBottom)
      : undefined;

  (schema as Record<string, unknown>)[DYNAMIC_CONTAINER_METADATA_KEY] = {
    childNames,
    ...(paddingBottom != null ? { paddingBottom } : {}),
  };
};
