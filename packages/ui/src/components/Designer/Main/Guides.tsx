import React, { Ref } from 'react';
import Guides from '@scena/react-guides';
import { ZOOM, Size } from '@pdfme/common';
import { RULER_HEIGHT } from '../../../constants';

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
      style={{
        width: RULER_HEIGHT,
        height: RULER_HEIGHT,
        position: 'absolute',
        top: -RULER_HEIGHT,
        left: -RULER_HEIGHT,
        background: '#333',
      }}
    ></div>
    <Guides
      zoom={ZOOM}
      style={{
        position: 'absolute',
        top: -RULER_HEIGHT,
        left: 0,
        height: RULER_HEIGHT,
        width: paperSize.width,
      }}
      type="horizontal"
      ref={horizontalRef}
    />
    <Guides
      zoom={ZOOM}
      style={{
        position: 'absolute',
        top: 0,
        left: -RULER_HEIGHT,
        height: paperSize.height,
        width: RULER_HEIGHT,
      }}
      type="vertical"
      ref={verticalRef}
    />
  </>
);

export default _Guides;
