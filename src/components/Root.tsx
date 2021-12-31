import type {} from 'css-font-loading-module';
import React, { useContext, forwardRef, ReactNode, Ref, useEffect } from 'react';
import { rulerHeight } from '../libs/constants';
import { PageSize } from '../libs/type';
import { FontContext } from '../libs/contexts';
import Spinner from './Spinner';

type Props = { size: PageSize; scale: number; children: ReactNode };

const Root = ({ size, scale, children }: Props, ref: Ref<HTMLDivElement>) => {
  const font = useContext(FontContext);

  useEffect(() => {
    const fontFaces = Object.entries(font).map((entry) => {
      const [key, value] = entry;
      const fontFace = new FontFace(key, value.data);

      return fontFace.load();
    });
    Promise.all(fontFaces).then((loadedFontFaces) => {
      loadedFontFaces.forEach((loadedFontFace) => {
        document.fonts.add(loadedFontFace);
      });
    });
  }, [font]);

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        background: 'rgb(74, 74, 74)',
        overflowY: 'auto',
        ...size,
      }}
    >
      <div style={{ height: size.height - rulerHeight * scale }}>
        {scale === 0 ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Spinner />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default forwardRef<HTMLDivElement, Props>(Root);
