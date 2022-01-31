import React, { MutableRefObject, ReactNode, useContext } from 'react';
import { FontContext } from '../libs/contexts';
import { ZOOM, RULER_HEIGHT } from '../../../common/src/constants';
import { SchemaForUI, Size } from '../../../common/src/type';
import { getFallbackFontName } from '../../../common/src/helper';

const Paper = (porps: {
  paperRefs?: MutableRefObject<HTMLDivElement[]>;
  scale: number;
  size: Size;
  schemasList: SchemaForUI[][];
  pageSizes: Size[];
  backgrounds: string[];
  renderPaper?: (arg: { index: number; paperSize: Size }) => ReactNode;
  renderSchema: (arg: { index: number; schema: SchemaForUI }) => ReactNode;
}) => {
  const { paperRefs, scale, size, schemasList, pageSizes, backgrounds, renderPaper, renderSchema } =
    porps;
  const font = useContext(FontContext);

  if (pageSizes.length !== backgrounds.length || pageSizes.length !== schemasList.length) {
    return null;
  }

  const topPageWidth = pageSizes[0].width;

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: size.width <= topPageWidth * ZOOM * scale ? `left top` : `center top`,
      }}
    >
      {backgrounds.map((background, paperIndex) => {
        const pageSize = pageSizes[paperIndex];
        const paperSize = { width: pageSize.width * ZOOM, height: pageSize.height * ZOOM };

        return (
          <div
            key={paperIndex + JSON.stringify(paperSize)}
            ref={(e) => {
              if (e && paperRefs) {
                paperRefs.current[paperIndex] = e;
              }
            }}
            style={{
              fontFamily: `'${getFallbackFontName(font)}'`,
              margin: `${RULER_HEIGHT * scale}px auto`,
              position: 'relative',
              backgroundImage: `url(${background})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              ...paperSize,
            }}
          >
            {renderPaper && renderPaper({ paperSize, index: paperIndex })}
            {schemasList[paperIndex].map((schema, schemaIndex) => {
              return (
                <div key={schema.id}>
                  {renderSchema({
                    schema,
                    index:
                      paperIndex === 0
                        ? schemaIndex
                        : schemaIndex + schemasList[paperIndex - 1].length,
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default Paper;
