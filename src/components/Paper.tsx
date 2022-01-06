import React, { MutableRefObject, ReactNode, useContext } from 'react';
import { FontContext } from '../libs/contexts';
import { ZOOM, RULER_HEIGHT } from '../libs/constants';
import { Schema, Size } from '../libs/type';
import { getFallbackFontName } from '../libs/helper';

const Paper = ({
  paperRefs,
  scale,
  schemasList,
  pageSizes,
  backgrounds,
  renderPaper,
  renderSchema,
}: {
  paperRefs?: MutableRefObject<HTMLDivElement[]>;
  scale: number;
  schemasList: Schema[][];
  pageSizes: Size[];
  backgrounds: string[];
  renderPaper?: (arg: { index: number; paperSize: Size }) => ReactNode;
  renderSchema: (arg: { index: number; schema: Schema }) => ReactNode;
}) => {
  const font = useContext(FontContext);

  if (pageSizes.length !== backgrounds.length || pageSizes.length !== schemasList.length) {
    return null;
  }

  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
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
            {schemasList[paperIndex].map((schema, schemaIndex) => (
              <div key={schema.id}>{renderSchema({ schema, index: schemaIndex })}</div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default Paper;
