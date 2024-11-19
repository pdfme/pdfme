import type { UIRenderProps, Mode } from '@pdfme/common';
import type { TableSchema, CellStyle, Styles } from './types.js';
import { px2mm } from '@pdfme/common';
import { createSingleTable } from './tableHelper.js';
import { getBody, getBodyWithRange } from './helper.js';
import cell from './cell.js';
import { Row } from './classes';

const buttonSize = 30;

function createButton(options: {
  width: number;
  height: number;
  top: string;
  left?: string;
  right?: string;
  text: string;
  onClick: (e: MouseEvent) => void;
}): HTMLButtonElement {
  const button = document.createElement('button');
  button.style.width = `${options.width}px`;
  button.style.height = `${options.height}px`;
  button.style.position = 'absolute';
  button.style.top = options.top;
  if (options.left !== undefined) {
    button.style.left = options.left;
  }
  if (options.right !== undefined) {
    button.style.right = options.right;
  }
  button.innerText = options.text;
  button.onclick = options.onClick;
  return button;
}

type RowType = InstanceType<typeof Row>;

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
  borderWidth: styles.lineWidth,
  padding: styles.cellPadding,
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

const setBorder = (
  div: HTMLDivElement,
  borderPosition: 'Top' | 'Left' | 'Right' | 'Bottom',
  arg: UIRenderProps<TableSchema>
) => {
  div.style[`border${borderPosition}`] = `${String(arg.schema.tableStyles.borderWidth)}mm solid ${
    arg.schema.tableStyles.borderColor
  }`;
};

const drawBorder = (
  div: HTMLDivElement,
  row: RowType,
  colIndex: number,
  rowIndex: number,
  rowsLength: number,
  arg: UIRenderProps<TableSchema>
) => {
  const isFirstColumn = colIndex === 0;
  const isLastColumn = colIndex === Object.values(row.cells).length - 1;
  const isLastRow = rowIndex === rowsLength - 1;

  if (row.section === 'head') {
    setBorder(div, 'Top', arg);
    if (isFirstColumn) setBorder(div, 'Left', arg);
    if (isLastColumn) setBorder(div, 'Right', arg);
    if ((JSON.parse(arg.value || '[]') as string[][]).length === 0) {
      setBorder(div, 'Bottom', arg);
    }
  } else if (row.section === 'body') {
    if (!arg.schema.showHead && rowIndex === 0) {
      setBorder(div, 'Top', arg);
    }
    if (isFirstColumn) setBorder(div, 'Left', arg);
    if (isLastColumn) setBorder(div, 'Right', arg);
    if (isLastRow) setBorder(div, 'Bottom', arg);
  }
};

