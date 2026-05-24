import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import type { ChangeSchemaItem, SchemaForUI } from '@pdfme/common';
import {
  expandSameTypeBulkUpdateChanges,
  getSameTypeBulkUpdateSchemas,
  isSingleSchemaOnlyChange,
} from '../src/components/Designer/RightSidebar/DetailView/schemaChangeHelpers.js';

const schema = (id: string, type = 'text'): SchemaForUI => ({
  content: '',
  height: 6,
  id,
  name: id,
  position: { x: 10, y: 20 },
  type,
  width: 30,
});

describe('schema change helpers', () => {
  it('targets every selected schema when the selection has one schema type', () => {
    const activeSchema = schema('field-1');
    const activeSchemas = [activeSchema, schema('field-2')];

    assert.deepEqual(
      getSameTypeBulkUpdateSchemas({ activeSchema, activeSchemas }).map(({ id }) => id),
      ['field-1', 'field-2'],
    );
  });

  it('targets only the active schema when selected schema types are mixed', () => {
    const activeSchema = schema('field-1');
    const activeSchemas = [activeSchema, schema('field-2', 'image')];

    assert.deepEqual(getSameTypeBulkUpdateSchemas({ activeSchema, activeSchemas }), [activeSchema]);
  });

  it('expands bulk-safe active schema changes to the same-type selection', () => {
    const activeSchema = schema('field-1');
    const changes: ChangeSchemaItem[] = [
      { key: 'fontSize', value: 14, schemaId: activeSchema.id },
    ];

    assert.deepEqual(
      expandSameTypeBulkUpdateChanges({
        activeSchema,
        activeSchemas: [activeSchema, schema('field-2')],
        changes,
      }),
      [
        { key: 'fontSize', value: 14, schemaId: 'field-1' },
        { key: 'fontSize', value: 14, schemaId: 'field-2' },
      ],
    );
  });

  it('keeps identity, content, type, and position changes scoped to one schema', () => {
    ['id', 'name', 'type', 'content', 'position', 'position.x', 'position.y'].forEach((key) => {
      assert.equal(isSingleSchemaOnlyChange(key), true);
    });

    const activeSchema = schema('field-1');
    const changes: ChangeSchemaItem[] = [
      { key: 'name', value: 'renamed', schemaId: activeSchema.id },
      { key: 'position.x', value: 42, schemaId: activeSchema.id },
    ];

    assert.deepEqual(
      expandSameTypeBulkUpdateChanges({
        activeSchema,
        activeSchemas: [activeSchema, schema('field-2')],
        changes,
      }),
      changes,
    );
  });

  it('keeps a mixed batch scoped when it includes a single-schema-only change', () => {
    const activeSchema = schema('field-1');
    const changes: ChangeSchemaItem[] = [
      { key: 'fontSize', value: 14, schemaId: activeSchema.id },
      { key: 'name', value: 'renamed', schemaId: activeSchema.id },
    ];

    assert.deepEqual(
      expandSameTypeBulkUpdateChanges({
        activeSchema,
        activeSchemas: [activeSchema, schema('field-2')],
        changes,
      }),
      changes,
    );
  });

  it('keeps dependent widget batches scoped when content is updated with metadata', () => {
    const activeSchema = schema('field-1', 'multiVariableText');
    const changes: ChangeSchemaItem[] = [
      { key: 'content', value: '{"name":"Alice"}', schemaId: activeSchema.id },
      { key: 'variables', value: ['name'], schemaId: activeSchema.id },
      { key: 'readOnly', value: false, schemaId: activeSchema.id },
    ];

    assert.deepEqual(
      expandSameTypeBulkUpdateChanges({
        activeSchema,
        activeSchemas: [activeSchema, schema('field-2', 'multiVariableText')],
        changes,
      }),
      changes,
    );
  });

  it('does not expand changes that already target multiple schemas', () => {
    const activeSchema = schema('field-1');
    const changes: ChangeSchemaItem[] = [
      { key: 'alignment', value: 'center', schemaId: activeSchema.id },
      { key: 'alignment', value: 'center', schemaId: 'field-2' },
    ];

    assert.deepEqual(
      expandSameTypeBulkUpdateChanges({
        activeSchema,
        activeSchemas: [activeSchema, schema('field-2')],
        changes,
      }),
      changes,
    );
  });
});
