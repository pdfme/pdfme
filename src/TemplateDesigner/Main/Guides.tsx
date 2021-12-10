import React, { Ref } from 'react';
import Guides from '@scena/react-guides';
import { PageSize } from '../../libs/type';
import { zoom, rulerHeight } from '../../libs/constants';

const _Guides = ({
  paperSize,
  horizontalRef,
  verticalRef,
}: {
  paperSize: PageSize;
  horizontalRef: Ref<Guides> | undefined;
  verticalRef: Ref<Guides> | undefined;
}) => (
  <>
    <div
      style={{
        width: rulerHeight,
        height: rulerHeight,
        position: 'absolute',
        top: -rulerHeight,
        left: -rulerHeight,
        background: '#333',
      }}
    ></div>
    <Guides
      zoom={zoom}
      style={{
        position: 'absolute',
        top: -rulerHeight,
        left: 0,
        height: rulerHeight,
        width: paperSize.width,
      }}
      type="horizontal"
      ref={horizontalRef}
    />
    <Guides
      zoom={zoom}
      style={{
        position: 'absolute',
        top: 0,
        left: -rulerHeight,
        height: paperSize.height,
        width: rulerHeight,
      }}
      type="vertical"
      ref={verticalRef}
    />
  </>
);

export default _Guides;
