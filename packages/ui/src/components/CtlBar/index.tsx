import React from 'react';
import Pager from './Pager';
import Zoom from './Zoom';
import { Size } from '@pdfme/common';

type Props = {
  size: Size;
  pageCursor: number;
  pageNum: number;
  setPageCursor: (page: number) => void;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
};

const barWidth = 250;

const CtlBar = (props: Props) => {
  const { size, pageCursor, pageNum, setPageCursor, zoomLevel, setZoomLevel } = props;
  const width = pageNum > 1 ? barWidth : barWidth / 2;
  return (
    <div style={{ position: 'absolute', top: 'auto', bottom: '6%', width: size.width }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '15px',
          position: 'relative',
          zIndex: 1,
          left: `calc(50% - ${width / 2}px)`,
          width,
          background: '#777777e6',
          borderRadius: 2,
          padding: '0.5rem',
        }}
      >
        {pageNum > 1 && (
          <Pager pageCursor={pageCursor} pageNum={pageNum} setPageCursor={setPageCursor} />
        )}
        <Zoom zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} />
      </div>
    </div>
  );
};

export default CtlBar;
