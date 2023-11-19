import React from 'react';
import { Size } from '@pdfme/common';
import { RULER_HEIGHT } from '../../../constants';
import { theme } from 'antd';

const Mask = ({ width, height }: Size) => (
  <div
    style={{
      position: 'absolute',
      top: -RULER_HEIGHT,
      left: -RULER_HEIGHT,
      zIndex: 100,
      width,
      height,
      background: theme.useToken().token.colorBgMask,
    }}
  />
);

export default Mask;