const renderRowUi = (args: {
  rows: RowType[];
  arg: UIRenderProps<TableSchema>;
  editingPosition: { rowIndex: number; colIndex: number };
  onChangeEditingPosition: (position: { rowIndex: number; colIndex: number }) => void;
  offsetY?: number;
}) => {
  const { rows, arg, onChangeEditingPosition, offsetY = 0, editingPosition } = args;
  const value = JSON.parse(arg.value || '[]') as string[][];

  let rowOffsetY = offsetY;
  rows.forEach((row, rowIndex) => {
    const { cells, height, section } = row;
    let colOffsetX = 0;
    Object.values(cells).forEach((cell, colIndex) => {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.top = `${rowOffsetY}mm`;
      div.style.left = `${colOffsetX}mm`;
      div.style.width = `${cell.width}mm`;
      div.style.height = `${cell.height}mm`;
      div.style.boxSizing = 'border-box';

      drawBorder(div, row, colIndex, rowIndex, rows.length, arg);

      div.style.cursor =
        arg.mode === 'designer' || (arg.mode === 'form' && section === 'body') ? 'text' : 'default';

      div.addEventListener('click', () => {
        if (arg.mode === 'viewer') return;
        onChangeEditingPosition({ rowIndex, colIndex });
      });
      arg.rootElement.appendChild(div);
      const isEditing =
        editingPosition.rowIndex === rowIndex && editingPosition.colIndex === colIndex;
      let mode: Mode = 'viewer';
      if (arg.mode === 'form') {
        mode = section === 'body' && isEditing && !arg.schema.readOnly ? 'designer' : 'viewer';
      } else if (arg.mode === 'designer') {
        mode = isEditing ? 'designer' : 'form';
      }

      void cellUiRender({
        ...arg,
        stopEditing: () => {
          if (arg.mode === 'form') {
            resetEditingPosition();
          }
        },
        mode,
        onChange: (v) => {
          if (!arg.onChange) return;
          const newValue = (Array.isArray(v) ? v[0].value : v.value) as string;
          if (section === 'body') {
            const startRange = arg.schema.__bodyRange?.start ?? 0;
            value[rowIndex + startRange][colIndex] = newValue;
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
          name: '',
          type: 'cell',
          content: cell.raw,
          position: { x: colOffsetX, y: rowOffsetY },
          width: cell.width,
          height: cell.height,
          ...convertToCellStyle(cell.styles),
        },
      });
      colOffsetX += cell.width;
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

export const uiRender = async (arg: UIRenderProps<TableSchema>) => {
  const { rootElement, onChange, schema, value, mode } = arg;
  const body = getBody(value);
  const bodyWidthRange = getBodyWithRange(value, schema.__bodyRange);
  const table = await createSingleTable(bodyWidthRange, arg);
  const showHead = table.settings.showHead;

  rootElement.innerHTML = '';

  const handleChangeEditingPosition = (
    newPosition: { rowIndex: number; colIndex: number },
    editingPosition: { rowIndex: number; colIndex: number }
  ) => {
    resetEditingPosition();
    editingPosition.rowIndex = newPosition.rowIndex;
    editingPosition.colIndex = newPosition.colIndex;
    void uiRender(arg);
  };

  if (showHead) {
    renderRowUi({
      rows: table.head,
      arg,
      editingPosition: headEditingPosition,
      onChangeEditingPosition: (p) => handleChangeEditingPosition(p, headEditingPosition),
    });
  }

  const offsetY = showHead ? table.getHeadHeight() : 0;
  renderRowUi({
    rows: table.body,
    arg,
    editingPosition: bodyEditingPosition,
    onChangeEditingPosition: (p) => {
      handleChangeEditingPosition(p, bodyEditingPosition);
    },
    offsetY,
  });

  const createAddRowButton = () =>
    createButton({
      width: buttonSize,
      height: buttonSize,
      top: `${table.getHeight()}mm`,
      left: `calc(50% - ${buttonSize / 2}px)`,
      text: '+',
      onClick: () => {
        const newRow = Array(schema.head.length).fill('') as string[];
        onChange && onChange({ key: 'content', value: JSON.stringify(body.concat([newRow])) });
      },
    });

  const createRemoveRowButtons = () => {
    let offsetY = showHead ? table.getHeadHeight() : 0;
    return table.body.map((row, i) => {
      offsetY = offsetY + row.height;
      const removeRowButton = createButton({
        width: buttonSize,
        height: buttonSize,
        top: `${offsetY - px2mm(buttonSize)}mm`,
        right: `-${buttonSize}px`,
        text: '-',
        onClick: () => {
          const newTableBody = body.filter((_, j) => j !== i + (schema.__bodyRange?.start ?? 0));
          onChange && onChange({ key: 'content', value: JSON.stringify(newTableBody) });
        },
      });
      return removeRowButton;
    });
  };

  if (mode === 'form' && onChange && !schema.readOnly) {
    if (
      schema.__bodyRange?.end === undefined ||
      schema.__bodyRange.end >= (JSON.parse(value || '[]') as string[][]).length
    ) {
      rootElement.appendChild(createAddRowButton());
    }

    createRemoveRowButtons().forEach((button) => rootElement.appendChild(button));
  }

  if (mode === 'designer' && onChange) {
    const addColumnButton = createButton({
      width: buttonSize,
      height: buttonSize,
      top: `${(showHead ? table.getHeadHeight() : 0) - px2mm(buttonSize)}mm`,
      right: `-${buttonSize}px`,
      text: '+',
      onClick: (e) => {
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
            value: JSON.stringify(bodyWidthRange.map((row, i) => row.concat(`Row ${i + 1}`))),
          },
        ]);
      },
    });
    rootElement.appendChild(addColumnButton);

    rootElement.appendChild(createAddRowButton());

    createRemoveRowButtons().forEach((button) => rootElement.appendChild(button));

    let offsetX = 0;
    table.columns.forEach((column, i, columns) => {
      if (columns.length === 1) return;
      offsetX = offsetX + column.width;
      const removeColumnButton = createButton({
        width: buttonSize,
        height: buttonSize,
        top: `${-buttonSize}px`,
        left: `${offsetX - px2mm(buttonSize)}mm`,
        text: '-',
        onClick: () => {
          const totalWidthMinusRemoved = schema.headWidthPercentages.reduce(
            (sum, width, j) => (j !== i ? sum + width : sum),
            0
          );

          // TODO Should also remove the deleted columnStyles when deleting
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
              value: JSON.stringify(bodyWidthRange.map((row) => row.filter((_, j) => j !== i))),
            },
          ]);
        },
      });
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
          // TODO There is an issue where newLeft gets displaced with drag & drop
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

  const tableHeight = showHead ? table.getHeight() : table.getBodyHeight();
  if (schema.height !== tableHeight && onChange) {
    onChange({ key: 'height', value: tableHeight });
  }
};
