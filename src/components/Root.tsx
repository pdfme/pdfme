import { forwardRef, ReactNode } from 'react';
import { getFontFamily } from '../libs/utils';
import { PageSize, Template } from '../libs/type';

const Root = forwardRef<
  HTMLDivElement,
  { template: Template; size: PageSize; children: ReactNode }
>(({ size, children, template }, ref) => (
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
    {children}
  </div>
));

export default Root;
