import React, { MutableRefObject, ReactNode, useContext } from 'react';
import { FontContext } from '../libs/contexts';
import { zoom, rulerHeight } from '../libs/constants';
import { TemplateSchema, Schema, PageSize } from '../libs/type';
import { getFallbackFontName } from '../libs/helper';

const Paper = ({
  paperRefs,
  scale,
  schemas,
  pageSizes,
  backgrounds,
  render,
}: {
  paperRefs?: MutableRefObject<HTMLDivElement[]>;
  scale: number;
  schemas: { [key: string]: Schema | TemplateSchema }[];
  pageSizes: PageSize[];
  backgrounds: string[];
  render: ({
    index,
    schema,
    paperSize,
  }: {
    index: number;
    schema: { [key: string]: Schema | TemplateSchema };
    paperSize: PageSize;
  }) => ReactNode;
}) => {
  const font = useContext(FontContext);

  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
      {schemas.map((schema, index) => {
        const pageSize = pageSizes[index];
        if (!pageSize) {
          return null;
        }
        const paperSize = { width: pageSize.width * zoom, height: pageSize.height * zoom };
        const background = backgrounds[index] || '';

        return (
          <div
            key={index + JSON.stringify(paperSize)}
            ref={(e) => {
              if (e && paperRefs) {
                paperRefs.current[index] = e;
              }
            }}
            style={{
              fontFamily: `'${getFallbackFontName(font)}'`,
              margin: `${rulerHeight * scale}px auto`,
              position: 'relative',
              backgroundImage: `url(${background})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              ...paperSize,
            }}
          >
            <div>{render({ index, schema, paperSize })}</div>
          </div>
        );
      })}
    </div>
  );
};

export default Paper;
