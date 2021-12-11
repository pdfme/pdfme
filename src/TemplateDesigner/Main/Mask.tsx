import React from 'react';
import { rulerHeight } from '../../libs/constants';
import { PageSize } from '../../libs/type';

const Mask = ({ width, height }: PageSize) => (
  <div
    style={{
      position: 'absolute',
      top: -rulerHeight,
      left: -rulerHeight,
      zIndex: 100,
      background: 'rgba(158, 158, 158, 0.58)',
      width,
      height,
    }}
  />
);

export default Mask;
