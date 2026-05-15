import type { Template } from '@pdfme/common';
import { reconcileInputsWithTemplate } from '../src/lib/templateInputs';

const templateWithFields = (
  fields: Array<{ content?: string; name: string; readOnly?: boolean }>,
) =>
  ({
    basePdf: { height: 100, padding: [0, 0, 0, 0], width: 100 },
    schemas: [
      fields.map((field) => ({
        height: 10,
        position: { x: 0, y: 0 },
        type: 'text',
        width: 10,
        ...field,
      })),
    ],
  }) as Template;

describe('template input reconciliation', () => {
  it('keeps values for matching field names and uses defaults for new fields', () => {
    const template = templateWithFields([
      { content: 'Default customer', name: 'customer' },
      { content: 'Default total', name: 'total' },
      { content: 'Internal', name: 'internal', readOnly: true },
    ]);

    expect(reconcileInputsWithTemplate(template, [{ customer: 'Ada', old: 'removed' }])).toEqual([
      {
        customer: 'Ada',
        total: 'Default total',
      },
    ]);
  });

  it('falls back to generated defaults when there are no previous inputs', () => {
    const template = templateWithFields([{ content: 'Hello', name: 'message' }]);

    expect(reconcileInputsWithTemplate(template, null)).toEqual([{ message: 'Hello' }]);
  });

  it('drops extra previous input rows during template reload', () => {
    const template = templateWithFields([{ content: 'Hello', name: 'message' }]);

    expect(
      reconcileInputsWithTemplate(template, [{ message: 'Ada' }, { message: 'Grace' }]),
    ).toEqual([{ message: 'Ada' }]);
  });
});
