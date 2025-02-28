import React, { Ref } from 'react';
import GuidesComponent from '@scena/react-guides';
import { ZOOM, Size } from '@pdfme/common';
import { RULER_HEIGHT } from '../../../constants.js';

// Ensure GuidesComponent is recognized as a valid JSX element
const GuidesComponentElement = GuidesComponent as unknown as React.ComponentType<any>;

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

// Define the interface for the Guides component
interface GuidesInterface {
  getGuides(): number[];
  scroll(pos: number): void;
  scrollGuides(pos: number): void;
  loadGuides(guides: number[]): void;
  resize(): void;
}

const _Guides = ({
  paperSize,
  horizontalRef,
  verticalRef,
}: {
  paperSize: Size;
  horizontalRef: Ref<GuidesInterface> | undefined;
  verticalRef: Ref<GuidesInterface> | undefined;
}) => (
  <>
    <div
      className="ruler-container"
      style={guideStyle(-RULER_HEIGHT, -RULER_HEIGHT, RULER_HEIGHT, RULER_HEIGHT)}
    />
    <GuidesComponentElement
      zoom={ZOOM}
      style={guideStyle(-RULER_HEIGHT, 0, RULER_HEIGHT, paperSize.width)}
      type="horizontal"
      ref={horizontalRef as any}
    />
    <GuidesComponentElement
      zoom={ZOOM}
      style={guideStyle(0, -RULER_HEIGHT, paperSize.height, RULER_HEIGHT)}
      type="vertical"
      ref={verticalRef as any}
    />
  </>
);

export default _Guides;
