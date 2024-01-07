import { Plugin, PDFRenderProps, UIRenderProps } from '@pdfme/common';
import { HEX_COLOR_PATTERN } from '../constants.js';
import { autoTable, Styles } from './autoTable';
import type { TableSchema } from './types';
import { isEditable, px2mm } from '../utils.js';

// TODO ここから
// 行の追加、削除
// カラムの追加、削除
// でbugが発生中

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
      // tableLineColor
      // tableLineWidth
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
      columnStyles: schema.head.reduce((acc, _, i) => {
        acc[i] = { cellWidth: schema.width / schema.head.length };
        return acc;
      }, {} as Record<number, Partial<Styles>>),
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
    const tableHeader = schema.head;
    const tableBody = JSON.parse(value || '[]') as string[][];
    const table = document.createElement('table');
    table.style.tableLayout = 'fixed';
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    // TODO スタイルの適応
    table.style.textAlign = 'left';
    table.style.fontSize = '14pt';

    const style = `border: ${schema.borderWidth}mm solid ${schema.borderColor}; 
    color: ${schema.textColor}; 
    background-color: ${schema.bgColor};
    padding: ${schema.cellPadding}mm;
    `;

    const contentEditable = isEditable(mode, schema) ? 'contenteditable="plaintext-only"' : '';
    console.log('tableHeader', tableHeader);
    console.log('tableBody', tableBody);
    table.innerHTML = `<tr>${tableHeader
      // TODO ここから カラムの横幅をドラッグ&ドロップで決定できるようにしたい。
      // https://chat.openai.com/share/8ffbc430-f5fc-4419-8241-5ea82f100eeb
      .map(
        (data) => `<th ${mode === 'designer' ? contentEditable : ''} style="${style}">${data}</th>`
      )
      .join('')}</tr>
        ${tableBody
          .map(
            (row) =>
              `<tr>${row
                .map((data) => `<td ${contentEditable} style="${style}">${data}</td>`)
                .join('')}</tr>`
          )
          .join('')}`;

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
        const newRow = Array(tableHeader.length).fill('') as string[];
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
          const newTableBody = tableBody.filter((_, j) => j !== i);
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
        onChange([
          { key: 'head', value: tableHeader.concat('') },
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
          onChange([
            { key: 'head', value: tableHeader.filter((_, j) => j !== i) },
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

    setTimeout(() => {
      const tableHeight = px2mm(table.clientHeight);
      if (rootElement.parentElement) {
        rootElement.parentElement.style.height = `${tableHeight}mm`;
      }
      if (schema.height !== tableHeight && onChange) {
        onChange({ key: 'height', value: tableHeight });
      }
    }, 25);
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
      width: 100,
      height: 20,
      head: ['Name', 'Age', 'City', 'Description'],
      content: JSON.stringify([
        ['Alice', '24', 'New York', 'Alice is a freelance web designer and developer'],
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
