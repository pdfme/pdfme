import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import type { SchemaForUI } from '@pdfme/common';
import {
  createDesignerSelection,
  getSelectedSchemaIds,
} from '../src/designerSelection.js';

const schema = (id: string, name: string, position = { x: 10, y: 20 }): SchemaForUI => ({
  content: '',
  height: 6,
  id,
  name,
  position,
  type: 'text',
  width: 30,
});

describe('designer selection helpers', () => {
  it('creates persisted schema selections with bounds', () => {
    const selection = createDesignerSelection({
      activeSchemaIds: ['field-2', 'field-1'],
      pageIndex: 0,
      schemasList: [
        [
          schema('field-1', 'first', { x: 10, y: 20 }),
          schema('field-2', 'second', { x: 50, y: 40 }),
        ],
      ],
    });

    assert.deepEqual(
      selection.schemas.map((item) => ({
        hasUiId: 'id' in item.schema,
        name: item.name,
        schemaIndex: item.schemaIndex,
      })),
      [
        { hasUiId: false, name: 'second', schemaIndex: 1 },
        { hasUiId: false, name: 'first', schemaIndex: 0 },
      ],
    );
    assert.deepEqual(selection.bounds, { height: 26, width: 70, x: 10, y: 20 });
  });

  it('selects schemas by id, name, or index on the target page', () => {
    const schemas = [schema('field-1', 'first'), schema('field-2', 'second')];

    assert.deepEqual(
      getSelectedSchemaIds({
        pageIndex: 0,
        schemas,
        targets: ['field-1', { name: 'second' }, { pageIndex: 1, schemaIndex: 0 }],
      }),
      ['field-1', 'field-2'],
    );
  });
});
