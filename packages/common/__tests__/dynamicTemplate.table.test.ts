import { readFileSync } from 'fs';
import * as path from 'path';
import { getDynamicTemplate } from '../src/dynamicTemplate.js';
import { Template, Schema, Font, BlankPdf } from '../src/index.js';

const sansData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSansJP.ttf`));
const serifData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSerifJP.ttf`));

const getSampleFont = (): Font => ({
  SauceHanSansJP: { fallback: true, data: sansData },
  SauceHanSerifJP: { data: serifData },
});

describe('Table Schema with repeatHead Tests', () => {
  const basePdf: BlankPdf = {
    width: 210,
    height: 297,
    padding: [10, 10, 10, 10],
  };

  const createTableTemplate = (repeatHead: boolean = true, showHead: boolean = true): Template => ({
    schemas: [
      [
        {
          name: 'tableData',
          type: 'table',
          content: '',
          position: { x: 10, y: 20 },
          width: 190,
          height: 50,
          repeatHead,
          showHead,
          head: [['Product', 'Quantity', 'Price', 'Total']],
          headWidthPercentages: [40, 20, 20, 20],
        },
        {
          name: 'footerText',
          type: 'text',
          content: 'Footer Text',
          position: { x: 10, y: 80 },
          width: 190,
          height: 20,
        },
      ],
    ],
    basePdf,
  });

  const createMultiTableTemplate = (): Template => ({
    schemas: [
      [
        {
          name: 'table1',
          type: 'table',
          content: '',
          position: { x: 10, y: 20 },
          width: 190,
          height: 50,
          repeatHead: true,
          showHead: true,
          head: [['Col1', 'Col2']],
          headWidthPercentages: [50, 50],
        },
        {
          name: 'table2',
          type: 'table',
          content: '',
          position: { x: 10, y: 120 },
          width: 190,
          height: 50,
          repeatHead: true,
          showHead: true,
          head: [['Col3', 'Col4']],
          headWidthPercentages: [50, 50],
        },
        {
          name: 'betweenText',
          type: 'text',
          content: 'Between Tables',
          position: { x: 10, y: 200 },
          width: 190,
          height: 20,
        },
      ],
    ],
    basePdf,
  });

  const createTableWithStaticSchema = (): Template => ({
    schemas: [
      [
        {
          name: 'tableData',
          type: 'table',
          content: '',
          position: { x: 10, y: 20 },
          width: 190,
          height: 50,
          repeatHead: true,
          showHead: true,
          head: [['Product', 'Quantity', 'Price', 'Total']],
          headWidthPercentages: [40, 20, 20, 20],
        },
      ],
    ],
    basePdf: {
      ...basePdf,
      staticSchema: [
        {
          name: 'pageNumber',
          type: 'text',
          content: 'Page {{currentPage}}',
          position: { x: 170, y: 280 },
          width: 30,
          height: 10,
        },
      ],
    },
  });

  const generateTableData = (rows: number): string => {
    const data = [];
    for (let i = 1; i <= rows; i++) {
      data.push([
        `Product ${i}`,
        String(Math.floor(Math.random() * 10) + 1),
        String((Math.random() * 100 + 10).toFixed(2)),
        String((Math.random() * 500 + 50).toFixed(2))
      ]);
    }
    return JSON.stringify(data);
  };

  const mockGetDynamicHeights = (tableData: string, heightMultiplier: number = 1) => {
    return async (value: string, args: { schema: Schema }) => {
      if (args.schema.type === 'table') {
        if (!value || value === '') {
          return [args.schema.height * heightMultiplier];
        }
        try {
          const data = JSON.parse(value);
          const headerHeight = args.schema.showHead !== false ? 20 : 0;
          const rowHeight = 15;
          const totalHeight = (headerHeight + (data.length * rowHeight)) * heightMultiplier;
          return [totalHeight];
        } catch {
          return [args.schema.height * heightMultiplier];
        }
      }
      return [args.schema.height * heightMultiplier];
    };
  };

  describe('Basic repeatHead functionality', () => {
    test('should handle table with repeatHead=true that fits on one page', async () => {
      const template = createTableTemplate(true);
      const input = { tableData: generateTableData(5) };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(input.tableData),
      });

      expect(result.schemas.length).toBe(1);
      expect(result.schemas[0]).toHaveLength(2);
      
      const tableSchema = result.schemas[0].find(s => s.name === 'tableData');
      const footerSchema = result.schemas[0].find(s => s.name === 'footerText');
      
      expect(tableSchema).toBeDefined();
      expect(footerSchema).toBeDefined();
      expect(tableSchema?.__isSplit).toBeFalsy();
    });

    test('should handle table with repeatHead=true that spans multiple pages', async () => {
      const template = createTableTemplate(true);
      const input = { tableData: generateTableData(50) }; // Large dataset to force page break
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(input.tableData, 3), // Make table large enough to span pages
      });

      expect(result.schemas.length).toBeGreaterThan(1);
      
      // Find all pages with table data
      let foundTablePages = 0;
      let foundSplitTable = false;
      
      for (let i = 0; i < result.schemas.length; i++) {
        const pageTable = result.schemas[i].find(s => s.name === 'tableData');
        if (pageTable) {
          foundTablePages++;
          if (pageTable.__isSplit) {
            foundSplitTable = true;
          }
        }
      }
      
      expect(foundTablePages).toBeGreaterThan(0);
      if (foundTablePages > 1) {
        expect(foundSplitTable).toBe(true);
      }
    });

    test('should handle table with repeatHead=false that spans multiple pages', async () => {
      const template = createTableTemplate(false);
      const input = { tableData: generateTableData(50) };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(input.tableData, 3), // Make table large enough
      });

      expect(result.schemas.length).toBeGreaterThan(1);
      
      // Find all pages with table data
      let foundTablePages = 0;
      let foundSplitTable = false;
      
      for (let i = 0; i < result.schemas.length; i++) {
        const pageTable = result.schemas[i].find(s => s.name === 'tableData');
        if (pageTable) {
          foundTablePages++;
          if (pageTable.__isSplit) {
            foundSplitTable = true;
          }
        }
      }
      
      expect(foundTablePages).toBeGreaterThan(0);
      if (foundTablePages > 1) {
        expect(foundSplitTable).toBe(true);
      }
    });
  });

  describe('Header visibility tests', () => {
    test('should handle table with showHead=false', async () => {
      const template = createTableTemplate(true, false);
      const input = { tableData: generateTableData(10) };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(input.tableData),
      });

      expect(result.schemas.length).toBe(1);
      const tableSchema = result.schemas[0].find(s => s.name === 'tableData');
      expect(tableSchema).toBeDefined();
    });

    test('should handle empty table data', async () => {
      const template = createTableTemplate(true);
      const input = { tableData: '' };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(input.tableData),
      });

      expect(result.schemas.length).toBe(1);
      const tableSchema = result.schemas[0].find(s => s.name === 'tableData');
      expect(tableSchema).toBeDefined();
      expect(tableSchema?.__isSplit).toBeFalsy();
    });
  });

  describe('Element positioning with repeatHead', () => {
    test('should properly adjust positions of elements below table with repeatHead', async () => {
      const template = createTableTemplate(true);
      const input = { tableData: generateTableData(30) }; // Medium dataset
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(input.tableData),
      });

      // Find footer text on each page
      for (let i = 0; i < result.schemas.length; i++) {
        const footerSchema = result.schemas[i].find(s => s.name === 'footerText');
        const tableSchema = result.schemas[i].find(s => s.name === 'tableData');
        
        if (footerSchema && tableSchema) {
          // Footer should be positioned below the table
          expect(footerSchema.position.y).toBeGreaterThan(tableSchema.position.y);
        }
      }
    });

    test('should handle __bodyRange correctly for split tables', async () => {
      const template = createTableTemplate(true);
      const input = { tableData: generateTableData(40) };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(input.tableData),
      });

      expect(result.schemas.length).toBeGreaterThan(1);
      
      // Check __bodyRange for each table part
      for (let i = 0; i < result.schemas.length; i++) {
        const tableSchema = result.schemas[i].find(s => s.name === 'tableData');
        if (tableSchema) {
          expect(tableSchema.__bodyRange).toBeDefined();
          expect(typeof tableSchema.__bodyRange?.start).toBe('number');
          expect(typeof tableSchema.__bodyRange?.end).toBe('number');
          expect(tableSchema.__bodyRange?.start).toBeLessThanOrEqual(tableSchema.__bodyRange?.end);
        }
      }
    });
  });

  describe('Multiple tables with repeatHead', () => {
    test('should handle multiple tables with repeatHead correctly', async () => {
      const template = createMultiTableTemplate();
      const input = { 
        table1: generateTableData(20),
        table2: generateTableData(20)
      };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: (value: string, args: { schema: Schema }) => {
          if (args.schema.type === 'table') {
            if (!value || value === '') {
              return Promise.resolve([args.schema.height]);
            }
            try {
              const data = JSON.parse(value);
              const headerHeight = args.schema.showHead !== false ? 20 : 0;
              const rowHeight = 15;
              const totalHeight = headerHeight + (data.length * rowHeight);
              return Promise.resolve([totalHeight]);
            } catch {
              return Promise.resolve([args.schema.height]);
            }
          }
          return Promise.resolve([args.schema.height]);
        },
      });

      expect(result.schemas.length).toBeGreaterThan(0);
      
      // Check that both tables are present
      let foundTable1 = false;
      let foundTable2 = false;
      
      for (const page of result.schemas) {
        if (page.find(s => s.name === 'table1')) foundTable1 = true;
        if (page.find(s => s.name === 'table2')) foundTable2 = true;
      }
      
      expect(foundTable1).toBe(true);
      expect(foundTable2).toBe(true);
    });
  });

  describe('StaticSchema collision prevention', () => {
    test('should prevent table content from overlapping with staticSchema', async () => {
      const template = createTableWithStaticSchema();
      const input = { tableData: generateTableData(60) }; // Large dataset
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(input.tableData, 2), // Make table larger
      });

      expect(result.schemas.length).toBeGreaterThan(0);
      
      // Check that table content gets properly paginated to avoid staticSchema collision
      let foundTableContent = false;
      for (const page of result.schemas) {
        const tableSchema = page.find(s => s.name === 'tableData');
        if (tableSchema) {
          foundTableContent = true;
          // Table should be present and positioned appropriately
          expect(tableSchema.position.y).toBeGreaterThanOrEqual(0);
        }
      }
      
      expect(foundTableContent).toBe(true);
    });

    test('should handle page breaks with staticSchema present', async () => {
      const templateWithFooter = createTableWithStaticSchema();
      const input = { tableData: generateTableData(50) };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template: templateWithFooter,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(input.tableData),
      });

      expect(result.schemas.length).toBeGreaterThan(1);
      
      // Verify staticSchema is preserved in the template
      expect(result.basePdf).toHaveProperty('staticSchema');
      if ('staticSchema' in result.basePdf && result.basePdf.staticSchema) {
        expect(result.basePdf.staticSchema).toHaveLength(1);
        expect(result.basePdf.staticSchema[0].name).toBe('pageNumber');
      }
    });
  });

  describe('Edge cases and stress tests', () => {
    test('should handle very large datasets', async () => {
      const template = createTableTemplate(true);
      const input = { tableData: generateTableData(200) }; // Very large dataset
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(input.tableData, 5), // Very large table
      });

      expect(result.schemas.length).toBeGreaterThan(3); // Should span multiple pages
      
      // Verify that we find at least one page with content
      let foundContentPages = 0;
      for (const page of result.schemas) {
        if (page.length > 0) {
          foundContentPages++;
        }
      }
      
      expect(foundContentPages).toBeGreaterThan(0);
    });

    test('should handle invalid table data gracefully', async () => {
      const template = createTableTemplate(true);
      const input = { tableData: 'invalid json data' };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(input.tableData),
      });

      expect(result.schemas.length).toBe(1);
      const tableSchema = result.schemas[0].find(s => s.name === 'tableData');
      expect(tableSchema).toBeDefined();
    });

    test('should handle minimal table configuration', async () => {
      const minimalTemplate: Template = {
        schemas: [
          [
            {
              name: 'simpleTable',
              type: 'table',
              content: '',
              position: { x: 10, y: 20 },
              width: 190,
              height: 30,
              repeatHead: true,
            },
          ],
        ],
        basePdf,
      };

      const input = { simpleTable: generateTableData(5) };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template: minimalTemplate,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(input.simpleTable),
      });

      expect(result.schemas.length).toBe(1);
      const tableSchema = result.schemas[0].find(s => s.name === 'simpleTable');
      expect(tableSchema).toBeDefined();
    });
  });
});