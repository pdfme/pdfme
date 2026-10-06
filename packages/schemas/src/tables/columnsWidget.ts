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

/** More than this many columns, and each block can collapse. */
const COLLAPSE_WHEN_MORE_THAN = 6;

// Survives widget re-renders so an open block stays open after the next edit.
const expandedColumnBlocks = new Set<string>();

const columnBlockKey = (schemaId: string, columnIndex: number) => `${schemaId}:${columnIndex}`;

const themeRecord = (theme: PropPanelWidgetProps['theme'] | undefined) =>
  (theme as unknown as Record<string, unknown> | undefined) ?? undefined;

const themeToken = (
  theme: PropPanelWidgetProps['theme'] | undefined,
  key: string,
  fallback: string,
) => {
  const value = themeRecord(theme)?.[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
};

const themeNumber = (
  theme: PropPanelWidgetProps['theme'] | undefined,
  key: string,
  fallback: number,
) => {
  const value = themeRecord(theme)?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

/** antd outlined Select / InputNumber metrics, read from the Designer token when present. */
const panelControlMetrics = (theme: PropPanelWidgetProps['theme'] | undefined) => {
  const lineWidth = themeNumber(theme, 'lineWidth', 1);
  const controlHeight = themeNumber(theme, 'controlHeight', 32);
  const paddingSm = themeNumber(theme, 'paddingSM', 12);
  const controlHeightSm = themeNumber(theme, 'controlHeightSM', 24);
  const fontSize = themeNumber(theme, 'fontSize', 14);
  const outlineWidth = themeNumber(theme, 'controlOutlineWidth', 2);
  return {
    lineWidth,
    controlHeight,
    borderRadius: themeNumber(theme, 'borderRadius', 6),
    fontSize,
    paddingInline: Math.max(0, paddingSm - lineWidth),
    handleWidth: Math.max(0, controlHeightSm - lineWidth * 2),
    handleFontSize: fontSize / 2,
    outlineWidth,
    colorBorder: themeToken(theme, 'colorBorder', '#d9d9d9'),
    colorBg: themeToken(theme, 'colorBgContainer', '#ffffff'),
    colorText: themeToken(theme, 'colorText', 'rgba(0, 0, 0, 0.88)'),
    colorArrow: themeToken(theme, 'colorTextQuaternary', 'rgba(0, 0, 0, 0.25)'),
    colorIcon: themeToken(theme, 'colorIcon', 'rgba(0, 0, 0, 0.45)'),
    colorPrimary: themeToken(theme, 'colorPrimary', '#1677ff'),
    colorPrimaryHover: themeToken(theme, 'colorPrimaryHover', '#4096ff'),
    controlOutline: themeToken(theme, 'controlOutline', 'rgba(5, 145, 255, 0.1)'),
    motion: themeToken(theme, 'motionDurationMid', '0.2s'),
  };
};

const ANT_DOWN_PATH =
  'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z';
const ANT_UP_PATH =
  'M890.5 755.3L537.9 269.2c-12.8-17.6-39-17.6-51.7 0L133.5 755.3A8 8 0 00140 768h75c5.1 0 9.9-2.5 12.9-6.6L512 369.8l284.1 391.6c3 4.1 7.8 6.6 12.9 6.6h75c6.5 0 10.3-7.4 6.5-12.7z';

const appendSvgIcon = (parent: HTMLElement, path: string, size: number) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '64 64 896 896');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  shape.setAttribute('d', path);
  svg.appendChild(shape);
  parent.appendChild(svg);
};

