import React, { useContext, forwardRef, ReactNode, Ref, useEffect } from 'react';
import { Size } from '@pdfme/common';
import { FontContext } from '../contexts';
import { BACKGROUND_COLOR } from '../constants';
import Spinner from './Spinner';

type Props = { size: Size; scale: number; children: ReactNode };

const Root = ({ size, scale, children }: Props, ref: Ref<HTMLDivElement>) => {
  const font = useContext(FontContext);

  useEffect(() => {
    if (!document || !document.fonts) return;
    const fontFaces = Object.entries(font).map(
      ([key, { data }]) =>
        new FontFace(key, typeof data === 'string' ? `url(${data})` : data, {
          display: 'swap',
        })
    );
    // @ts-ignore
    const newFontFaces = fontFaces.filter((fontFace) => !document.fonts.has(fontFace));

    Promise.allSettled(newFontFaces.map((f) => f.load())).then((loadedFontFaces) => {
      loadedFontFaces.forEach((loadedFontFace) => {
        if (loadedFontFace.status === 'fulfilled') {
          // @ts-ignore
          document.fonts.add(loadedFontFace.value);
        }
      });
    });
  }, [font]);

  return (
    <div ref={ref} style={{ position: 'relative', background: BACKGROUND_COLOR, ...size }}>
      <div style={{ margin: '0 auto', ...size }}>{scale === 0 ? <Spinner /> : children}</div>
    </div>
  );
};

export default forwardRef<HTMLDivElement, Props>(Root);
