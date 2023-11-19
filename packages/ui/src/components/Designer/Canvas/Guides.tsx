import React, { Ref } from 'react';
import Guides from '@scena/react-guides';
import { ZOOM, Size } from '@pdfme/common';
import { RULER_HEIGHT } from '../../../constants';

const guideStyle = (
  top: number,
  left: number,
  height: number,
  width: number
): React.CSSProperties => ({
  position: 'absolute',
  top,
  left,
  height,
  width,
  background: '#333333',
});

const _Guides = ({
  paperSize,
  horizontalRef,
  verticalRef,
}: {
  paperSize: Size;
  horizontalRef: Ref<Guides> | undefined;
  verticalRef: Ref<Guides> | undefined;
}) => (
  <>
    <div
      className="ruler-container"
      style={guideStyle(-RULER_HEIGHT, -RULER_HEIGHT, RULER_HEIGHT, RULER_HEIGHT)}
    />
    <Guides
      zoom={ZOOM}
      style={guideStyle(-RULER_HEIGHT, 0, RULER_HEIGHT, paperSize.width)}
      type="horizontal"
      ref={horizontalRef}
    />
    <Guides
      zoom={ZOOM}
      style={guideStyle(0, -RULER_HEIGHT, paperSize.height, RULER_HEIGHT)}
      type="vertical"
      ref={verticalRef}
    />
  </>
);

export default _Guides;
