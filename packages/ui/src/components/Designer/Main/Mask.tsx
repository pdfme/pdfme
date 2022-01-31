import React from 'react';
import { RULER_HEIGHT } from '../../../../../common/src/constants';
import { Size } from '../../../../../common/src/type';

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
