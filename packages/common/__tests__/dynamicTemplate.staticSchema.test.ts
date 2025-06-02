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

describe('StaticSchema Collision Detection Tests', () => {
  const basePdf: BlankPdf = {
    width: 210,
    height: 297,
    padding: [10, 10, 10, 10],
  };

  const createTemplateWithStaticSchema = (staticSchemaY: number = 250): Template => ({
    schemas: [
      [
        {
          name: 'dynamicText',
          type: 'text',
          content: 'Dynamic content that might grow',
          position: { x: 10, y: 200 },
          width: 190,
          height: 20,
        },
        {
          name: 'tableData',
          type: 'table',
          content: '',
          position: { x: 10, y: 230 },
          width: 190,
          height: 30,
          repeatHead: true,
          showHead: true,
          head: [['Column 1', 'Column 2']],
        },
      ],
    ],
    basePdf: {
      ...basePdf,
      staticSchema: [
        {
          name: 'footer',
          type: 'text',
          content: 'Footer Content',
          position: { x: 10, y: staticSchemaY },
          width: 190,
          height: 15,
        },
        {
          name: 'pageNumber',
          type: 'text',
          content: 'Page {{currentPage}}',
          position: { x: 170, y: staticSchemaY + 20 },
          width: 30,
          height: 10,
        },
      ],
    },
  });

  const createMultiStaticSchemaTemplate = (): Template => ({
    schemas: [
      [
        {
          name: 'content',
          type: 'text',
          content: 'Main content',
          position: { x: 10, y: 20 },
          width: 190,
          height: 200, // Large height to test collision
        },
      ],
    ],
    basePdf: {
      ...basePdf,
      staticSchema: [
        {
          name: 'header',
          type: 'text',
          content: 'Header',
          position: { x: 10, y: 5 },
          width: 190,
          height: 10,
        },
        {
          name: 'footer1',
          type: 'text',
          content: 'Footer 1',
          position: { x: 10, y: 250 },
          width: 90,
          height: 15,
        },
        {
          name: 'footer2',
          type: 'text',
          content: 'Footer 2',
          position: { x: 110, y: 270 },
          width: 90,
          height: 15,
        },
      ],
    },
  });

  const mockGetDynamicHeights = (multiplier: number = 1) => {
    return async (value: string, args: { schema: Schema }) => {
      if (args.schema.type === 'table') {
        const baseHeight = args.schema.height * multiplier;
        return [baseHeight];
      }
      return [args.schema.height * multiplier];
    };
  };

  describe('Basic staticSchema collision detection', () => {
    test('should detect collision with staticSchema and move content to next page', async () => {
      const template = createTemplateWithStaticSchema(250);
      const input = { 
        dynamicText: 'Test content',
        tableData: JSON.stringify([['Row 1 Col 1', 'Row 1 Col 2']])
      };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(3), // Make content larger to force collision
      });

      expect(result.schemas.length).toBeGreaterThan(1);
      
      // Check that content was moved to avoid collision
      const firstPageSchemas = result.schemas[0];
      const secondPageSchemas = result.schemas[1];
      
      expect(firstPageSchemas.length).toBeLessThan(2); // Some content should have moved
      expect(secondPageSchemas.length).toBeGreaterThan(0); // Content should be on second page
    });

    test('should not trigger page break when content fits before staticSchema', async () => {
      const template = createTemplateWithStaticSchema(280); // Footer at bottom
      const input = { 
        dynamicText: 'Small content',
        tableData: JSON.stringify([['Row 1', 'Row 2']])
      };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(1), // Normal size
      });

      expect(result.schemas.length).toBe(1);
      
      // All content should fit on first page
      const firstPageSchemas = result.schemas[0];
      expect(firstPageSchemas.length).toBe(2);
    });

    test('should handle empty staticSchema array', async () => {
      const templateWithoutStatic: Template = {
        schemas: [
          [
            {
              name: 'content',
              type: 'text',
              content: 'Content without static schema',
              position: { x: 10, y: 20 },
              width: 190,
              height: 200,
            },
          ],
        ],
        basePdf: {
          ...basePdf,
          staticSchema: [],
        },
      };

      const input = { content: 'Test content' };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template: templateWithoutStatic,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(1),
      });

      expect(result.schemas.length).toBe(1);
      expect(result.schemas[0]).toHaveLength(1);
    });

    test('should handle undefined staticSchema', async () => {
      const templateWithoutStatic: Template = {
        schemas: [
          [
            {
              name: 'content',
              type: 'text',
              content: 'Content without static schema',
              position: { x: 10, y: 20 },
              width: 190,
              height: 200,
            },
          ],
        ],
        basePdf, // basePdf without staticSchema property
      };

      const input = { content: 'Test content' };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template: templateWithoutStatic,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(1),
      });

      expect(result.schemas.length).toBe(1);
      expect(result.schemas[0]).toHaveLength(1);
    });
  });

  describe('Multiple staticSchema elements', () => {
    test('should calculate reserved space based on topmost staticSchema element', async () => {
      const template = createMultiStaticSchemaTemplate();
      const input = { content: 'Large content that might collide' };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(2), // Make content larger
      });

      expect(result.schemas.length).toBeGreaterThan(0);
      
      // Content should be properly handled - either fit on first page or moved to subsequent pages
      let foundContent = false;
      for (const page of result.schemas) {
        const contentSchema = page.find(s => s.name === 'content');
        if (contentSchema) {
          foundContent = true;
          expect(contentSchema.position.y).toBeGreaterThanOrEqual(0);
        }
      }
      
      expect(foundContent).toBe(true);
    });

    test('should preserve all staticSchema elements in result', async () => {
      const template = createMultiStaticSchemaTemplate();
      const input = { content: 'Test content' };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(1),
      });

      // StaticSchema should be preserved in the result
      expect(result.basePdf).toHaveProperty('staticSchema');
      if (typeof result.basePdf === 'object' && result.basePdf !== null && 'staticSchema' in result.basePdf && result.basePdf.staticSchema) {
        expect(result.basePdf.staticSchema).toHaveLength(3);
        expect(result.basePdf.staticSchema.map(s => s.name)).toEqual(['header', 'footer1', 'footer2']);
      }
    });
  });

  describe('Table and staticSchema interaction', () => {
    test('should handle table with repeatHead and staticSchema collision', async () => {
      const template = createTemplateWithStaticSchema(260);
      const input = { 
        dynamicText: 'Text content',
        tableData: JSON.stringify([
          ['Row 1 Col 1', 'Row 1 Col 2'],
          ['Row 2 Col 1', 'Row 2 Col 2'],
          ['Row 3 Col 1', 'Row 3 Col 2'],
          ['Row 4 Col 1', 'Row 4 Col 2'],
          ['Row 5 Col 1', 'Row 5 Col 2'],
        ])
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
            if (!value) return Promise.resolve([args.schema.height]);
            try {
              const data = JSON.parse(value);
              const headerHeight = 20;
              const rowHeight = 15;
              const totalHeight = (headerHeight + (data.length * rowHeight)) * 2; // Make it larger
              return Promise.resolve([totalHeight]);
            } catch {
              return Promise.resolve([args.schema.height]);
            }
          }
          return Promise.resolve([args.schema.height]);
        },
      });

      expect(result.schemas.length).toBeGreaterThan(0);
      
      // Check that table content is present and properly handled
      let foundTableContent = false;
      for (const page of result.schemas) {
        const tableSchema = page.find(s => s.name === 'tableData');
        if (tableSchema) {
          foundTableContent = true;
        }
      }
      
      expect(foundTableContent).toBe(true);
    });

    test('should properly adjust element positions after table with repeatHead and staticSchema', async () => {
      const complexTemplate: Template = {
        schemas: [
          [
            {
              name: 'tableData',
              type: 'table',
              content: '',
              position: { x: 10, y: 20 },
              width: 190,
              height: 30,
              repeatHead: true,
              showHead: true,
              head: [['Product', 'Quantity']],
            },
            {
              name: 'afterTable',
              type: 'text',
              content: 'After table text',
              position: { x: 10, y: 60 },
              width: 190,
              height: 20,
            },
          ],
        ],
        basePdf: {
          ...basePdf,
          staticSchema: [
            {
              name: 'footer',
              type: 'text',
              content: 'Footer',
              position: { x: 10, y: 270 },
              width: 190,
              height: 15,
            },
          ],
        },
      };

      const input = { 
        tableData: JSON.stringify([
          ['Product 1', '5'],
          ['Product 2', '10'],
          ['Product 3', '15'],
          ['Product 4', '20'],
          ['Product 5', '25'],
          ['Product 6', '30'],
        ]),
        afterTable: 'This text should be positioned correctly'
      };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template: complexTemplate,
        input,
        options,
        _cache,
        getDynamicHeights: (value: string, args: { schema: Schema }) => {
          if (args.schema.type === 'table') {
            if (!value) return Promise.resolve([args.schema.height]);
            try {
              const data = JSON.parse(value);
              const headerHeight = 20;
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
      
      // Check that afterTable element is positioned correctly relative to table
      for (const page of result.schemas) {
        const tableSchema = page.find(s => s.name === 'tableData');
        const afterTableSchema = page.find(s => s.name === 'afterTable');
        
        if (tableSchema && afterTableSchema) {
          expect(afterTableSchema.position.y).toBeGreaterThan(tableSchema.position.y);
        }
      }
    });
  });

  describe('Edge cases for staticSchema collision', () => {
    test('should handle staticSchema at very top of page', async () => {
      const template: Template = {
        schemas: [
          [
            {
              name: 'content',
              type: 'text',
              content: 'Content',
              position: { x: 10, y: 50 },
              width: 190,
              height: 200,
            },
          ],
        ],
        basePdf: {
          ...basePdf,
          staticSchema: [
            {
              name: 'topStatic',
              type: 'text',
              content: 'Top static',
              position: { x: 10, y: 5 },
              width: 190,
              height: 10,
            },
          ],
        },
      };

      const input = { content: 'Test content' };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(1),
      });

      expect(result.schemas.length).toBeGreaterThan(0);
      
      // Content should be present
      let foundContent = false;
      for (const page of result.schemas) {
        if (page.find(s => s.name === 'content')) {
          foundContent = true;
        }
      }
      expect(foundContent).toBe(true);
    });

    test('should handle staticSchema at very bottom of page', async () => {
      const template: Template = {
        schemas: [
          [
            {
              name: 'content',
              type: 'text',
              content: 'Content',
              position: { x: 10, y: 50 },
              width: 190,
              height: 200,
            },
          ],
        ],
        basePdf: {
          ...basePdf,
          staticSchema: [
            {
              name: 'bottomStatic',
              type: 'text',
              content: 'Bottom static',
              position: { x: 10, y: 285 },
              width: 190,
              height: 10,
            },
          ],
        },
      };

      const input = { content: 'Test content' };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(2), // Large content
      });

      expect(result.schemas.length).toBeGreaterThan(1);
    });

    test('should handle large staticSchema elements', async () => {
      const template: Template = {
        schemas: [
          [
            {
              name: 'content',
              type: 'text',
              content: 'Content',
              position: { x: 10, y: 50 },
              width: 190,
              height: 100,
            },
          ],
        ],
        basePdf: {
          ...basePdf,
          staticSchema: [
            {
              name: 'largeStatic',
              type: 'text',
              content: 'Large static content',
              position: { x: 10, y: 200 },
              width: 190,
              height: 50, // Large static element
            },
          ],
        },
      };

      const input = { content: 'Test content' };
      const options = { font: getSampleFont() };
      const _cache = new Map();

      const result = await getDynamicTemplate({
        template,
        input,
        options,
        _cache,
        getDynamicHeights: mockGetDynamicHeights(2),
      });

      expect(result.schemas.length).toBeGreaterThan(0);
      
      // Content should be properly handled with large static element
      let foundContent = false;
      for (const page of result.schemas) {
        const contentSchema = page.find(s => s.name === 'content');
        if (contentSchema) {
          foundContent = true;
          // Content should be positioned appropriately
          expect(contentSchema.position.y).toBeGreaterThanOrEqual(0);
        }
      }
      
      expect(foundContent).toBe(true);
    });
  });
});
