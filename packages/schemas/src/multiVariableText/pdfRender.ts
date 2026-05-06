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
    await parentPdfRender({ value, schema, ...rest });
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
