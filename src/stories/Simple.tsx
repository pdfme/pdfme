import React, { useEffect } from 'react';
import { Template } from '../libs/type';
import { TemplateDesigner, blankPdf } from '../index';

export const Simple = () => {
  useEffect(() => {
    const domContainer = document.getElementById('app');
    if (!domContainer) return;
    const getTemplate = (): Template => ({
      columns: ['field1', 'field2'],
      sampledata: [
        {
          field1: 'bb',
          field2: 'aaaaaaaaaaaa',
        },
      ],
      fontName: '',
      basePdf: blankPdf,
      schemas: [
        {
          field1: {
            type: 'text',
            position: { x: 20, y: 20 },
            width: 100,
            height: 15,
            alignment: 'left',
            fontSize: 30,
            characterSpacing: 0,
            lineHeight: 1,
          },
          field2: {
            type: 'text',
            position: { x: 20, y: 35 },
            width: 100,
            height: 40,
            alignment: 'left',
            fontSize: 20,
            characterSpacing: 0,
            lineHeight: 1,
          },
        },
      ],
    });
    const saveTemplate = (t: any) => {
      console.log(t);

      return Promise.resolve(t);
    };

    // TemplateDesigner.init(domContainer, getTemplate(), saveTemplate, { height: 500, width: 500 });
  });

  return (
    <article>
      <div id="app"></div>
    </article>
  );
};
