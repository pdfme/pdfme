import React from 'react';
import type * as CSS from 'csstype';
import { ZOOM, BasePdf, isBlankPdf } from '@pdfme/common';
import { theme } from 'antd';

const getPaddingStyle = (i: number, p: number, color: string): CSS.Properties => {
  const style: CSS.Properties = {
    position: 'absolute',
    background: color,
    opacity: 0.25,
    pointerEvents: 'none',
  };
  switch (i) {
    case 0:
      style.top = 0;
      style.height = `${p * ZOOM}px`;
      style.left = 0;
      style.right = 0;
      break;
    case 1:
      style.right = 0;
      style.width = `${p * ZOOM}px`;
      style.top = 0;
      style.bottom = 0;
      break;
    case 2:
      style.bottom = 0;
      style.height = `${p * ZOOM}px`;
      style.left = 0;
      style.right = 0;
      break;
    case 3:
      style.left = 0;
      style.width = `${p * ZOOM}px`;
      style.top = 0;
      style.bottom = 0;
      break;
    default:
      break;
  }

  return style;
};

const Padding = ({ basePdf }: { basePdf: BasePdf }) => {
  return <>
    {isBlankPdf(basePdf) &&
      basePdf.padding.map((p, i) => (
        <div key={String(i)} style={getPaddingStyle(i, p, theme.useToken().token.colorError)} />
      ))}
  </>
}

export default Padding;