import React, { useContext } from 'react';
import { Size } from '@pdfme/common';
import { StyleContext } from '../../../contexts';
import { RULER_HEIGHT } from '../../../constants';

const Mask = ({ width, height }: Size) => {

  const style = useContext(StyleContext);

  return <div
    style={{
      position: 'absolute',
      top: -RULER_HEIGHT,
      left: -RULER_HEIGHT,
      zIndex: 100,
      width,
      height,
      background: style.Mask.background,
    }}
  />
};

export default Mask;
