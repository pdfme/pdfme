import { readFileSync } from 'fs';
import * as path from 'path';
import { getDynamicTemplate } from '../src/dynamicTemplate.js';
import { Template, Schema, Font } from '../src/index.js';

const sansData = readFileSync(path.join(__dirname, `/assets/fonts/NotoSans-Regular.ttf`));
const serifData = readFileSync(path.join(__dirname, `/assets/fonts/NotoSerif-Regular.ttf`));

const getSampleFont = (): Font => ({
  NotoSans: { fallback: true, data: sansData },
  NotoSerif: { data: serifData },
});

describe('getDynamicTemplate', () => {
  const height = 10;
  const aPositionY = 10;
  const bPositionY = 30;
  const padding = 10;
  const template: Template = {
    schemas: [
      [
        {
          name: 'a',
          content: 'a',
          type: 'a',
          position: { x: 10, y: aPositionY },
          width: 10,
          height,
        },
        {
          name: 'b',
          content: 'b',
          type: 'b',
          position: { x: 10, y: bPositionY },
          width: 10,
          height,
        },
      ],
    ],
    basePdf: { width: 100, height: 100, padding: [padding, padding, padding, padding] },
  };

  const input = { a: 'a', b: 'b' };
  const options = { font: getSampleFont() };
  const _cache = new Map();
  const getDynamicTemplateArg = { template, input, options, _cache };

  const createGetDynamicTemplateArg = (increaseHeights: number[], bHeight?: number) => ({
    ...getDynamicTemplateArg,
    getDynamicHeights: async (value: string, args: { schema: Schema }) => {
      if (args.schema.type === 'a') {
        return Promise.resolve(increaseHeights);
      }
      return Promise.resolve([bHeight || args.schema.height]);
    },
  });

  const verifyBasicStructure = (dynamicTemplate: Template) => {
    expect(dynamicTemplate.schemas).toBeDefined();
    expect(Array.isArray(dynamicTemplate.schemas)).toBe(true);
    expect(dynamicTemplate.basePdf).toEqual({
      width: 100,
      height: 100,
      padding: [padding, padding, padding, padding],
    });
  };

  describe('Single page scenarios', () => {
    test('should handle no page break', async () => {
      const increaseHeights = [10, 10, 10, 10, 10];
      const dynamicTemplate = await getDynamicTemplate(
        createGetDynamicTemplateArg(increaseHeights),
      );

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(1);
      expect(dynamicTemplate.schemas[0][0].position.y).toEqual(aPositionY);
      expect(dynamicTemplate.schemas[0][0].name).toEqual('a');
      expect(dynamicTemplate.schemas[0][1].position.y).toEqual(
        increaseHeights.reduce((a, b) => a + b, 0) - height + bPositionY,
      );
      expect(dynamicTemplate.schemas[0][1].name).toEqual('b');
    });
  });

  describe('Multiple page scenarios', () => {
    test('should handle page break with a on page 1 and b on page 2', async () => {
      const increaseHeights = [20, 20, 20, 20];
      const dynamicTemplate = await getDynamicTemplate(
        createGetDynamicTemplateArg(increaseHeights),
      );

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(2);
      expect(dynamicTemplate.schemas[0][0].position.y).toEqual(aPositionY);
      expect(dynamicTemplate.schemas[0][0].name).toEqual('a');
      expect(dynamicTemplate.schemas[0][1]).toBeUndefined();
      expect(dynamicTemplate.schemas[1][0].name).toEqual('b');
      // b maintains its relative offset from a's end position
      // a ends at y=90 (page content), b was 20 units below a, so b is at y=10 in page coords + padding = 20
      expect(dynamicTemplate.schemas[1][0].position.y).toEqual(padding + padding);
      expect(dynamicTemplate.schemas[1][1]).toBeUndefined();
    });

    test('should handle page break with a on page 1 and 2, b on page 2', async () => {
      const increaseHeights = [20, 20, 20, 20, 20];
      const dynamicTemplate = await getDynamicTemplate(
        createGetDynamicTemplateArg(increaseHeights),
      );

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(2);
      expect(dynamicTemplate.schemas[0][0].position.y).toEqual(aPositionY);
      expect(dynamicTemplate.schemas[0][0].name).toEqual('a');
      expect(dynamicTemplate.schemas[0][1]).toBeUndefined();
      expect(dynamicTemplate.schemas[1][0].position.y).toEqual(padding);
      expect(dynamicTemplate.schemas[1][0].name).toEqual('a');
      expect(dynamicTemplate.schemas[1][1].position.y).toEqual(
        increaseHeights.slice(3).reduce((a, b) => a + b, 0) - height + padding,
      );
      expect(dynamicTemplate.schemas[1][1].name).toEqual('b');
    });

    test('should handle multiple page breaks', async () => {
      const increaseHeights = [50, 50, 50, 50, 50];
      const dynamicTemplate = await getDynamicTemplate(
        createGetDynamicTemplateArg(increaseHeights),
      );

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(5);

      // Verify 'a' elements across pages
      // Page 0: 'a' first segment (50px)
      expect(dynamicTemplate.schemas[0][0]).toBeDefined();
      expect(dynamicTemplate.schemas[0][0].position.y).toEqual(aPositionY);
      expect(dynamicTemplate.schemas[0][0].height).toEqual(50);
      expect(dynamicTemplate.schemas[0][0].name).toEqual('a');

      // Page 1: 'a' second segment (50px)
      expect(dynamicTemplate.schemas[1][0]).toBeDefined();
      expect(dynamicTemplate.schemas[1][0].position.y).toEqual(padding);
      expect(dynamicTemplate.schemas[1][0].height).toEqual(50);
      expect(dynamicTemplate.schemas[1][0].name).toEqual('a');

      // Page 2: 'a' third segment (50px)
      expect(dynamicTemplate.schemas[2][0]).toBeDefined();
      expect(dynamicTemplate.schemas[2][0].position.y).toEqual(padding);
      expect(dynamicTemplate.schemas[2][0].height).toEqual(50);
      expect(dynamicTemplate.schemas[2][0].name).toEqual('a');

      // Page 3: 'a' fourth segment (50px)
      expect(dynamicTemplate.schemas[3][0]).toBeDefined();
      expect(dynamicTemplate.schemas[3][0].position.y).toEqual(padding);
      expect(dynamicTemplate.schemas[3][0].height).toEqual(50);
      expect(dynamicTemplate.schemas[3][0].name).toEqual('a');

      // Page 4: 'a' fifth segment (50px) and 'b' element (10px)
      expect(dynamicTemplate.schemas[4][0]).toBeDefined();
      expect(dynamicTemplate.schemas[4][0].position.y).toEqual(padding);
      expect(dynamicTemplate.schemas[4][0].height).toEqual(50);
      expect(dynamicTemplate.schemas[4][0].name).toEqual('a');

      expect(dynamicTemplate.schemas[4][1]).toBeDefined();
      expect(dynamicTemplate.schemas[4][1].position.y).toEqual(70);
      expect(dynamicTemplate.schemas[4][1].height).toEqual(10);
      expect(dynamicTemplate.schemas[4][1].name).toEqual('b');
    });

    test('should handle both a and b on next page', async () => {
      const increaseHeights = [80, 10, 10];
      const dynamicTemplate = await getDynamicTemplate(
        createGetDynamicTemplateArg(increaseHeights),
      );

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(2);

      // Check first page
      expect(dynamicTemplate.schemas[0][0]).toBeDefined();
      expect(dynamicTemplate.schemas[0][0].position.y).toEqual(aPositionY);
      expect(dynamicTemplate.schemas[0][0].height).toEqual(80);
      expect(dynamicTemplate.schemas[0][1]).toBeUndefined();

      // Check second page
      expect(dynamicTemplate.schemas[1][0]).toBeDefined();
      expect(dynamicTemplate.schemas[1][0].position.y).toEqual(padding);
      expect(dynamicTemplate.schemas[1][0].height).toEqual(20);

      expect(dynamicTemplate.schemas[1][1]).toBeDefined();
      expect(dynamicTemplate.schemas[1][1].position.y).toBeGreaterThanOrEqual(
        dynamicTemplate.schemas[1][0].position.y + dynamicTemplate.schemas[1][0].height,
      );
    });
  });

  describe('Element height modifications', () => {
    test('should handle increased height for b', async () => {
      const increaseHeights = [10, 10, 10, 10, 10];
      const bHeight = 30;
      const dynamicTemplate = await getDynamicTemplate(
        createGetDynamicTemplateArg(increaseHeights, bHeight),
      );

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(2);

      // Check 'a' element
      expect(dynamicTemplate.schemas[0][0]).toBeDefined();
      expect(dynamicTemplate.schemas[0][0].position.y).toEqual(aPositionY);
      expect(dynamicTemplate.schemas[0][0].height).toEqual(50);
      expect(dynamicTemplate.schemas[0][0].name).toEqual('a');

      // Check 'b' element
      expect(dynamicTemplate.schemas[1][0]).toBeDefined();
      expect(dynamicTemplate.schemas[1][0].position.y).toEqual(padding);
      expect(dynamicTemplate.schemas[1][0].height).toEqual(bHeight);
      expect(dynamicTemplate.schemas[1][0].name).toEqual('b');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty increase heights', async () => {
      const increaseHeights: number[] = [];
      const dynamicTemplate = await getDynamicTemplate(
        createGetDynamicTemplateArg(increaseHeights),
      );

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(1);
      // Both schemas are placed; 'a' with height 0, 'b' follows
      expect(dynamicTemplate.schemas[0][0]).toBeDefined();
      expect(dynamicTemplate.schemas[0][0].name).toEqual('a');
      expect(dynamicTemplate.schemas[0][0].height).toEqual(0);
      expect(dynamicTemplate.schemas[0][1]).toBeDefined();
      expect(dynamicTemplate.schemas[0][1].name).toEqual('b');
    });

    test('should handle very large increase heights', async () => {
      const increaseHeights = [1000, 1000];
      const dynamicTemplate = await getDynamicTemplate(
        createGetDynamicTemplateArg(increaseHeights),
      );

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBeGreaterThan(1);
    });
  });

  describe('Long page flow (cross-template-page)', () => {
    test('should process pages independently - static pages are added as-is without offset propagation', async () => {
      // New behavior: pages without dynamic content are added as-is,
      // without being affected by previous page's table expansion.
      // This reduces computation cost by skipping layout calculations for static pages.
      const templateWithTwoPages: Template = {
        schemas: [
          [
            {
              name: 'table',
              content: 'table',
              type: 'table',
              position: { x: 10, y: 60 },
              width: 80,
              height: 10,
            },
          ],
          [
            {
              name: 'text',
              content: 'text',
              type: 'text',
              position: { x: 10, y: 10 },
              width: 80,
              height: 10,
            },
          ],
        ],
        basePdf: { width: 100, height: 100, padding: [10, 10, 10, 10] },
      };

      const dynamicTemplate = await getDynamicTemplate({
        template: templateWithTwoPages,
        input: { table: 'table', text: 'text' },
        options: { font: getSampleFont() },
        _cache: new Map(),
        getDynamicHeights: async (value: string, args: { schema: Schema }) => {
          if (args.schema.type === 'table') {
            return [10, 10, 10, 10]; // 40 total height, will cause page break
          }
          return [args.schema.height];
        },
      });

      verifyBasicStructure(dynamicTemplate);
      // Page 1: table starts at y=60, with 40 height, will split across pages
      // Page 2: table continuation
      // Page 3: text from template page 2 (added as-is, no offset propagation)
      expect(dynamicTemplate.schemas.length).toBe(3);

      // First page has table
      expect(dynamicTemplate.schemas[0].some((s) => s.name === 'table')).toBe(true);
      // Second page has table continuation
      expect(dynamicTemplate.schemas[1].some((s) => s.name === 'table')).toBe(true);
      // Third page has text (from template page 2, added as-is)
      expect(dynamicTemplate.schemas[2].some((s) => s.name === 'text')).toBe(true);

      // Text position should be unchanged from template (y=10)
      const textOnPage3 = dynamicTemplate.schemas[2].find((s) => s.name === 'text');
      expect(textOnPage3).toBeDefined();
      expect(textOnPage3!.position.y).toBe(10);
    });

    test('should keep static page schemas together with dynamic page when both on same template page', async () => {
      // When table and text are on the SAME template page, they should be processed together
      const templateWithOnePage: Template = {
        schemas: [
          [
            {
              name: 'table',
              content: 'table',
              type: 'table',
              position: { x: 10, y: 10 },
              width: 80,
              height: 10,
            },
            {
              name: 'text',
              content: 'text',
              type: 'text',
              position: { x: 10, y: 30 },
              width: 80,
              height: 10,
            },
          ],
        ],
        basePdf: { width: 100, height: 100, padding: [10, 10, 10, 10] },
      };

      const dynamicTemplate = await getDynamicTemplate({
        template: templateWithOnePage,
        input: { table: 'table', text: 'text' },
        options: { font: getSampleFont() },
        _cache: new Map(),
        getDynamicHeights: async (value: string, args: { schema: Schema }) => {
          if (args.schema.type === 'table') {
            return [10, 10, 10, 10]; // 40 total height
          }
          return [args.schema.height];
        },
      });

      verifyBasicStructure(dynamicTemplate);
      // Table expands from 10 to 40, pushing text down by 30
      // Both should still fit on one page (table ends at 50, text at 70)
      expect(dynamicTemplate.schemas.length).toBe(1);
      expect(dynamicTemplate.schemas[0].some((s) => s.name === 'table')).toBe(true);
      expect(dynamicTemplate.schemas[0].some((s) => s.name === 'text')).toBe(true);

      const table = dynamicTemplate.schemas[0].find((s) => s.name === 'table');
      const text = dynamicTemplate.schemas[0].find((s) => s.name === 'text');
      expect(table!.height).toBe(40);
      // Text should be pushed down: original y=30 + (40-10) offset = 60
      expect(text!.position.y).toBe(60);
    });
  });
});
