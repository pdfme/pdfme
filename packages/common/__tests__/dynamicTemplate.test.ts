import { readFileSync } from 'fs';
import * as path from 'path';
import { getDynamicTemplate } from '../src/dynamicTemplate';
import { Template, Schema, Font } from '../src';

const sansData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSansJP.ttf`));
const serifData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSerifJP.ttf`));

const getSampleFont = (): Font => ({
  SauceHanSansJP: { fallback: true, data: sansData },
  SauceHanSerifJP: { data: serifData },
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
        createGetDynamicTemplateArg(increaseHeights)
      );

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(1);
      expect(dynamicTemplate.schemas[0][0].position.y).toEqual(aPositionY);
      expect(dynamicTemplate.schemas[0][0].name).toEqual('a');
      expect(dynamicTemplate.schemas[0][1].position.y).toEqual(
        increaseHeights.reduce((a, b) => a + b, 0) - height + bPositionY
      );
      expect(dynamicTemplate.schemas[0][1].name).toEqual('b');
    });
  });

  describe('Multiple page scenarios', () => {
    test('should handle page break with a on page 1 and b on page 2', async () => {
      const increaseHeights = [20, 20, 20, 20];
      const dynamicTemplate = await getDynamicTemplate(
        createGetDynamicTemplateArg(increaseHeights)
      );

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(2);
      expect(dynamicTemplate.schemas[0][0].position.y).toEqual(aPositionY);
      expect(dynamicTemplate.schemas[0][0].name).toEqual('a');
      expect(dynamicTemplate.schemas[0][1]).toBeUndefined();
      expect(dynamicTemplate.schemas[1][0].name).toEqual('b');
      expect(dynamicTemplate.schemas[1][0].position.y).toEqual(padding);
      expect(dynamicTemplate.schemas[1][1]).toBeUndefined();
    });

    test('should handle page break with a on page 1 and 2, b on page 2', async () => {
      const increaseHeights = [20, 20, 20, 20, 20];
      const dynamicTemplate = await getDynamicTemplate(
        createGetDynamicTemplateArg(increaseHeights)
      );

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(2);
      expect(dynamicTemplate.schemas[0][0].position.y).toEqual(aPositionY);
      expect(dynamicTemplate.schemas[0][0].name).toEqual('a');
      expect(dynamicTemplate.schemas[0][1]).toBeUndefined();
      expect(dynamicTemplate.schemas[1][0].position.y).toEqual(padding);
      expect(dynamicTemplate.schemas[1][0].name).toEqual('a');
      expect(dynamicTemplate.schemas[1][1].position.y).toEqual(
        increaseHeights.slice(3).reduce((a, b) => a + b, 0) - height + padding
      );
      expect(dynamicTemplate.schemas[1][1].name).toEqual('b');
    });

    test('should handle multiple page breaks', async () => {
      const increaseHeights = [50, 50, 50, 50, 50];
      const dynamicTemplate = await getDynamicTemplate(
        createGetDynamicTemplateArg(increaseHeights)
      );

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(5);

      // Verify 'a' elements
      for (let i = 0; i < 4; i++) {
        expect(dynamicTemplate.schemas[i][0]).toBeDefined();
        expect(dynamicTemplate.schemas[i][0].position.y).toEqual(i === 0 ? aPositionY : padding);
        expect(dynamicTemplate.schemas[i][0].height).toEqual(i === 3 ? 100 : 50);
        expect(dynamicTemplate.schemas[i][0].name).toEqual('a');
        expect(dynamicTemplate.schemas[i][1]).toBeUndefined();
      }

      // Verify 'b' element
      expect(dynamicTemplate.schemas[4][0]).toBeDefined();
      expect(dynamicTemplate.schemas[4][0].name).toEqual('b');
      expect(dynamicTemplate.schemas[4][0].position.y).toEqual(padding);
      expect(dynamicTemplate.schemas[4][0].height).toEqual(10);
    });

    test('should handle both a and b on next page', async () => {
      const increaseHeights = [80, 10, 10];
      const dynamicTemplate = await getDynamicTemplate(
        createGetDynamicTemplateArg(increaseHeights)
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
        dynamicTemplate.schemas[1][0].position.y + dynamicTemplate.schemas[1][0].height
      );
    });
  });

  describe('Element height modifications', () => {
    test('should handle increased height for b', async () => {
      const increaseHeights = [10, 10, 10, 10, 10];
      const bHeight = 30;
      const dynamicTemplate = await getDynamicTemplate(
        createGetDynamicTemplateArg(increaseHeights, bHeight)
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
        createGetDynamicTemplateArg(increaseHeights)
      );

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(1);
      expect(dynamicTemplate.schemas[0][0]).toBeDefined();
      expect(dynamicTemplate.schemas[0][0].name).toEqual('b');
      expect(dynamicTemplate.schemas[0][1]).toBeUndefined();
    });

    test('should handle very large increase heights', async () => {
      const increaseHeights = [1000, 1000];
      const dynamicTemplate = await getDynamicTemplate(
        createGetDynamicTemplateArg(increaseHeights)
      );

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBeGreaterThan(1);
    });
  });
});
