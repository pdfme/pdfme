import React from 'react';
import Pager from './Pager';
import Zoom from './Zoom';

type Props = {
  pageCursor: number;
  pageNum: number;
  setPageCursor: (page: number) => void;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
};

const barWidth = 220;

const CtlBar = (props: Props) => {
  const { pageCursor, pageNum, setPageCursor, zoomLevel, setZoomLevel } = props;
  const width = pageNum > 1 ? barWidth : barWidth / 2;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        zIndex: 1,
        top: '90%',
        left: `calc(50% - ${width / 2}px)`,
        width,
        background: '#777777e6',
        borderRadius: 2,
        padding: '0.5rem',
        margin: '0 auto',
      }}
    >
      {pageNum > 1 && (
        <>
          <Pager pageCursor={pageCursor} pageNum={pageNum} setPageCursor={setPageCursor} />
          <strong style={{ color: 'white', fontSize: '0.9rem', padding: 0 }}>|</strong>
        </>
      )}
      <Zoom zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} />
    </div>
  );
};

export default CtlBar;
