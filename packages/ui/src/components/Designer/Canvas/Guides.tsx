import React, { Ref } from 'react';
import GuidesComponent from '@scena/react-guides';
import { ZOOM, Size } from '@pdfme/common';
import { RULER_HEIGHT } from '../../../constants.js';

const GuidesView = GuidesComponent as unknown as React.ElementType;

const guideStyle = (
  top: number,
  left: number,
  height: number,
  width: number,
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
  horizontalRef: Ref<GuidesComponent> | undefined;
  verticalRef: Ref<GuidesComponent> | undefined;
}) => (
  <>
    <div
      className="ruler-container"
      style={guideStyle(-RULER_HEIGHT, -RULER_HEIGHT, RULER_HEIGHT, RULER_HEIGHT)}
    />
    <GuidesView
      zoom={ZOOM}
      style={guideStyle(-RULER_HEIGHT, 0, RULER_HEIGHT, paperSize.width)}
      type="horizontal"
      ref={horizontalRef}
    />
    <GuidesView
      zoom={ZOOM}
      style={guideStyle(0, -RULER_HEIGHT, paperSize.height, RULER_HEIGHT)}
      type="vertical"
      ref={verticalRef}
    />
  </>
);

export default _Guides;
