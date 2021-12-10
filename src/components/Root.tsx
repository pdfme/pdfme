import { forwardRef, ReactNode } from 'react';
import { getFontFamily } from '../libs/utils';
import { rulerHeight } from '../libs/constants';
import { PageSize, Template } from '../libs/type';

const Root = forwardRef<
  HTMLDivElement,
  { template: Template; size: PageSize; scale: number; children: ReactNode }
>(({ size, scale, children, template }, ref) => (
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
));

export default Root;
