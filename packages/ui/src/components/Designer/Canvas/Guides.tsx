import React, { Ref, useContext, useMemo } from 'react';
import GuidesComponent from '@scena/react-guides';
import { ZOOM, Size } from '@pdfme/common';
import { DEFAULT_LANG, RULER_HEIGHT } from '../../../constants.js';
import { OptionsContext } from '../../../contexts.js';

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

const Guides = ({
  paperSize,
  horizontalRef,
  verticalRef,
}: {
  paperSize: Size;
  horizontalRef: Ref<GuidesComponent> | undefined;
  verticalRef: Ref<GuidesComponent> | undefined;
}) => {
  const { guides, lang = DEFAULT_LANG } = useContext(OptionsContext);
  const { precision = 0, snapToPageCenter = false, showPosition = false } = guides ?? {};

  const formatPosition = useMemo(() => {
    if (!showPosition) return undefined;
    const numberFormat = new Intl.NumberFormat(lang, { maximumFractionDigits: precision });
    return (mm: number) => `${numberFormat.format(mm)}\u00A0mm`;
  }, [showPosition, lang, precision]);

  // Guide positions are in mm and paperSize is in px. A horizontal guide is a Y position
  // (page height), a vertical guide is an X position (page width).
  const horizontalSnaps = useMemo(
    () => (snapToPageCenter ? [paperSize.height / ZOOM / 2] : undefined),
    [snapToPageCenter, paperSize.height],
  );
  const verticalSnaps = useMemo(
    () => (snapToPageCenter ? [paperSize.width / ZOOM / 2] : undefined),
    [snapToPageCenter, paperSize.width],
  );

  const guidesProps = {
    zoom: ZOOM,
    digit: precision,
    displayDragPos: showPosition,
    displayGuidePos: showPosition,
    dragPosFormat: formatPosition,
  };

  return (
    <>
      <div
        className="ruler-container"
        style={guideStyle(-RULER_HEIGHT, -RULER_HEIGHT, RULER_HEIGHT, RULER_HEIGHT)}
      />
      <GuidesView
        {...guidesProps}
        snaps={horizontalSnaps}
        style={guideStyle(-RULER_HEIGHT, 0, RULER_HEIGHT, paperSize.width)}
        type="horizontal"
        ref={horizontalRef}
      />
      <GuidesView
        {...guidesProps}
        snaps={verticalSnaps}
        style={guideStyle(0, -RULER_HEIGHT, paperSize.height, RULER_HEIGHT)}
        type="vertical"
        ref={verticalRef}
      />
    </>
  );
};

export default Guides;