const ensurePanelControlStyles = (
  rootElement: HTMLElement,
  metrics: ReturnType<typeof panelControlMetrics>,
) => {
  rootElement.style.setProperty('--pdfme-hover-border', metrics.colorPrimaryHover);
  rootElement.style.setProperty('--pdfme-active-border', metrics.colorPrimary);
  rootElement.style.setProperty('--pdfme-outline', metrics.controlOutline);
  rootElement.style.setProperty('--pdfme-outline-width', `${metrics.outlineWidth}px`);
  rootElement.style.setProperty('--pdfme-handle-width', `${metrics.handleWidth}px`);
  rootElement.style.setProperty('--pdfme-handle-hover', metrics.colorPrimary);
  if (rootElement.querySelector('style[data-pdfme-column-controls]')) return;
  const style = document.createElement('style');
  style.dataset.pdfmeColumnControls = 'true';
  style.textContent = `
.pdfme-column-select:hover,
.pdfme-column-number:hover {
  border-color: var(--pdfme-hover-border);
}
.pdfme-column-select:focus-within,
.pdfme-column-number:focus-within {
  border-color: var(--pdfme-active-border);
  box-shadow: 0 0 0 var(--pdfme-outline-width) var(--pdfme-outline);
  outline: 0;
}
.pdfme-column-select-input,
.pdfme-column-number-input {
  outline: none;
}
.pdfme-column-select-input {
  appearance: none;
  -webkit-appearance: none;
}
.pdfme-column-number-input {
  appearance: textfield;
  -moz-appearance: textfield;
}
.pdfme-column-number-input::-webkit-outer-spin-button,
.pdfme-column-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.pdfme-column-number-handlers {
  opacity: 0;
  width: 0;
}
.pdfme-column-number:hover .pdfme-column-number-handlers,
.pdfme-column-number:focus-within .pdfme-column-number-handlers {
  opacity: 1;
  width: var(--pdfme-handle-width);
}
.pdfme-column-number-handler:hover {
  color: var(--pdfme-handle-hover);
  height: 60%;
}
`;
  rootElement.appendChild(style);
};

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
  metrics: ReturnType<typeof panelControlMetrics>,
  layout: { width?: string; flex?: string },
  onChange: (value: string) => void,
) => {
  const shell = document.createElement('div');
  shell.className = 'pdfme-column-select';
  shell.style.position = 'relative';
  shell.style.display = 'inline-flex';
  shell.style.alignItems = 'center';
  shell.style.boxSizing = 'border-box';
  shell.style.height = `${metrics.controlHeight}px`;
  shell.style.border = `${metrics.lineWidth}px solid ${metrics.colorBorder}`;
  shell.style.borderRadius = `${metrics.borderRadius}px`;
  shell.style.background = metrics.colorBg;
  shell.style.overflow = 'hidden';
  shell.style.transition = `all ${metrics.motion}`;
  shell.style.flexShrink = layout.flex ? '1' : '0';
  if (layout.width) shell.style.width = layout.width;
  if (layout.flex) {
    shell.style.flex = layout.flex;
    shell.style.minWidth = '0';
  }

  const select = document.createElement('select');
  select.className = 'pdfme-column-select-input';
  select.dataset.control = control;
  select.dataset.columnIndex = String(columnIndex);
  select.style.width = '100%';
  select.style.height = '100%';
  select.style.boxSizing = 'border-box';
  select.style.margin = '0';
  select.style.border = '0';
  select.style.borderRadius = `${metrics.borderRadius}px`;
  select.style.background = 'transparent';
  select.style.padding = `0 ${metrics.paddingInline + 18}px 0 ${metrics.paddingInline}px`;
  select.style.font = 'inherit';
  select.style.fontSize = `${metrics.fontSize}px`;
  select.style.lineHeight = `${metrics.controlHeight - metrics.lineWidth * 2}px`;
  select.style.color = metrics.colorText;
  select.style.cursor = 'pointer';
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

  const arrow = document.createElement('span');
  arrow.className = 'pdfme-column-select-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.style.position = 'absolute';
  arrow.style.top = '50%';
  arrow.style.right = `${metrics.paddingInline}px`;
  arrow.style.transform = 'translateY(-50%)';
  arrow.style.display = 'flex';
  arrow.style.width = '12px';
  arrow.style.height = '12px';
  arrow.style.color = metrics.colorArrow;
  arrow.style.fontSize = '12px';
  arrow.style.lineHeight = '1';
  arrow.style.pointerEvents = 'none';
  appendSvgIcon(arrow, ANT_DOWN_PATH, 12);

  shell.appendChild(select);
  shell.appendChild(arrow);
  parent.appendChild(shell);
  return select;
};

