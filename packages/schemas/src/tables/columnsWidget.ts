import { cloneDeep, type ChangeSchemaItem, type PropPanelWidgetProps } from '@pdfme/common';
import { DEFAULT_TABLE_IMAGE_HEIGHT, DEFAULT_TABLE_IMAGE_HEIGHT_MODE } from './constants.js';
import {
  normalizeTableCellType,
  normalizeTableImageHeightMode,
  resolveFixedTableImageHeight,
} from './imageCell.js';
import {
  TABLE_CELL_TYPES,
  TABLE_IMAGE_HEIGHT_MODES,
  type TableCellType,
  type TableImageHeightMode,
  type TableSchema,
} from './types.js';

const cellTypeWarnCache = new Map<string | number, unknown>();

type ColumnStyleMap<T> = { [colIndex: number]: T } | undefined;

const isUnset = (value: unknown) => value == null;

const clearColumnContent = (content: string | undefined, columnIndex: number): string => {
  let rows: unknown;
  try {
    rows = JSON.parse(content ?? '[]');
  } catch {
    return content ?? '[]';
  }
  if (!Array.isArray(rows)) return content ?? '[]';
  const next = rows.map((row) => {
    if (!Array.isArray(row)) return row;
    const copy = row.slice() as unknown[];
    if (columnIndex < copy.length) copy[columnIndex] = '';
    return copy;
  });
  return JSON.stringify(next);
};

const dropColumnKey = <T>(map: ColumnStyleMap<T>, columnIndex: number): ColumnStyleMap<T> => {
  if (!map) return map;
  const next = { ...map };
  delete next[columnIndex];
  return Object.keys(next).length === 0 ? undefined : next;
};

const columnLabel = (head: string[], index: number, i18n: (key: string) => string) => {
  const label = head[index];
  return label ? label : `${i18n('schemas.table.columnLabel')} ${index + 1}`;
};

const commitStyles = (
  props: PropPanelWidgetProps,
  columnStyles: TableSchema['columnStyles'],
  content?: string,
) => {
  const schemaId = props.activeSchema.id;
  const changes: ChangeSchemaItem[] = [{ key: 'columnStyles', value: columnStyles, schemaId }];
  if (content !== undefined) {
    changes.push({ key: 'content', value: content, schemaId });
  }
  props.changeSchemas(changes);
};

const setCellType = (
  props: PropPanelWidgetProps,
  table: TableSchema,
  columnIndex: number,
  nextType: TableCellType,
) => {
  const next = cloneDeep(table.columnStyles ?? {});
  if (nextType === 'image') {
    next.cellType = { ...next.cellType, [columnIndex]: 'image' };
    if (isUnset(next.imageHeightMode?.[columnIndex])) {
      next.imageHeightMode = {
        ...next.imageHeightMode,
        [columnIndex]: DEFAULT_TABLE_IMAGE_HEIGHT_MODE,
      };
    }
    if (isUnset(next.imageHeight?.[columnIndex])) {
      next.imageHeight = {
        ...next.imageHeight,
        [columnIndex]: DEFAULT_TABLE_IMAGE_HEIGHT,
      };
    }
    if (isUnset(next.alignment?.[columnIndex])) {
      next.alignment = { ...next.alignment, [columnIndex]: 'center' };
    }
  } else {
    const cellType = dropColumnKey(next.cellType, columnIndex);
    const imageHeightMode = dropColumnKey(next.imageHeightMode, columnIndex);
    const imageHeight = dropColumnKey(next.imageHeight, columnIndex);
    if (cellType) next.cellType = cellType;
    else delete next.cellType;
    if (imageHeightMode) next.imageHeightMode = imageHeightMode;
    else delete next.imageHeightMode;
    if (imageHeight) next.imageHeight = imageHeight;
    else delete next.imageHeight;
  }
  commitStyles(props, next, clearColumnContent(table.content, columnIndex));
};

