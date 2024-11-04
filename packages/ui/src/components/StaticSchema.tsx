import React from 'react';
import { BasePdf, isBlankPdf, replacePlaceholders } from '@pdfme/common';
import Renderer from './Renderer';

const StaticSchema = ({ basePdf, scale, totalPages, currentPage }: { basePdf: BasePdf, scale: number, totalPages: number, currentPage: number }) =>
  <>{
    isBlankPdf(basePdf) && basePdf.staticSchema ?
      basePdf.staticSchema.map((schema) => (
        <Renderer
          key={schema.name}
          schema={schema}
          basePdf={basePdf}
          value={replacePlaceholders({ content: schema.content || '', total: totalPages, page: currentPage })}
          onChangeHoveringSchemaId={() => { void 0 }}
          mode={'viewer'}
          outline={`none`}
          scale={scale}
          selectable={false}
        />
      )) : null
  }</>

export default StaticSchema;