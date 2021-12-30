import React, { useContext, forwardRef, ReactNode, Ref } from 'react';
import { rulerHeight } from '../libs/constants';
import { PageSize } from '../libs/type';
import { FontContext } from '../libs/contexts';
import { getDefaultFontName } from '../libs/utils';

// TODO dataにBinary font dataを入れることでFontFaceを使うことができるかもしれないそっちの方がgenerateと同じフォントを使えるのでいいかも
// というか同じfontのオブジェクトを使えるようにする方が絶対使いやすい
// https://developer.mozilla.org/en-US/docs/Web/API/FontFace/FontFace
type Props = { size: PageSize; scale: number; children: ReactNode };

const Root = ({ size, scale, children }: Props, ref: Ref<HTMLDivElement>) => {
  const font = useContext(FontContext);

  return (
    <div
      ref={ref}
      style={{
        fontFamily: `'${font[getDefaultFontName(font)].data}'`,
        position: 'relative',
        background: 'rgb(74, 74, 74)',
        overflowY: 'auto',
        ...size,
      }}
    >
      <div style={{ height: size.height - rulerHeight * scale }}>{children}</div>
    </div>
  );
};

export default forwardRef<HTMLDivElement, Props>(Root);
