import { Plugin, PDFRenderProps, UIRenderProps, pt2mm } from '@pdfme/common';
import { HEX_COLOR_PATTERN } from '../constants.js';
import { autoTable } from './autoTable';
import type { TableSchema } from './types';

const tableSchema: Plugin<TableSchema> = {
  pdf: async (arg: PDFRenderProps<TableSchema>) => {
    const { page, schema, pdfDoc, value } = arg;
    const valueJson = JSON.parse(value) as string[][];
    const head = valueJson[0];
    const body = valueJson.slice(1);
    const res = await autoTable(arg, {
      head: [head],
      body,
      startY: schema.position.y,
      tableWidth: schema.width,
      styles: {
        cellPadding: 0,
      },
      margin: {
        top: 0,
        right: pt2mm(page.getSize().width) - schema.position.x - schema.width,
        left: schema.position.x,
        bottom: 0,
      },
    });
    console.log('res', res);
  },
  // TODO heightを自動で決められるようにしたい->どうやってvalue以外の値を変更するかは別途修正が必要
  // TODO カラムの横幅をドラッグ&ドロップで決定できるようにしたい。現在はtableLayout:fixed(https://developer.mozilla.org/ja/docs/Web/CSS/table-layout)で決定している。colの横幅で決定できるようにしたい。
  ui: (arg: UIRenderProps<TableSchema>) => {
    const { schema, rootElement, value, mode, onChange } = arg;
    const tableData = JSON.parse(value) as string[][];
    const tableHeader = tableData[0];
    const tableBody = tableData.slice(1);
    const table = document.createElement('table');
    table.style.tableLayout = 'fixed';
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.textAlign = 'left';
    table.style.fontSize = '14pt';

    const style = `border: 1px solid ${schema.borderColor}; color: ${schema.textColor}; background-color: ${schema.bgColor};`;

    table.innerHTML = `<tr>${tableHeader
      .map((data) => `<th style="${style}">${data}</th>`)
      .join('')}</tr>
  ${tableBody
    .map(
      (row) =>
        `<tr>${row
          .map((data) => `<td contenteditable="plaintext-only" style="${style}">${data}</td>`)
          .join('')}</tr>`
    )
    .join('')}`;

    // TODO impl onChange
    // TODO: if mode === 'form', need to add a button to add a row

    rootElement.onclick = (e) => {
      if (e.target instanceof HTMLTableCellElement && e.target.tagName === 'TD') {
        if (e.target === document.activeElement) return;
        e.target.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(e.target);
        range.collapse(false); // Collapse range to the end
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    };
    rootElement.appendChild(table);
  },
  propPanel: {
    schema: ({ i18n }) => ({
      borderColor: {
        title: i18n('schemas.borderColor'),
        type: 'string',
        widget: 'color',
        required: true,
        rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
      },
      bgColor: {
        title: i18n('schemas.bgColor'),
        type: 'string',
        widget: 'color',
        required: true,
        rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
      },
      textColor: {
        title: i18n('schemas.textColor'),
        type: 'string',
        widget: 'color',
        required: true,
        rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
      },
    }),
    defaultSchema: {
      type: 'table',
      position: { x: 0, y: 0 },
      width: 100,
      height: 20,
      content: JSON.stringify([
        ['Name', 'Age', 'City'],
        ['Alice', '24', 'New York'],
      ]),
      borderColor: '#000000',
      textColor: '#000000',
      bgColor: '#ffffff',
    },
  },
};
export default tableSchema;
