import React, { useState } from 'react';
import {
  getReadOnlyTableValue,
  isBlankPdf,
  resolveReadOnlyContent,
  Template,
} from '@pdfme/common';
import Renderer from './Renderer.js';
import { stabilizeSchemaIds } from '../helper.js';

const StaticSchema = (props: {
  template: Template;
  input: Record<string, string>;
  scale: number;
  totalPages: number;
  currentPage: number;
}) => {
  const {
    template: { schemas, basePdf },
    input,
    scale,
    totalPages,
    currentPage,
  } = props;
  const [staticSchemaIds] = useState(() => new Map<string, string>());
  if (!isBlankPdf(basePdf) || !basePdf.staticSchema) return null;
  const schemasForUI = stabilizeSchemaIds(basePdf.staticSchema, staticSchemaIds);
  return (
    <>
      {schemasForUI.map((schema) => (
        <Renderer
          key={schema.name}
          schema={schema}
          basePdf={basePdf}
          value={
            schema.readOnly && schema.type === 'table'
              ? getReadOnlyTableValue(schema, input)
              : schema.readOnly
                ? resolveReadOnlyContent({
                    schema,
                    variables: { ...input, totalPages, currentPage },
                    schemas,
                  })
                : schema.content || ''
          }
          onChangeHoveringSchemaId={() => {
            void 0;
          }}
          mode={'viewer'}
          outline={`none`}
          scale={scale}
          selectable={false}
        />
      ))}
    </>
  );
};

export default StaticSchema;
