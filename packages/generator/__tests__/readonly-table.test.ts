import { Template, type Plugin } from '@pdfme/common';
import { table, text } from '@pdfme/schemas';
import generate from '../src/generate.js';
import { getFont } from './utils.js';

const designerDefault = JSON.stringify([
  ['Alice', 'New York', 'Alice is a freelance web designer and developer'],
  ['Bob', 'Paris', 'Bob is a freelance illustrator and graphic designer'],
]);
const rows = [
  ['Max', 'Cityname', 'he lives here'],
  ['Angela', 'Othercityname', 'she used to live here'],
];

const getReadOnlyTableSchema = (content: string) => ({
  ...structuredClone(table.propPanel.defaultSchema),
  name: 'table',
  type: 'table',
  readOnly: true,
  content,
  position: { x: 20, y: 40 },
  width: 170,
  height: 40,
  showHead: true,
  head: ['Name', 'City', 'Description'],
  headWidthPercentages: [30, 30, 40],
});

const getTemplate = (content: string, readOnly = true): Template => ({
  basePdf: { width: 210, height: 297, padding: [20, 10, 20, 10] },
  schemas: [[{ ...getReadOnlyTableSchema(content), readOnly }]],
});

const observeTableValues = () => {
  const rendered: string[] = [];
  const wrappingTable: Plugin = {
    ...table,
    pdf: async (props) => {
      rendered.push(props.value);
      await table.pdf(props);
    },
  };
  return { rendered, wrappingTable };
};

describe('generate readOnly table input (#1299)', () => {
  test('uses input.table when content is the Designer sample JSON', async () => {
    const { rendered, wrappingTable } = observeTableValues();

    await generate({
      template: getTemplate(designerDefault),
      inputs: [{ table: rows }],
      plugins: { table: wrappingTable, text },
      options: { font: getFont() },
    });

    expect(rendered).toHaveLength(1);
    expect(JSON.parse(rendered[0])).toEqual(rows);
    expect(rendered[0]).not.toContain('Alice');
    expect(rendered[0]).toContain('Max');
    expect(rendered[0]).toContain('Angela');
  });

  test('does not throw when content is "{table}" and still uses input.table', async () => {
    const { rendered, wrappingTable } = observeTableValues();

    await expect(
      generate({
        template: getTemplate('{table}'),
        inputs: [{ table: rows }],
        plugins: { table: wrappingTable, text },
        options: { font: getFont() },
      }),
    ).resolves.toBeInstanceOf(Uint8Array);

    expect(rendered).toHaveLength(1);
    expect(JSON.parse(rendered[0])).toEqual(rows);
    expect(rendered[0]).toContain('Max');
    expect(rendered[0]).toContain('Angela');
  });

  test('keeps Designer sample content when input.table is missing', async () => {
    const { rendered, wrappingTable } = observeTableValues();

    await generate({
      template: getTemplate(designerDefault),
      inputs: [{}],
      plugins: { table: wrappingTable, text },
      options: { font: getFont() },
    });

    expect(JSON.parse(rendered[0])).toEqual(JSON.parse(designerDefault));
    expect(rendered[0]).toContain('Alice');
    expect(rendered[0]).toContain('Bob');
  });

  test('leaves editable tables on input[name]', async () => {
    const { rendered, wrappingTable } = observeTableValues();

    await generate({
      template: getTemplate(designerDefault, false),
      inputs: [{ table: rows }],
      plugins: { table: wrappingTable, text },
      options: { font: getFont() },
    });

    const value = rendered[0];
    expect(typeof value === 'string' ? JSON.parse(value) : value).toEqual(rows);
  });

  test('uses input.table for a readOnly staticSchema table', async () => {
    const { rendered, wrappingTable } = observeTableValues();

    await generate({
      template: {
        basePdf: {
          width: 210,
          height: 297,
          padding: [20, 10, 20, 10],
          staticSchema: [getReadOnlyTableSchema(designerDefault)],
        },
        schemas: [[]],
      },
      inputs: [{ table: JSON.stringify(rows) }],
      plugins: { table: wrappingTable, text },
      options: { font: getFont() },
    });

    expect(rendered).toHaveLength(1);
    expect(JSON.parse(rendered[0])).toEqual(rows);
    expect(rendered[0]).toContain('Max');
    expect(rendered[0]).not.toContain('Alice');
  });
});
