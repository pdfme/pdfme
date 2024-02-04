import {
  Plugin,
  PDFRenderProps,
  UIRenderProps,
  getFallbackFontName,
  DEFAULT_FONT_NAME,
} from '@pdfme/common';
import { createSingleTable, drawTable, Styles, RowType, parseSpacing } from './tableHelper.js';
import {
  getDefaultCellStyles,
  getCellPropPanelSchema,
  getColumnStylesPropPanelSchema,
} from './helper.js';
import type { TableSchema, CellStyle } from './types.js';
import cell from './cell.js';
import { HEX_COLOR_PATTERN } from '../constants.js';
import { px2mm } from '../utils';

const cellUiRender = cell.ui;

const convertToCellStyle = (styles: Styles): CellStyle => ({
  fontName: styles.fontName,
  alignment: styles.alignment,
  verticalAlignment: styles.verticalAlignment,
  fontSize: styles.fontSize,
  lineHeight: styles.lineHeight,
  characterSpacing: styles.characterSpacing,
  backgroundColor: styles.backgroundColor,
  // ---
  fontColor: styles.textColor,
  borderColor: styles.lineColor,
  borderWidth: parseSpacing(styles.lineWidth),
  padding: parseSpacing(styles.cellPadding),
});

const calcResizedHeadWidthPercentages = (arg: {
  currentHeadWidthPercentages: number[];
  currentHeadWidths: number[];
  changedHeadWidth: number;
  changedHeadIndex: number;
}) => {
  const { currentHeadWidthPercentages, currentHeadWidths, changedHeadWidth, changedHeadIndex } =
    arg;
  const headWidthPercentages = [...currentHeadWidthPercentages];
  const totalWidth = currentHeadWidths.reduce((a, b) => a + b, 0);
  const changedWidthPercentage = (changedHeadWidth / totalWidth) * 100;
  const originalNextWidthPercentage = headWidthPercentages[changedHeadIndex + 1] ?? 0;
  const adjustment = headWidthPercentages[changedHeadIndex] - changedWidthPercentage;
  headWidthPercentages[changedHeadIndex] = changedWidthPercentage;
  if (changedHeadIndex + 1 < headWidthPercentages.length) {
    headWidthPercentages[changedHeadIndex + 1] = originalNextWidthPercentage + adjustment;
  }
  return headWidthPercentages;
};

const renderRowUi = (args: {
  rows: RowType[];
  arg: UIRenderProps<TableSchema>;
  editingPosition: { rowIndex: number; colIndex: number };
  onChangeEditingPosition: (position: { rowIndex: number; colIndex: number }) => void;
  offsetY?: number;
}) => {
  const { rows, arg, onChangeEditingPosition, offsetY = 0, editingPosition: ep } = args;
  const value = JSON.parse(arg.value || '[]') as string[][];

  // TODO 外側のボーダーが増えた時に内側のサイズを調整する必要がある
  // border-collapse: collapse; と同じスタイルにする
  // 重なるボーダーは一つにするこれはテーブル自体もそうだが、セルも同じようにする
  // const tableBorderWidth = arg.schema.tableStyles.borderWidth;
  let rowOffsetY = offsetY;
  rows.forEach((row, rowIndex) => {
    const { cells, height, section } = row;
    let colWidth = 0;
    Object.values(cells).forEach((cell, colIndex) => {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.top = `${rowOffsetY}mm`;
      div.style.left = `${colWidth}mm`;
      div.style.width = `${cell.width}mm`;
      div.style.height = `${cell.height}mm`;
      div.addEventListener('click', () => {
        if (arg.mode !== 'designer') return;
        onChangeEditingPosition({ rowIndex, colIndex });
      });
      arg.rootElement.appendChild(div);
      const isEditing = ep.rowIndex === rowIndex && ep.colIndex === colIndex;
      let mode: 'form' | 'viewer' | 'designer' = 'viewer';
      if (arg.mode === 'form') {
        mode = section === 'head' ? 'viewer' : 'form';
      } else if (arg.mode === 'designer') {
        mode = isEditing ? 'designer' : 'viewer';
      }

      void cellUiRender({
        ...arg,
        stopEditing: resetEditingPosition,
        mode,
        onChange: (v) => {
          if (!arg.onChange) return;
          const newValue = (Array.isArray(v) ? v[0].value : v.value) as string;
          if (section === 'body') {
            // TODO onChangeを呼び出すと再レンダリングが走ってフォーカスが外れる
            value[rowIndex][colIndex] = newValue;
            arg.onChange({ key: 'content', value: JSON.stringify(value) });
          } else {
            const newHead = [...arg.schema.head];
            newHead[colIndex] = newValue;
            arg.onChange({ key: 'head', value: newHead });
          }
        },
        value: cell.raw,
        placeholder: '',
        rootElement: div,
        schema: {
          type: 'cell',
          content: cell.raw,
          position: { x: colWidth, y: rowOffsetY },
          width: cell.width,
          height: cell.height,
          ...convertToCellStyle(cell.styles),
        },
      });
      colWidth += cell.width;
    });
    rowOffsetY += height;
  });
};