const appendNumberInput = (
  parent: HTMLElement,
  value: string,
  columnIndex: number,
  ariaLabel: string,
  metrics: ReturnType<typeof panelControlMetrics>,
  onCommit: (input: HTMLInputElement) => void,
) => {
  const shell = document.createElement('div');
  shell.className = 'pdfme-column-number';
  shell.style.position = 'relative';
  shell.style.display = 'inline-flex';
  shell.style.alignItems = 'center';
  shell.style.boxSizing = 'border-box';
  shell.style.width = '72px';
  shell.style.height = `${metrics.controlHeight}px`;
  shell.style.flexShrink = '0';
  shell.style.border = `${metrics.lineWidth}px solid ${metrics.colorBorder}`;
  shell.style.borderRadius = `${metrics.borderRadius}px`;
  shell.style.background = metrics.colorBg;
  shell.style.transition = `all ${metrics.motion}`;
  shell.style.overflow = 'hidden';

  const input = document.createElement('input');
  input.type = 'number';
  input.min = '1';
  input.step = '1';
  input.className = 'pdfme-column-number-input';
  input.dataset.control = 'imageHeight';
  input.dataset.columnIndex = String(columnIndex);
  input.setAttribute('aria-label', ariaLabel);
  input.style.width = '100%';
  input.style.height = '100%';
  input.style.boxSizing = 'border-box';
  input.style.margin = '0';
  input.style.border = '0';
  input.style.borderRadius = '0';
  input.style.background = 'transparent';
  input.style.padding = `0 ${metrics.paddingInline}px`;
  input.style.font = 'inherit';
  input.style.fontSize = `${metrics.fontSize}px`;
  input.style.lineHeight = '22px';
  input.style.color = metrics.colorText;
  input.value = value;
  input.addEventListener('change', () => {
    onCommit(input);
  });

  const handlers = document.createElement('div');
  handlers.className = 'pdfme-column-number-handlers';
  handlers.style.position = 'absolute';
  handlers.style.top = '0';
  handlers.style.right = '0';
  handlers.style.bottom = '0';
  handlers.style.display = 'flex';
  handlers.style.flexDirection = 'column';
  handlers.style.overflow = 'hidden';
  handlers.style.background = metrics.colorBg;
  handlers.style.borderRadius = `0 ${metrics.borderRadius}px ${metrics.borderRadius}px 0`;
  handlers.style.transition = `all ${metrics.motion}`;

  const step = (delta: number) => {
    const current = Number(input.value);
    const base = Number.isFinite(current) ? current : Number(value);
    const next = Math.max(1, base + delta);
    if (next === base) return;
    input.value = String(next);
    input.dispatchEvent(new Event('change'));
  };

  const addHandler = (direction: 'up' | 'down', path: string, label: string) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pdfme-column-number-handler';
    button.dataset.control = direction === 'up' ? 'imageHeightUp' : 'imageHeightDown';
    button.setAttribute('aria-label', label);
    button.style.flex = '1 1 50%';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.margin = '0';
    button.style.padding = '0';
    button.style.border = '0';
    button.style.borderLeft = `${metrics.lineWidth}px solid ${metrics.colorBorder}`;
    button.style.background = 'transparent';
    button.style.color = metrics.colorIcon;
    button.style.cursor = 'pointer';
    button.style.lineHeight = '0';
    if (direction === 'down') {
      button.style.borderTop = `${metrics.lineWidth}px solid ${metrics.colorBorder}`;
    }
    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });
    button.addEventListener('click', () => {
      step(direction === 'up' ? 1 : -1);
    });
    appendSvgIcon(button, path, metrics.handleFontSize);
    handlers.appendChild(button);
  };

  addHandler('up', ANT_UP_PATH, 'Increase Value');
  addHandler('down', ANT_DOWN_PATH, 'Decrease Value');
  shell.appendChild(input);
  shell.appendChild(handlers);
  parent.appendChild(shell);
  return input;
};

