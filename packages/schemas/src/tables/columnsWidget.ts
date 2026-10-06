import { cloneDeep, type ChangeSchemaItem, type PropPanelWidgetProps } from '@pdfme/common';
import type { ALIGNMENT, VERTICAL_ALIGNMENT } from '../text/types.js';
import {
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextVerticalAlignBottomIcon,
  TextVerticalAlignMiddleIcon,
  TextVerticalAlignTopIcon,
} from '../text/icons/index.js';
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

/** More than this many columns, and each block starts collapsed. */
const COLLAPSE_WHEN_MORE_THAN = 6;

type ColumnStyleMap<T> = { [colIndex: number]: T } | undefined;

type AlignButton = {
  value: string;
  icon: string;
  labelKey: string;
};

const HORIZONTAL_ALIGNMENTS: AlignButton[] = [
  { value: 'left', icon: TextAlignLeftIcon, labelKey: 'schemas.left' },
  { value: 'center', icon: TextAlignCenterIcon, labelKey: 'schemas.center' },
  { value: 'right', icon: TextAlignRightIcon, labelKey: 'schemas.right' },
];

const VERTICAL_ALIGNMENTS: AlignButton[] = [
  { value: 'top', icon: TextVerticalAlignTopIcon, labelKey: 'schemas.top' },
  { value: 'middle', icon: TextVerticalAlignMiddleIcon, labelKey: 'schemas.middle' },
  { value: 'bottom', icon: TextVerticalAlignBottomIcon, labelKey: 'schemas.bottom' },
];

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

const setAlignment = (
  props: PropPanelWidgetProps,
  table: TableSchema,
  columnIndex: number,
  value: ALIGNMENT,
) => {
  const next = cloneDeep(table.columnStyles ?? {});
  if (next.alignment?.[columnIndex] === value) return;
  next.alignment = { ...next.alignment, [columnIndex]: value };
  commitStyles(props, next);
};

const setVerticalAlignment = (
  props: PropPanelWidgetProps,
  table: TableSchema,
  columnIndex: number,
  value: VERTICAL_ALIGNMENT,
) => {
  const next = cloneDeep(table.columnStyles ?? {});
  if (next.verticalAlignment?.[columnIndex] === value) return;
  next.verticalAlignment = { ...next.verticalAlignment, [columnIndex]: value };
  commitStyles(props, next);
};

