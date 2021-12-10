import React, { forwardRef, ReactNode, Ref } from 'react';
import { getFontFamily } from '../libs/utils';
import { rulerHeight } from '../libs/constants';
import { PageSize, Template } from '../libs/type';

type Props = { template: Template; size: PageSize; scale: number; children: ReactNode };

const Root = ({ size, scale, children, template }: Props, ref: Ref<HTMLDivElement>) => (
  <div
    ref={ref}
    style={{
      fontFamily: getFontFamily(template.fontName),
      position: 'relative',
      background: 'rgb(74, 74, 74)',
      overflowY: 'auto',
      ...size,
    }}
  >
    <div style={{ height: size.height - rulerHeight * scale }}>{children}</div>
  </div>
);

export default forwardRef<HTMLDivElement, Props>(Root);
