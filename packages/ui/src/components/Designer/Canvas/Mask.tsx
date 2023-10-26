import React from 'react';
import { Size } from '@pdfme/common';
import { RULER_HEIGHT } from '../../../constants';

const Mask = ({ width, height }: Size) => (
  <div
    style={{
      position: 'absolute',
      top: -RULER_HEIGHT,
      left: -RULER_HEIGHT,
      zIndex: 100,
      background: 'rgba(158, 158, 158, 0.58)',
      width,
      height,
    }}
  />
);

export default Mask;
