import { Plugin, PDFRenderProps, UIRenderProps } from '@pdfme/common';
import { HEX_COLOR_PATTERN } from '../constants.js';
import { autoTable, Styles } from './autoTable';
import type { TableSchema } from './types';
import { isEditable, px2mm } from '../utils.js';

const shift = (number: number, precision: number, reverseShift: boolean) => {
  if (reverseShift) {
    precision = -precision;
  }
  const numArray = `${number}`.split('e');

  return Number(`${numArray[0]}e${numArray[1] ? Number(numArray[1]) + precision : precision}`);
};
const round = (number: number, precision: number) =>
  shift(Math.round(shift(number, precision, false)), precision, true);

const tableSchema: Plugin<TableSchema> = {
  pdf: async (arg: PDFRenderProps<TableSchema>) => {
    const { schema, value } = arg;
    const body = JSON.parse(value) as string[][];
    const table = await autoTable(arg, {
      head: [schema.head],
      body,
      startY: schema.position.y,
      tableWidth: schema.width,
      // TODO
      tableLineColor: '#ff2200',
      tableLineWidth: 0,
      headStyles: {
        // schemaからstyleのマッピング用の関数を作った方がいいだろう
        lineWidth: schema.borderWidth,
        cellPadding: schema.cellPadding + schema.borderWidth * 2,
        lineColor: schema.borderColor,
        textColor: schema.textColor,
        fillColor: schema.bgColor,
        // TODO
        // schema.fontName
        // fontSize: 14,
        fontName: 'NotoSansJP-Regular',
      },
      bodyStyles: {
        lineWidth: schema.borderWidth,
        cellPadding: schema.cellPadding + schema.borderWidth * 2,
        lineColor: schema.borderColor,
        textColor: schema.textColor,
        fillColor: schema.bgColor,
        // TODO
        // schema.fontName
        // fontSize: 14,
      },
      columnStyles: schema.headWidthsPercentage.reduce(
        (acc, cur, i) => Object.assign(acc, { [i]: { cellWidth: schema.width * (cur / 100) } }),
        {} as Record<number, Partial<Styles>>
      ),
      margin: { top: 0, right: 0, left: schema.position.x, bottom: 0 },
    });
    const tableSize = {
      width: schema.width,
      height: table.getHeadHeight() + table.getBodyHeight(),
    };
    return tableSize;
  },
  ui: (arg: UIRenderProps<TableSchema>) => {
    const { schema, rootElement, value, mode, onChange } = arg;
    const tableBody = JSON.parse(value || '[]') as string[][];
    const table = document.createElement('table');
    table.style.tableLayout = 'fixed';
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    // TODO スタイルの適応
    table.style.textAlign = 'left';
    table.style.fontSize = '14pt';

    const thTdStyle = `border: ${schema.borderWidth}mm solid ${schema.borderColor}; 
    color: ${schema.textColor}; 
    background-color: ${schema.bgColor};
    padding: ${schema.cellPadding}mm;
    position: relative;
    word-break: break-word;
    `;

    const dragHandleClass = 'table-schema-resize-handle';
    const dragHandleStyle = `width: 5px; 
    height: 100%; 
    background-color: transparent;
    cursor: col-resize; 
    position: absolute;
    right: 0;
    top: 0;
    `;

    const contentEditable = isEditable(mode, schema) ? 'contenteditable="plaintext-only"' : '';
    table.innerHTML = `<tr>${schema.head
      .map(
        (data, i) =>
          `<th ${mode === 'designer' ? contentEditable : ''} style="${
            thTdStyle + ` width: ${schema.headWidthsPercentage[i]}%;`
          }">${data}${
            mode === 'designer' && i < schema.head.length - 1
              ? `<div class="${dragHandleClass}" style="${dragHandleStyle}"></div>`
              : ''
          }</th>`
      )
      .join('')}</tr>
        ${tableBody
          .map(
            (row) =>
              `<tr>${row
                .map((data) => `<td ${contentEditable} style="${thTdStyle}">${data}</td>`)
                .join('')}</tr>`
          )
          .join('')}`;

    // TODO ここから! カラムの横幅をドラッグ&ドロップで決定できるようにしたい。
    // 問題点:
    // - headerクリック時にハンドルにフォーカスが移動してしまう。
    const dragHandles = table.querySelectorAll(`.${dragHandleClass}`)
    dragHandles.forEach((handle) => {
      handle.addEventListener('mouseover', (e) => {
        const handle = e.target as HTMLDivElement;
        handle.style.backgroundColor = '#2196f3';
      });
      handle.addEventListener('mouseout', (e) => {
        const handle = e.target as HTMLDivElement;
        handle.style.backgroundColor = 'transparent';
      });
      // TODO ここから ハンドルの位置がずれる。
      handle.addEventListener('mousedown', (e) => {
        const th = handle.parentElement;
        if (!(th instanceof HTMLTableCellElement)) return;
        const startWidth = th.offsetWidth;
        const startX = e.pageX;
        console.log('startWidth', startWidth);
        console.log('startX', startX);

        const mouseMoveHandler = (e: MouseEvent) => {
          e.preventDefault();
          const newWidth = startWidth + (e.pageX - startX);
          if (!(th instanceof HTMLTableCellElement)) return;
          th.style.width = String(newWidth) + 'px';
        };

        const mouseUpHandler = (e: MouseEvent) => {
          e.preventDefault();
          document.removeEventListener('mousemove', mouseMoveHandler);
          document.removeEventListener('mouseup', mouseUpHandler);
          const tableHeader = table.querySelectorAll('th');
          const newTableHeaderWidths = Array.from(tableHeader).map((th) => th.clientWidth);
          const tableWidth = table.offsetWidth;
          const newWidthsPercentage = newTableHeaderWidths.map(
            (width) => (width / tableWidth) * 100
          );
          onChange && onChange({ key: 'headWidthsPercentage', value: newWidthsPercentage });
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
      });
    });
    // TODO ここまで!

    const tableCell = table.querySelectorAll('td, th');
    tableCell.forEach((cell) => {
      if (!(cell instanceof HTMLTableCellElement)) return;
      cell.onblur = (e) => {
        const target = e.target as HTMLTableCellElement;
        const row = target.parentElement as HTMLTableRowElement;
        const table = row.parentElement as HTMLTableElement;
        const tableData = Array.from(table.rows).map((row) =>
          Array.from(row.cells).map((cell) => cell.innerText)
        );

        setTimeout(() => {
          if (document.activeElement instanceof HTMLTableCellElement) return;
          if (!onChange) return;
          const head = tableData[0];
          const body = tableData.slice(1);
          onChange([
            { key: 'head', value: head },
            { key: 'content', value: JSON.stringify(body) },
          ]);
        }, 25);
      };
      cell.onclick = (e) => {
        if (!(e.target instanceof HTMLTableCellElement)) return;
        if (e.target === document.activeElement) return;
        e.target.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(e.target);
        range.collapse(false); // Collapse range to the end
        selection?.removeAllRanges();
        selection?.addRange(range);
      };
    });

    rootElement.appendChild(table);

    if (mode === 'form' && onChange) {
      const addRowButton = document.createElement('button');
      addRowButton.style.position = 'absolute';
      addRowButton.style.bottom = '-25px';
      addRowButton.style.right = '0';
      addRowButton.innerText = '+';
      addRowButton.onclick = () => {
        const newRow = Array(schema.head.length).fill('') as string[];
        onChange({ key: 'content', value: JSON.stringify(tableBody.concat([newRow])) });
      };
      rootElement.appendChild(addRowButton);

      const tableRows = table.querySelectorAll('tr');
      let skipTrHeight = 0;
      tableRows.forEach((row, i) => {
        if (i === 0) {
          skipTrHeight = row.clientHeight;
          return;
        }
        const deleteRowButton = document.createElement('button');
        deleteRowButton.style.position = 'absolute';
        deleteRowButton.style.top = String(skipTrHeight) + 'px';
        deleteRowButton.style.right = '-25px';
        deleteRowButton.innerText = '-';
        deleteRowButton.onclick = () => {
          const newTableBody = tableBody.filter((_, j) => j !== i - 1); // Exclude line 0 because it is a header.
          onChange({ key: 'content', value: JSON.stringify(newTableBody) });
        };
        rootElement.appendChild(deleteRowButton);
        skipTrHeight += row.clientHeight;
      });
    } else if (mode === 'designer' && onChange) {
      const addColumnButton = document.createElement('button');
      addColumnButton.style.position = 'absolute';
      addColumnButton.style.top = '0';
      addColumnButton.style.right = '-25px';
      addColumnButton.innerText = '+';
      addColumnButton.onclick = () => {
        const newColumnWidthPercentage = 25;
        const totalCurrentWidth = schema.headWidthsPercentage.reduce(
          (acc, width) => acc + width,
          0
        );
        const scalingRatio = (100 - newColumnWidthPercentage) / totalCurrentWidth;
        const scaledWidths = schema.headWidthsPercentage.map((width) => width * scalingRatio);
        onChange([
          { key: 'head', value: schema.head.concat('') },
          {
            key: 'headWidthsPercentage',
            value: scaledWidths.concat(newColumnWidthPercentage),
          },
          {
            key: 'content',
            value: JSON.stringify(tableBody.map((row) => row.concat(''))),
          },
        ]);
      };

      rootElement.appendChild(addColumnButton);

      const tableHeads = table.querySelectorAll('th');
      let skipThWidth = 0;
      tableHeads.forEach((head, i) => {
        const deleteColumnButton = document.createElement('button');
        deleteColumnButton.style.position = 'absolute';
        deleteColumnButton.style.left = String(skipThWidth) + 'px';
        deleteColumnButton.style.top = '-25px';
        deleteColumnButton.innerText = '-';
        deleteColumnButton.onclick = () => {
          const totalWidthMinusRemoved = schema.headWidthsPercentage.reduce(
            (sum, width, j) => (j !== i ? sum + width : sum),
            0
          );
          onChange([
            { key: 'head', value: schema.head.filter((_, j) => j !== i) },
            {
              key: 'headWidthsPercentage',
              value: schema.headWidthsPercentage
                .filter((_, j) => j !== i)
                .map((width) => (width / totalWidthMinusRemoved) * 100),
            },
            {
              key: 'content',
              value: JSON.stringify(tableBody.map((row) => row.filter((_, j) => j !== i))),
            },
          ]);
        };
        rootElement.appendChild(deleteColumnButton);
        skipThWidth += head.clientWidth;
      });
    }

    const tableHeight = round(px2mm(table.clientHeight), 2);
    if (rootElement.parentElement) {
      rootElement.parentElement.style.height = `${tableHeight}mm`;
    }
    if (schema.height !== tableHeight && onChange) {
      onChange({ key: 'height', value: tableHeight });
    }
  },
  propPanel: {
    schema: ({ i18n }) => ({
      borderColor: {
        title: i18n('schemas.borderColor'),
        type: 'string',
        widget: 'color',
        rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
      },
      bgColor: {
        title: i18n('schemas.bgColor'),
        type: 'string',
        widget: 'color',
        rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
      },
      borderWidth: {
        title: i18n('schemas.borderWidth'),
        type: 'number',
        widget: 'inputNumber',
        min: 0,
        props: {
          step: 0.1,
        },
      },
      textColor: {
        title: i18n('schemas.textColor'),
        type: 'string',
        widget: 'color',
        rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
      },
      cellPadding: {
        // TODO i18n
        title: 'cellPadding',
        type: 'number',
        widget: 'inputNumber',
        min: 0,
      },
    }),
    defaultSchema: {
      type: 'table',
      position: { x: 0, y: 0 },
      width: 150,
      height: 20,
      head: ['Name', 'City', 'Description'],
      headWidthsPercentage: [30, 30, 40],
      content: JSON.stringify([
        ['Alice', 'New York', 'Alice is a freelance web designer and developer'],
      ]),
      borderColor: '#000000',
      borderWidth: 0.1,
      textColor: '#000000',
      bgColor: '#ffffff',
      cellPadding: 5,
    },
  },
};
export default tableSchema;