const headEditingPosition = { rowIndex: -1, colIndex: -1 };
const bodyEditingPosition = { rowIndex: -1, colIndex: -1 };
const resetEditingPosition = () => {
  headEditingPosition.rowIndex = -1;
  headEditingPosition.colIndex = -1;
  bodyEditingPosition.rowIndex = -1;
  bodyEditingPosition.colIndex = -1;
};

const getBody = (value: string, schema: TableSchema) => {
  const range = schema.__bodyRange;
  const body = JSON.parse(value || '[]') as string[][];
  if (!range) return body;
  return body.slice(range.start, range.end);
};

const tableSchema: Plugin<TableSchema> = {
  pdf: async (arg: PDFRenderProps<TableSchema>) => {
    const { value, schema } = arg;
    const body = getBody(value, schema);
    const table = await createSingleTable(body, arg);
    await drawTable(arg, table);
  },
  ui: async (arg: UIRenderProps<TableSchema>) => {
    const { rootElement, onChange, schema, value, mode } = arg;
    const body = getBody(value, schema);
    const table = await createSingleTable(body, arg);

    rootElement.innerHTML = '';

    rootElement.style.borderColor = schema.tableStyles.borderColor;
    rootElement.style.borderWidth = String(schema.tableStyles.borderWidth) + 'mm';
    rootElement.style.borderStyle = 'solid';
    rootElement.style.boxSizing = 'border-box';

    const handleChangeEditingPosition = (
      newPosition: { rowIndex: number; colIndex: number },
      editingPosition: { rowIndex: number; colIndex: number }
    ) => {
      resetEditingPosition();
      editingPosition.rowIndex = newPosition.rowIndex;
      editingPosition.colIndex = newPosition.colIndex;
      void tableSchema.ui(arg);
    };

    if (schema.showHead) {
      renderRowUi({
        rows: table.head,
        arg,
        editingPosition: headEditingPosition,
        onChangeEditingPosition: (p) => handleChangeEditingPosition(p, headEditingPosition),
      });
    }

    const offsetY = schema.showHead ? table.getHeadHeight() : 0;
    renderRowUi({
      rows: table.body,
      arg,
      editingPosition: bodyEditingPosition,
      onChangeEditingPosition: (p) => handleChangeEditingPosition(p, bodyEditingPosition),
      offsetY,
    });

    if (mode === 'form' && onChange) {
      if (schema.__bodyRange?.end === undefined || schema.__bodyRange.end < body.length) {
        const addRowButton = document.createElement('button');
        addRowButton.style.width = '30px';
        addRowButton.style.height = '30px';
        addRowButton.style.position = 'absolute';
        addRowButton.style.bottom = '-30px';
        addRowButton.style.left = 'calc(50% - 15px)';
        addRowButton.innerText = '+';
        addRowButton.onclick = () => {
          const newRow = Array(schema.head.length).fill('') as string[];
          onChange({ key: 'content', value: JSON.stringify(body.concat([newRow])) });
        };
        rootElement.appendChild(addRowButton);
      }

      let offsetY = schema.showHead ? table.getHeadHeight() : 0;
      table.body.forEach((row, i) => {
        offsetY = offsetY + row.height;
        const removeRowButton = document.createElement('button');
        removeRowButton.style.width = '30px';
        removeRowButton.style.height = '30px';
        removeRowButton.style.position = 'absolute';
        removeRowButton.style.top = `${offsetY - px2mm(30)}mm`;
        removeRowButton.style.right = '-30px';
        removeRowButton.innerText = '-';
        removeRowButton.onclick = () => {
          const newTableBody = body.filter((_, j) => j !== i);
          onChange({ key: 'content', value: JSON.stringify(newTableBody) });
        };
        rootElement.appendChild(removeRowButton);
      });
    }

    if (mode === 'designer' && onChange) {
      const addColumnButton = document.createElement('button');
      addColumnButton.style.width = '30px';
      addColumnButton.style.height = '30px';
      addColumnButton.style.position = 'absolute';
      addColumnButton.style.top = `${table.getHeadHeight() - px2mm(30)}mm`;
      addColumnButton.style.right = '-30px';
      addColumnButton.innerText = '+';
      addColumnButton.onclick = (e) => {
        e.preventDefault();
        const newColumnWidthPercentage = 25;
        const totalCurrentWidth = schema.headWidthPercentages.reduce(
          (acc, width) => acc + width,
          0
        );
        const scalingRatio = (100 - newColumnWidthPercentage) / totalCurrentWidth;
        const scaledWidths = schema.headWidthPercentages.map((width) => width * scalingRatio);
        onChange([
          { key: 'head', value: schema.head.concat(`Head ${schema.head.length + 1}`) },
          { key: 'headWidthPercentages', value: scaledWidths.concat(newColumnWidthPercentage) },
          {
            key: 'content',
            value: JSON.stringify(body.map((row, i) => row.concat(`Row ${i + 1}`))),
          },
        ]);
      };
      rootElement.appendChild(addColumnButton);

      let offsetX = 0;
      table.columns.forEach((column, i) => {
        offsetX = offsetX + column.width;
        const removeColumnButton = document.createElement('button');
        removeColumnButton.style.width = '30px';
        removeColumnButton.style.height = '30px';
        removeColumnButton.style.position = 'absolute';
        removeColumnButton.style.top = '-30px';
        removeColumnButton.style.left = `${offsetX - px2mm(30)}mm`;
        removeColumnButton.innerText = '-';
        removeColumnButton.onclick = (e) => {
          e.preventDefault();
          const totalWidthMinusRemoved = schema.headWidthPercentages.reduce(
            (sum, width, j) => (j !== i ? sum + width : sum),
            0
          );

          // TODO 削除時に削除されたcolumnStylesも削除するべき

          onChange([
            { key: 'head', value: schema.head.filter((_, j) => j !== i) },
            {
              key: 'headWidthPercentages',
              value: schema.headWidthPercentages
                .filter((_, j) => j !== i)
                .map((width) => (width / totalWidthMinusRemoved) * 100),
            },
            {
              key: 'content',
              value: JSON.stringify(body.map((row) => row.filter((_, j) => j !== i))),
            },
          ]);
        };
        rootElement.appendChild(removeColumnButton);

        if (i === table.columns.length - 1) return;

        const dragHandle = document.createElement('div');
        const lineWidth = 5;
        dragHandle.style.width = `${lineWidth}px`;
        dragHandle.style.height = '100%';
        dragHandle.style.backgroundColor = '#eee';
        dragHandle.style.opacity = '0.5';
        dragHandle.style.cursor = 'col-resize';
        dragHandle.style.position = 'absolute';
        dragHandle.style.zIndex = '10';
        dragHandle.style.left = `${offsetX - px2mm(lineWidth) / 2}mm`;
        dragHandle.style.top = '0';
        const setColor = (e: MouseEvent) => {
          const handle = e.target as HTMLDivElement;
          handle.style.backgroundColor = '#2196f3';
        };
        const resetColor = (e: MouseEvent) => {
          const handle = e.target as HTMLDivElement;
          handle.style.backgroundColor = '#eee';
        };
        dragHandle.addEventListener('mouseover', setColor);
        dragHandle.addEventListener('mouseout', resetColor);

        const prevColumnLeft = offsetX - column.width;
        const nextColumnRight = offsetX - px2mm(lineWidth) + table.columns[i + 1].width;

        dragHandle.addEventListener('mousedown', (e) => {
          resetEditingPosition();
          const handle = e.target as HTMLDivElement;
          dragHandle.removeEventListener('mouseover', setColor);
          dragHandle.removeEventListener('mouseout', resetColor);

          let move = 0;
          const mouseMove = (e: MouseEvent) => {
            // TODO ドラッグ&ドロップに対してnewLeftがずれていく問題がある
            let moveX = e.movementX;
            const currentLeft = Number(handle.style.left.replace('mm', ''));
            let newLeft = currentLeft + moveX;
            if (newLeft < prevColumnLeft) {
              newLeft = prevColumnLeft;
              moveX = newLeft - currentLeft;
            }
            if (newLeft >= nextColumnRight) {
              newLeft = nextColumnRight;
              moveX = newLeft - currentLeft;
            }
            handle.style.left = `${newLeft}mm`;
            move += moveX;
          };
          rootElement.addEventListener('mousemove', mouseMove);

          const commitResize = () => {
            if (move !== 0) {
              const newHeadWidthPercentages = calcResizedHeadWidthPercentages({
                currentHeadWidthPercentages: schema.headWidthPercentages,
                currentHeadWidths: table.columns.map((column) => column.width),
                changedHeadWidth: table.columns[i].width + move,
                changedHeadIndex: i,
              });
              onChange({ key: 'headWidthPercentages', value: newHeadWidthPercentages });
            }
            move = 0;
            dragHandle.addEventListener('mouseover', setColor);
            dragHandle.addEventListener('mouseout', resetColor);
            rootElement.removeEventListener('mousemove', mouseMove);
            rootElement.removeEventListener('mouseup', commitResize);
          };
          rootElement.addEventListener('mouseup', commitResize);
        });
        rootElement.appendChild(dragHandle);
      });
    }

    if (mode === 'viewer') {
      resetEditingPosition();
    }

    const tableHeight = schema.showHead ? table.getHeight() : table.getBodyHeight();
    if (schema.height !== tableHeight && onChange) {
      onChange({ key: 'height', value: tableHeight });
    }
  },
  propPanel: {
    schema: ({ activeSchema, options, i18n }) => {
      // @ts-ignore
      const head = (activeSchema.head || []) as string[];
      const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } };
      const fontNames = Object.keys(font);
      const fallbackFontName = getFallbackFontName(font);
      return {
        tableStyles: {
          title: i18n('schemas.table.tableStyle'),
          type: 'object',
          widget: 'Card',
          span: 24,
          properties: {
            borderWidth: {
              title: i18n('schemas.borderWidth'),
              type: 'number',
              widget: 'inputNumber',
              props: { min: 0, step: 0.1 },
              step: 1,
            },
            borderColor: {
              title: i18n('schemas.borderColor'),
              type: 'string',
              widget: 'color',
              rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
            },
          },
        },
        headStyles: {
          title: i18n('schemas.table.headStyle'),
          type: 'object',
          widget: 'Card',
          span: 24,
          properties: getCellPropPanelSchema({ i18n, fallbackFontName, fontNames }),
        },
        bodyStyles: {
          title: i18n('schemas.table.bodyStyle'),
          type: 'object',
          widget: 'Card',
          span: 24,
          properties: getCellPropPanelSchema({ i18n, fallbackFontName, fontNames, isBody: true }),
        },
        columnStyles: {
          title: i18n('schemas.table.columnStyle'),
          type: 'object',
          widget: 'Card',
          span: 24,
          properties: getColumnStylesPropPanelSchema({ head, i18n }),
        },
      };
    },
    defaultSchema: {
      type: 'table',
      position: { x: 0, y: 0 },
      width: 150,
      height: 20,
      content: JSON.stringify([
        ['Alice', 'New York', 'Alice is a freelance web designer and developer'],
        ['Bob', 'Paris', 'Bob is a freelance illustrator and graphic designer'],
      ]),
      showHead: true,
      head: ['Name', 'City', 'Description'],
      headWidthPercentages: [30, 30, 40],
      tableStyles: {
        borderColor: '#000000',
        borderWidth: 0.3,
      },
      headStyles: Object.assign(getDefaultCellStyles(), {
        fontColor: '#ffffff',
        backgroundColor: '#2980ba',
        borderColor: '',
        borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
      }),
      bodyStyles: Object.assign(getDefaultCellStyles(), {
        alternateBackgroundColor: '#f5f5f5',
      }),
      columnStyles: {},
    },
  },
};
export default tableSchema;
