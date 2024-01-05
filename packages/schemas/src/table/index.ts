import { drawTable, DrawTableOptions } from 'pdf-lib-draw-table-beta';
import type { Schema, Plugin, PDFRenderProps, UIRenderProps } from '@pdfme/common';
import { convertForPdfLayoutProps, hex2RgbColor } from '../utils.js';
import { HEX_COLOR_PATTERN } from '../constants.js';
import { autoTable } from './autoTable';

// MEMO to pdf-lib-draw-table-beta
// - デフォルト(undefined)のヘッダーカラーは透明にして欲しい
// - Vertical Alignは？

interface TableSchema extends Schema {
  borderColor: string;
  textColor: string;
  bgColor: string;
}

const tableSchema: Plugin<TableSchema> = {
  pdf: async (arg: PDFRenderProps<TableSchema>) => {
    const res = autoTable({
      head: [['Name', 'Email', 'Country']],
      body: [
        ['David', 'david@example.com', 'Sweden'],
        ['Castille', 'castille@example.com', 'Spain'],
        // ...
      ],
      // TODO 位置を決めるオプション等をちゃんとつける
      // startY
    });
    console.log('autoTable-res', res);

    const { page, schema, pdfDoc, value } = arg;
    const pageHeight = page.getHeight();
    const {
      width,
      height,
      position: { x, y },
    } = convertForPdfLayoutProps({ schema, pageHeight });
    const options: DrawTableOptions = {
      header: {
        hasHeaderRow: true,
        textColor: hex2RgbColor(schema.textColor),
        backgroundColor: hex2RgbColor(schema.bgColor),
      },
      pageMargin: {
        right: page.getSize().width - x - width,
        bottom: page.getSize().height - y - height,
      },
      border: { color: hex2RgbColor(schema.borderColor) },
      textColor: hex2RgbColor(schema.textColor),
    };
    const tableDimensions = await drawTable(
      pdfDoc,
      page,
      JSON.parse(value) as string[][],
      x,
      y + height,
      options
    );

    // console.log('Table dimensions:', tableDimensions);
  },
  // TODO heightを自動で決められるようにしたい->どうやってvalue以外の値を変更するかは別途修正が必要
  // TODO カラムの横幅をドラッグ&ドロップで決定できるようにしたい。現在はtableLayout:fixed(https://developer.mozilla.org/ja/docs/Web/CSS/table-layout)で決定している。colの横幅で決定できるようにしたい。
  ui: (arg: UIRenderProps<TableSchema>) => {
    console.log('ui', arg);
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
      // TODO: Text Size
      // TODO: Text Alignment
      // TODO: Font
      // TODO: Content Margin Horizontal
      // TODO: Content Margin Vertical
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
