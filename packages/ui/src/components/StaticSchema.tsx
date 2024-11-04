import React from 'react';
import { BasePdf, isBlankPdf, replacePlaceholders } from '@pdfme/common';
import Renderer from './Renderer';
import { uuid } from '../helper'

const StaticSchema = ({ basePdf, scale, totalPages, currentPage, input }: { basePdf: BasePdf, scale: number, totalPages: number, currentPage: number, input: Record<string, string> }) =>
  <>{
    isBlankPdf(basePdf) && basePdf.staticSchema ?
      basePdf.staticSchema.map((schema) => (
        <Renderer
          key={schema.name}
          schema={{ ...schema, id: uuid() }}
          basePdf={basePdf}
          value={replacePlaceholders({ content: schema.content || '', input, total: totalPages, page: currentPage })}
          onChangeHoveringSchemaId={() => { void 0 }}
          mode={'viewer'}
          outline={`none`}
          scale={scale}
          selectable={false}
        />
      )) : null
  }</>

export default StaticSchema;