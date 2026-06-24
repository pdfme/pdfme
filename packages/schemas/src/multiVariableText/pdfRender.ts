import { PDFRenderProps } from '@pdfme/common';
import { MultiVariableTextSchema } from './types.js';
import { pdfRender as parentPdfRender } from '../text/pdfRender.js';
import {
  substituteVariables,
  substituteVariablesAsInlineMarkdownLiterals,
  validateVariables,
} from './helper.js';
import { isInlineMarkdownTextSchema } from '../text/richText.js';

export const pdfRender = async (arg: PDFRenderProps<MultiVariableTextSchema>) => {
  const { value, schema, ...rest } = arg;

  if (schema.readOnly) {
    // A read-only MVT renders its already-resolved snapshot (value === content). When it has no
    // variables that snapshot is just the empty variables map (e.g. "{}"), so fall back to the
    // static template text to avoid rendering "{}" (issue #1523).
    const readOnlyValue = schema.variables.length > 0 ? value : schema.text || '';
    await parentPdfRender({ value: readOnlyValue, schema, ...rest });
    return;
  }

  if (!validateVariables(value, schema)) {
    // Don't render if a required variable is missing
    return;
  }

  const renderValue = isInlineMarkdownTextSchema(schema)
    ? substituteVariablesAsInlineMarkdownLiterals(schema.text || '', value)
    : substituteVariables(schema.text || '', value);

  const renderArgs = {
    value: renderValue,
    schema,
    ...rest,
  };

  await parentPdfRender(renderArgs);
};
