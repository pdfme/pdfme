import React, { MutableRefObject, ReactNode, useContext } from 'react';
import { SchemaForUI, Size, getFallbackFontName } from '@pdfme/common';
import { FontContext } from '../contexts';
import { ZOOM, RULER_HEIGHT } from '../constants';

const Paper = (porps: {
  paperRefs: MutableRefObject<HTMLDivElement[]>;
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

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center top',
        ...size,
      }}
    >
      {backgrounds.map((background, paperIndex) => {
        const pageSize = pageSizes[paperIndex];
        const paperSize = { width: pageSize.width * ZOOM, height: pageSize.height * ZOOM };

        return (
          <div
            id={`@pdfme/ui-paper${paperIndex}`}
            key={paperIndex + JSON.stringify(paperSize)}
            ref={(e) => {
              if (e) {
                paperRefs.current[paperIndex] = e;
              }
            }}
            onClick={(e) => {
              if (
                e.currentTarget === e.target &&
                document &&
                document.hasFocus() &&
                document.activeElement instanceof HTMLElement
              ) {
                document.activeElement.blur();
              }
            }}
            style={{
              fontFamily: `'${getFallbackFontName(font)}'`,
              top: `${RULER_HEIGHT}px`,
              left: paperSize.width > size.width ? `${(size.width - paperSize.width) / 2}px` : 0,
              margin: '0 auto',
              position: 'relative',
              backgroundImage: `url(${background})`,
              backgroundSize: `${paperSize.width}px ${paperSize.height}px`,
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
