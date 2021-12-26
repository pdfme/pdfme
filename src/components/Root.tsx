import React, { useContext, forwardRef, ReactNode, Ref } from 'react';
import { rulerHeight } from '../libs/constants';
import { PageSize } from '../libs/type';
import { FontContext } from '../libs/contexts';

type Props = { size: PageSize; scale: number; children: ReactNode };

const Root = ({ size, scale, children }: Props, ref: Ref<HTMLDivElement>) => {
  const font = useContext(FontContext);

  console.log('Root', font);

  return (
    <div
      ref={ref}
      style={{
        fontFamily: `'${font.value}'`,
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