const setImageHeightMode = (
  props: PropPanelWidgetProps,
  table: TableSchema,
  columnIndex: number,
  mode: TableImageHeightMode,
) => {
  const next = cloneDeep(table.columnStyles ?? {});
  next.imageHeightMode = { ...next.imageHeightMode, [columnIndex]: mode };
  commitStyles(props, next);
};

const setImageHeight = (
  props: PropPanelWidgetProps,
  table: TableSchema,
  columnIndex: number,
  height: number,
) => {
  const next = cloneDeep(table.columnStyles ?? {});
  next.imageHeight = { ...next.imageHeight, [columnIndex]: height };
  commitStyles(props, next);
};

const appendSelect = (
  parent: HTMLElement,
  options: { value: string; label: string }[],
  value: string,
  control: string,
  columnIndex: number,
  onChange: (value: string) => void,
) => {
  const select = document.createElement('select');
  select.dataset.control = control;
  select.dataset.columnIndex = String(columnIndex);
  select.style.width = '100%';
  options.forEach((option) => {
    const element = document.createElement('option');
    element.value = option.value;
    element.textContent = option.label;
    select.appendChild(element);
  });
  select.value = value;
  select.addEventListener('change', () => {
    onChange(select.value);
  });
  parent.appendChild(select);
  return select;
};

export const TableColumns = (props: PropPanelWidgetProps) => {
  const { rootElement, activeSchema, i18n } = props;
  const table = activeSchema as unknown as TableSchema;
  const head = table.head || [];
  const columnStyles = table.columnStyles ?? {};

  head.forEach((_, index) => {
    const row = document.createElement('div');
    row.dataset.columnIndex = String(index);
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
    row.style.gap = '4px';
    row.style.marginBottom = '10px';

    const title = document.createElement('div');
    title.dataset.control = 'label';
    title.textContent = columnLabel(head, index, i18n);
    title.style.fontSize = '12px';
    title.style.fontWeight = '600';
    row.appendChild(title);

    const storedType = columnStyles.cellType?.[index];
    const cellType =
      normalizeTableCellType(storedType, index, cellTypeWarnCache) ?? ('text' as const);

    appendSelect(
      row,
      TABLE_CELL_TYPES.map((type) => ({
        value: type,
        label: i18n(`schemas.table.cellType.${type}`),
      })),
      cellType,
      'cellType',
      index,
      (value) => {
        if (value !== 'text' && value !== 'image') return;
        if (value === cellType) return;
        setCellType(props, table, index, value);
      },
    );

    if (cellType === 'image') {
      const mode =
        normalizeTableImageHeightMode(columnStyles.imageHeightMode?.[index]) ??
        DEFAULT_TABLE_IMAGE_HEIGHT_MODE;
      appendSelect(
        row,
        TABLE_IMAGE_HEIGHT_MODES.map((heightMode) => ({
          value: heightMode,
          label: i18n(`schemas.table.imageHeightMode.${heightMode}`),
        })),
        mode,
        'imageHeightMode',
        index,
        (value) => {
          if (value !== 'fixed' && value !== 'auto') return;
          if (value === mode) return;
          setImageHeightMode(props, table, index, value);
        },
      );

      if (mode === 'fixed') {
        const displayHeight = resolveFixedTableImageHeight(columnStyles.imageHeight?.[index]);
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.step = '1';
        input.dataset.control = 'imageHeight';
        input.dataset.columnIndex = String(index);
        input.setAttribute('aria-label', i18n('schemas.table.imageHeightMode.fixed'));
        input.style.width = '100%';
        input.value = String(displayHeight);
        input.addEventListener('change', () => {
          const parsed = Number(input.value);
          if (!Number.isFinite(parsed) || parsed <= 0) {
            input.value = String(displayHeight);
            return;
          }
          setImageHeight(props, table, index, parsed);
        });
        row.appendChild(input);
      }
    }

    rootElement.appendChild(row);
  });
};