const appendButtonGroup = (
  parent: HTMLElement,
  control: 'alignment' | 'verticalAlignment',
  buttons: AlignButton[],
  current: string | undefined,
  columnIndex: number,
  colors: { primary: string; border: string; text: string },
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
    element.style.border = `1px solid ${active ? colors.primary : colors.border}`;
    element.style.marginLeft = index === 0 ? '0' : '-1px';
    element.style.borderRadius =
      index === 0 ? '6px 0 0 6px' : index === buttons.length - 1 ? '0 6px 6px 0' : '0';
    element.style.position = 'relative';
    element.style.zIndex = active ? '1' : '0';
    appendIcon(element, button.icon, active ? colors.primary : colors.text);
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
  const metrics = panelControlMetrics(props.theme);
  ensurePanelControlStyles(rootElement, metrics);
  const colors = {
    primary: themeToken(props.theme, 'colorPrimary', '#1677ff'),
    border: themeToken(props.theme, 'colorBorder', '#d9d9d9'),
    text: themeToken(props.theme, 'colorText', '#000000'),
    split: themeToken(props.theme, 'colorSplit', '#f0f0f0'),
  };
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
    if (index !== head.length - 1) block.style.borderBottom = `1px solid ${colors.split}`;

    const body = document.createElement('div');
    body.dataset.control = 'column-body';

    const expanded =
      collapsible && expandedColumnBlocks.has(columnBlockKey(activeSchema.id, index));

    if (collapsible) {
      const summary = document.createElement('button');
      summary.type = 'button';
      summary.dataset.control = 'summary';
      summary.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      summary.setAttribute('aria-label', `Expand ${label}`);
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
        appendIcon(icon, alignmentIcon.icon, colors.text, 14);
        summary.appendChild(icon);
      }
      const verticalIcon = VERTICAL_ALIGNMENTS.find((button) => button.value === verticalAlignment);
      if (verticalIcon) {
        const icon = document.createElement('span');
        icon.dataset.control = 'summary-vertical-alignment';
        icon.dataset.value = verticalIcon.value;
        icon.style.lineHeight = '0';
        icon.style.flexShrink = '0';
        appendIcon(icon, verticalIcon.icon, colors.text, 14);
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
        expandedColumnBlocks.add(columnBlockKey(activeSchema.id, index));
        summary.hidden = true;
        summary.setAttribute('aria-expanded', 'true');
        body.hidden = false;
      });
      summary.hidden = expanded;
      body.hidden = !expanded;
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
      collapse.setAttribute('aria-label', `Collapse ${label}`);
      collapse.textContent = '▾';
      collapse.style.border = 'none';
      collapse.style.background = 'transparent';
      collapse.style.cursor = 'pointer';
      collapse.style.padding = '0 2px 0 0';
      collapse.style.lineHeight = '1';
      collapse.addEventListener('click', () => {
        expandedColumnBlocks.delete(columnBlockKey(activeSchema.id, index));
        const summary = block.querySelector<HTMLButtonElement>('[data-control="summary"]');
        if (summary) {
          summary.hidden = false;
          summary.setAttribute('aria-expanded', 'false');
        }
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
      metrics,
      { width: '110px' },
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
      colors,
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
      colors,
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
        metrics,
        { flex: '1' },
        (value) => {
          if (value !== 'fixed' && value !== 'auto') return;
          if (value === mode) return;
          setImageHeightMode(props, table, index, value);
        },
      );

      if (mode === 'fixed') {
        const displayHeight = resolveFixedTableImageHeight(columnStyles.imageHeight?.[index]);
        appendNumberInput(
          imageRow,
          String(displayHeight),
          index,
          i18n('schemas.table.imageHeightMode.fixed'),
          metrics,
          (input) => {
            const parsed = Number(input.value);
            if (!Number.isFinite(parsed) || parsed <= 0) {
              input.value = String(displayHeight);
              return;
            }
            setImageHeight(props, table, index, parsed);
          },
        );
      }
      body.appendChild(imageRow);
    }

    block.appendChild(body);
    rootElement.appendChild(block);
  });
};
