import React from 'react';
import { BasePdf, isBlankPdf } from '@pdfme/common';
import Renderer from './Renderer';

const StaticSchema = ({ basePdf, scale }: { basePdf: BasePdf, scale: number }) => isBlankPdf(basePdf) && basePdf.staticSchema ?
  basePdf.staticSchema.map((schema) => (
    <Renderer
      key={schema.name}
      schema={{ ...schema, readOnly: true }}
      basePdf={basePdf}
      value={schema.content || ''}
      onChangeHoveringSchemaId={() => { void 0 }}
      mode={'viewer'}
      outline={`none`}
      scale={scale}
      selectable={false}
    />
  )) : null;

export default StaticSchema;