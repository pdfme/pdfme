import React from 'react';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

const btnStyle: React.CSSProperties = {
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  display: 'flex',
  alignItems: 'center',
};

const zoomStep = 0.25;
const maxZoom = 2;
const minZoom = 0.25;

type Props = {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
};

const Pager = ({ zoomLevel, setZoomLevel }: Props) => {
  const nextZoomOut = zoomLevel - zoomStep;
  const nextZoomIn = zoomLevel + zoomStep;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button
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

export default Pager;
