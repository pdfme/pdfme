import { cloneDeep, type Schema, type SchemaForUI } from '@pdfme/common';

export type DesignerSelectionBounds = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type DesignerSelectedSchema = {
  name: string;
  pageIndex: number;
  schema: Schema;
  schemaId: string;
  schemaIndex: number;
  type: string;
};

export type DesignerSelection = {
  bounds: DesignerSelectionBounds | null;
  pageIndex: number;
  schemas: DesignerSelectedSchema[];
};

export type DesignerSelectionChangeCallback = (selection: DesignerSelection) => void;

export type DesignerSchemaSelectionTarget =
  | string
  | {
      name?: string;
      pageIndex?: number;
      schemaId?: string;
      schemaIndex?: number;
    };

export type DesignerSelectSchemasOptions = {
  pageIndex?: number;
  scroll?: boolean;
};

export type DesignerSelectSchemas = (
  targets: DesignerSchemaSelectionTarget | DesignerSchemaSelectionTarget[],
  options?: DesignerSelectSchemasOptions,
) => void;

export const EMPTY_DESIGNER_SELECTION: DesignerSelection = {
  bounds: null,
  pageIndex: 0,
  schemas: [],
};

const toPersistedSchema = (schema: SchemaForUI): Schema => {
  const cloned = cloneDeep(schema) as Schema & { id?: string };
  delete cloned.id;
  return cloned;
};

const getSelectionBounds = (schemas: DesignerSelectedSchema[]): DesignerSelectionBounds | null => {
  if (schemas.length === 0) return null;

  const left = Math.min(...schemas.map(({ schema }) => schema.position.x));
  const top = Math.min(...schemas.map(({ schema }) => schema.position.y));
  const right = Math.max(...schemas.map(({ schema }) => schema.position.x + schema.width));
  const bottom = Math.max(...schemas.map(({ schema }) => schema.position.y + schema.height));

  return {
    height: bottom - top,
    width: right - left,
    x: left,
    y: top,
  };
};

export const createDesignerSelection = ({
  activeSchemaIds,
  pageIndex,
  schemasList,
}: {
  activeSchemaIds: string[];
  pageIndex: number;
  schemasList: SchemaForUI[][];
}): DesignerSelection => {
  const pageSchemas = schemasList[pageIndex] ?? [];
  const selectedSchemas = activeSchemaIds.flatMap((schemaId) => {
    const schemaIndex = pageSchemas.findIndex((schema) => schema.id === schemaId);
    const schema = pageSchemas[schemaIndex];
    if (schemaIndex === -1 || !schema) return [];

    return [
      {
        name: schema.name,
        pageIndex,
        schema: toPersistedSchema(schema),
        schemaId: schema.id,
        schemaIndex,
        type: schema.type,
      },
    ];
  });

  return {
    bounds: getSelectionBounds(selectedSchemas),
    pageIndex,
    schemas: selectedSchemas,
  };
};

export const normalizeDesignerSchemaSelectionTargets = (
  targets: DesignerSchemaSelectionTarget | DesignerSchemaSelectionTarget[],
): DesignerSchemaSelectionTarget[] => (Array.isArray(targets) ? targets : [targets]);

export const getDesignerSelectionPageIndex = (
  targets: DesignerSchemaSelectionTarget[],
  fallbackPageIndex: number,
  options: DesignerSelectSchemasOptions = {},
): number => {
  const optionPageIndex = options.pageIndex;
  if (Number.isInteger(optionPageIndex) && optionPageIndex !== undefined && optionPageIndex >= 0) {
    return optionPageIndex;
  }

  const firstObjectTarget = targets.find(
    (target): target is Exclude<DesignerSchemaSelectionTarget, string> =>
      typeof target === 'object' && target !== null,
  );

  const targetPageIndex = firstObjectTarget?.pageIndex;
  return Number.isInteger(targetPageIndex) && targetPageIndex !== undefined && targetPageIndex >= 0
    ? targetPageIndex
    : fallbackPageIndex;
};

export const getSelectedSchemaIds = ({
  pageIndex,
  schemas,
  targets,
}: {
  pageIndex: number;
  schemas: SchemaForUI[];
  targets: DesignerSchemaSelectionTarget[];
}): string[] => {
  const selectedIds = new Set<string>();

  targets.forEach((target) => {
    schemas.forEach((schema, schemaIndex) => {
      if (typeof target === 'string') {
        if (schema.id === target || schema.name === target) selectedIds.add(schema.id);
        return;
      }

      if (
        Number.isInteger(target.pageIndex) &&
        target.pageIndex !== undefined &&
        target.pageIndex !== pageIndex
      ) {
        return;
      }

      const hasSelector =
        target.schemaId !== undefined ||
        target.schemaIndex !== undefined ||
        target.name !== undefined;
      if (!hasSelector) return;

      if (target.schemaId !== undefined && target.schemaId === schema.id) {
        selectedIds.add(schema.id);
        return;
      }

      if (target.schemaIndex !== undefined && target.schemaIndex === schemaIndex) {
        selectedIds.add(schema.id);
        return;
      }

      if (target.name !== undefined && target.name === schema.name) {
        selectedIds.add(schema.id);
      }
    });
  });

  return [...selectedIds];
};