const iconSrc = (svg: string, color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/currentColor/g, color))}`;

const appendIcon = (parent: HTMLElement, svg: string, color: string, size = 17) => {
  const img = document.createElement('img');
  img.alt = '';
  img.width = size;
  img.height = size;
  img.src = iconSrc(svg, color);
  parent.appendChild(img);
  return img;
};

const appendSelect = (
  parent: HTMLElement,
  options: { value: string; label: string }[],
  value: string,
  control: string,
  columnIndex: number,
  width: string,
  onChange: (value: string) => void,
) => {
  const select = document.createElement('select');
  select.dataset.control = control;
  select.dataset.columnIndex = String(columnIndex);
  select.style.width = width;
  select.style.flexShrink = '0';
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

const appendButtonGroup = (
  parent: HTMLElement,
  control: 'alignment' | 'verticalAlignment',
  buttons: AlignButton[],
  current: string | undefined,
  columnIndex: number,
  primary: string,
  i18n: (key: string) => string,
  onSelect: (value: string) => void,
) => {
  const group = document.createElement('div');
  group.dataset.control = control;
  group.dataset.columnIndex = String(columnIndex);
  group.setAttribute('role', 'group');
  group.style.display = 'inline-flex';
  buttons.forEach((button, index) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.dataset.value = button.value;
    const label = i18n(button.labelKey);
    element.setAttribute('aria-label', label);
    element.title = label;
    const active = current === button.value;
    element.setAttribute('aria-pressed', active ? 'true' : 'false');
    element.style.padding = '7px';
    element.style.lineHeight = '0';
    element.style.background = 'transparent';
    element.style.cursor = 'pointer';
    element.style.border = `1px solid ${active ? primary : '#d9d9d9'}`;
    element.style.marginLeft = index === 0 ? '0' : '-1px';
    element.style.borderRadius =
      index === 0 ? '6px 0 0 6px' : index === buttons.length - 1 ? '0 6px 6px 0' : '0';
    element.style.position = 'relative';
    element.style.zIndex = active ? '1' : '0';
    appendIcon(element, button.icon, active ? primary : '#000000');
    element.addEventListener('click', () => {
      if (current === button.value) return;
      onSelect(button.value);
    });
    group.appendChild(element);
  });
  parent.appendChild(group);
  return group;
};

const ellipsis = (element: HTMLElement) => {
  element.style.overflow = 'hidden';
  element.style.textOverflow = 'ellipsis';
  element.style.whiteSpace = 'nowrap';
  element.style.minWidth = '0';
};

export const TableColumns = (props: PropPanelWidgetProps) => {
  const { rootElement, activeSchema, i18n } = props;
  const table = activeSchema as unknown as TableSchema;
  const head = table.head || [];
  const columnStyles = table.columnStyles ?? {};
  const primary = props.theme?.colorPrimary || '#1677ff';
  const collapsible = head.length > COLLAPSE_WHEN_MORE_THAN;

  head.forEach((_, index) => {
    const storedType = columnStyles.cellType?.[index];
    const cellType =
      normalizeTableCellType(storedType, index, cellTypeWarnCache) ?? ('text' as const);
    const label = columnLabel(head, index, i18n);
    const alignment = columnStyles.alignment?.[index];
    const verticalAlignment = columnStyles.verticalAlignment?.[index];
    const mode =
      cellType === 'image'
        ? (normalizeTableImageHeightMode(columnStyles.imageHeightMode?.[index]) ??
          DEFAULT_TABLE_IMAGE_HEIGHT_MODE)
        : undefined;

    const block = document.createElement('div');
    block.dataset.columnIndex = String(index);
    block.style.marginBottom = index === head.length - 1 ? '0' : '10px';
    block.style.paddingBottom = index === head.length - 1 ? '0' : '10px';
    if (index !== head.length - 1) block.style.borderBottom = '1px solid #f0f0f0';

    const body = document.createElement('div');
    body.dataset.control = 'column-body';

    if (collapsible) {
      const summary = document.createElement('button');
      summary.type = 'button';
      summary.dataset.control = 'summary';
      summary.setAttribute('aria-expanded', 'false');
      summary.title = label;
      summary.style.display = 'flex';
      summary.style.alignItems = 'center';
      summary.style.gap = '6px';
      summary.style.width = '100%';
      summary.style.padding = '0';
      summary.style.border = 'none';
      summary.style.background = 'transparent';
      summary.style.cursor = 'pointer';
      summary.style.font = 'inherit';
      summary.style.textAlign = 'left';

      const name = document.createElement('span');
      name.dataset.control = 'summary-name';
      name.textContent = label;
      name.style.fontWeight = '600';
      name.style.fontSize = '12px';
      name.style.flex = '1';
      ellipsis(name);
      summary.appendChild(name);

      const typeLabel = document.createElement('span');
      typeLabel.dataset.control = 'summary-type';
      typeLabel.textContent = i18n(`schemas.table.cellType.${cellType}`);
      typeLabel.style.fontSize = '12px';
      typeLabel.style.flexShrink = '0';
      summary.appendChild(typeLabel);

      const alignmentIcon = HORIZONTAL_ALIGNMENTS.find((button) => button.value === alignment);
      if (alignmentIcon) {
        const icon = document.createElement('span');
        icon.dataset.control = 'summary-alignment';
        icon.dataset.value = alignmentIcon.value;
        icon.style.lineHeight = '0';
        icon.style.flexShrink = '0';
        appendIcon(icon, alignmentIcon.icon, '#000000', 14);
        summary.appendChild(icon);
      }
      const verticalIcon = VERTICAL_ALIGNMENTS.find((button) => button.value === verticalAlignment);
      if (verticalIcon) {
        const icon = document.createElement('span');
        icon.dataset.control = 'summary-vertical-alignment';
        icon.dataset.value = verticalIcon.value;
        icon.style.lineHeight = '0';
        icon.style.flexShrink = '0';
        appendIcon(icon, verticalIcon.icon, '#000000', 14);
        summary.appendChild(icon);
      }
      if (cellType === 'image' && mode === 'fixed') {
        const height = document.createElement('span');
        height.dataset.control = 'summary-height';
        height.textContent = `${resolveFixedTableImageHeight(columnStyles.imageHeight?.[index])}mm`;
        height.style.fontSize = '12px';
        height.style.flexShrink = '0';
        summary.appendChild(height);
      }

      summary.addEventListener('click', () => {
        summary.hidden = true;
        body.hidden = false;
      });
      body.hidden = true;
      block.appendChild(summary);
    }

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';

    if (collapsible) {
      const collapse = document.createElement('button');
      collapse.type = 'button';
      collapse.dataset.control = 'collapse';
      collapse.setAttribute('aria-expanded', 'true');
      collapse.setAttribute('aria-label', label);
      collapse.textContent = '▾';
      collapse.style.border = 'none';
      collapse.style.background = 'transparent';
      collapse.style.cursor = 'pointer';
      collapse.style.padding = '0 2px 0 0';
      collapse.style.lineHeight = '1';
      collapse.addEventListener('click', () => {
        const summary = block.querySelector<HTMLButtonElement>('[data-control="summary"]');
        if (summary) summary.hidden = false;
        body.hidden = true;
      });
      header.appendChild(collapse);
    }

    const title = document.createElement('div');
    title.dataset.control = 'label';
    title.textContent = label;
    title.title = label;
    title.style.fontSize = '12px';
    title.style.fontWeight = '600';
    title.style.flex = '1';
    ellipsis(title);
    header.appendChild(title);

    appendSelect(
      header,
      TABLE_CELL_TYPES.map((type) => ({
        value: type,
        label: i18n(`schemas.table.cellType.${type}`),
      })),
      cellType,
      'cellType',
      index,
      '110px',
      (value) => {
        if (value !== 'text' && value !== 'image') return;
        if (value === cellType) return;
        setCellType(props, table, index, value);
      },
    );
    body.appendChild(header);

    const alignments = document.createElement('div');
    alignments.style.display = 'flex';
    alignments.style.justifyContent = 'space-between';
    alignments.style.alignItems = 'center';
    alignments.style.marginTop = '8px';
    appendButtonGroup(
      alignments,
      'alignment',
      HORIZONTAL_ALIGNMENTS,
      alignment,
      index,
      primary,
      i18n,
      (value) => {
        if (value !== 'left' && value !== 'center' && value !== 'right') return;
        setAlignment(props, table, index, value);
      },
    );
    appendButtonGroup(
      alignments,
      'verticalAlignment',
      VERTICAL_ALIGNMENTS,
      verticalAlignment,
      index,
      primary,
      i18n,
      (value) => {
        if (value !== 'top' && value !== 'middle' && value !== 'bottom') return;
        setVerticalAlignment(props, table, index, value);
      },
    );
    body.appendChild(alignments);

    if (cellType === 'image' && mode) {
      const imageRow = document.createElement('div');
      imageRow.style.display = 'flex';
      imageRow.style.alignItems = 'center';
      imageRow.style.gap = '8px';
      imageRow.style.marginTop = '8px';
      appendSelect(
        imageRow,
        TABLE_IMAGE_HEIGHT_MODES.map((heightMode) => ({
          value: heightMode,
          label: i18n(`schemas.table.imageHeightMode.${heightMode}`),
        })),
        mode,
        'imageHeightMode',
        index,
        'auto',
        (value) => {
          if (value !== 'fixed' && value !== 'auto') return;
          if (value === mode) return;
          setImageHeightMode(props, table, index, value);
        },
      );
      const modeSelect = imageRow.querySelector('select');
      if (modeSelect) {
        modeSelect.style.flex = '1';
        modeSelect.style.minWidth = '0';
      }

      if (mode === 'fixed') {
        const displayHeight = resolveFixedTableImageHeight(columnStyles.imageHeight?.[index]);
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.step = '1';
        input.dataset.control = 'imageHeight';
        input.dataset.columnIndex = String(index);
        input.setAttribute('aria-label', i18n('schemas.table.imageHeightMode.fixed'));
        input.style.width = '72px';
        input.style.flexShrink = '0';
        input.value = String(displayHeight);
        input.addEventListener('change', () => {
          const parsed = Number(input.value);
          if (!Number.isFinite(parsed) || parsed <= 0) {
            input.value = String(displayHeight);
            return;
          }
          setImageHeight(props, table, index, parsed);
        });
        imageRow.appendChild(input);
      }
      body.appendChild(imageRow);
    }

    block.appendChild(body);
    rootElement.appendChild(block);
  });
};
