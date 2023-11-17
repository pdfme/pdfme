import React from 'react';
import Zoom from './Zoom';
import { Size } from '@pdfme/common';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const btnStyle: React.CSSProperties = {
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  display: 'flex',
  alignItems: 'center',
};

type ZoomProps = {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
};

const Zoom = ({ zoomLevel, setZoomLevel }: ZoomProps) => {
  const zoomStep = 0.25;
  const maxZoom = 2;
  const minZoom = 0.25;

  const nextZoomOut = zoomLevel - zoomStep;
  const nextZoomIn = zoomLevel + zoomStep;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button
        type="button"
        style={{
          paddingLeft: '0.5rem',
          ...btnStyle,
          cursor: minZoom >= nextZoomOut ? 'not-allowed' : 'pointer',
        }}
        disabled={minZoom >= nextZoomOut}
        onClick={() => setZoomLevel(nextZoomOut)}
      >
        <MinusIcon width={20} height={20} color={'#fff'} />
      </button>
      <strong style={{ color: 'white', fontSize: '0.9rem', minWidth: 50, textAlign: 'center' }}>
        {Math.round(zoomLevel * 100)}%
      </strong>
      <button
        type="button"
        style={{
          paddingRight: '0.5rem',
          ...btnStyle,
          cursor: maxZoom < nextZoomIn ? 'not-allowed' : 'pointer',
        }}
        disabled={maxZoom < nextZoomIn}
        onClick={() => setZoomLevel(nextZoomIn)}
      >
        <PlusIcon width={20} height={20} color={'#fff'} />
      </button>
    </div>
  );
};

type PagerProps = {
  pageCursor: number;
  pageNum: number;
  setPageCursor: (page: number) => void;
};

const Pager = ({ pageCursor, pageNum, setPageCursor }: PagerProps) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button
        type="button"
        style={{
          paddingLeft: '0.5rem',
          ...btnStyle,
          cursor: pageCursor <= 0 ? 'not-allowed' : 'pointer',
        }}
        disabled={pageCursor <= 0}
        onClick={() => setPageCursor(pageCursor - 1)}
      >
        <ChevronLeftIcon width={20} height={20} color={'#fff'} />
      </button>
      <strong style={{ color: 'white', fontSize: '0.9rem', minWidth: 45, textAlign: 'center' }}>
        {pageCursor + 1}/{pageNum}
      </strong>
      <button
        type="button"
        style={{
          paddingRight: '0.5rem',
          ...btnStyle,
          cursor: pageCursor + 1 >= pageNum ? 'not-allowed' : 'pointer',
        }}
        disabled={pageCursor + 1 >= pageNum}
        onClick={() => setPageCursor(pageCursor + 1)}
      >
        <ChevronRightIcon width={20} height={20} color={'#fff'} />
      </button>
    </div>
  );
};

type CtlBarProps = {
  size: Size;
  pageCursor: number;
  pageNum: number;
  setPageCursor: (page: number) => void;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
};


const CtlBar = (props: CtlBarProps) => {
  const barWidth = 250;
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
