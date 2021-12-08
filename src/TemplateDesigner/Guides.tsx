import { LegacyRef } from 'react';
import Guides from '@scena/react-guides';
import { PageSize } from '../libs/type';
import { zoom, rulerHeight } from '../libs/constants';

const _Guides = ({
  paper,
  horizontalRef,
  verticalRef,
}: {
  paper: PageSize;
  horizontalRef: LegacyRef<Guides> | undefined;
  verticalRef: LegacyRef<Guides> | undefined;
}) => (
  <>
    <Guides
      zoom={zoom}
      style={{
        position: 'absolute',
        top: 0,
        left: rulerHeight,
        height: rulerHeight,
        width: paper.width,
      }}
      type="horizontal"
      ref={horizontalRef}
    />
    <Guides
      zoom={zoom}
      style={{
        position: 'absolute',
        top: rulerHeight,
        left: 0,
        height: paper.height,
        width: rulerHeight,
      }}
      type="vertical"
      ref={verticalRef}
    />
  </>
);

export default _Guides;
