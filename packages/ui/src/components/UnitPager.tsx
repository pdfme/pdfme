import React from 'react';
import {
  ChevronLeftIcon,
  ChevronDoubleLeftIcon,
  ChevronRightIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';
import { Size } from '@pdfme/common';

const buttonHeight = 38;
const buttonWrapStyle: React.CSSProperties = {
  pointerEvents: 'initial',
  position: 'sticky',
  zIndex: 1,
  backgroundColor: '#777777bd',
  borderRadius: 2,
  padding: '0.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-around',
  boxSizing: 'border-box',
  width: 110,
  height: buttonHeight,
};

const btnStyle: React.CSSProperties = {
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  display: 'flex',
  alignItems: 'center',
};

type Props = {
  size: Size;
  unitCursor: number;
  unitNum: number;
  setUnitCursor: (page: number) => void;
};

const UnitPager = ({ size, unitCursor, unitNum, setUnitCursor }: Props) => {
  if (unitNum <= 1) return <></>;

  return (
    <div style={{ position: 'absolute', ...size }}>
      <div
        style={{
          position: 'sticky',
          width: '100%',
          zIndex: 1,
          pointerEvents: 'none',
          top: `calc(50% - ${buttonHeight / 2}px)`,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {unitCursor > 0 && (
          <div style={{ left: '1rem', marginLeft: '1rem', ...buttonWrapStyle }}>
            <button
              style={{ paddingLeft: '0.5rem', ...btnStyle }}
              disabled={unitCursor <= 0}
              onClick={() => setUnitCursor(0)}
            >
              <ChevronDoubleLeftIcon width={20} height={20} color={'#fff'} />
            </button>
            <button
              style={{ paddingLeft: '0.5rem', ...btnStyle }}
              disabled={unitCursor <= 0}
              onClick={() => setUnitCursor(unitCursor - 1)}
            >
              <ChevronLeftIcon width={20} height={20} color={'#fff'} />
            </button>
            <strong style={{ color: 'white', fontSize: '0.9rem' }}>
              {unitCursor + 1}/{unitNum}
            </strong>
          </div>
        )}
        {unitCursor + 1 < unitNum && (
          <div
            style={{ right: '1rem', marginLeft: 'auto', marginRight: '1rem', ...buttonWrapStyle }}
          >
            <strong style={{ color: 'white', fontSize: '0.9rem' }}>
              {unitCursor + 1}/{unitNum}
            </strong>
            <button
              style={{ paddingRight: '0.5rem', ...btnStyle }}
              disabled={unitCursor + 1 >= unitNum}
              onClick={() => setUnitCursor(unitCursor + 1)}
            >
              <ChevronRightIcon width={20} height={20} color={'#fff'} />
            </button>
            <button
              style={{ paddingRight: '0.5rem', ...btnStyle }}
              disabled={unitCursor + 1 >= unitNum}
              onClick={() => setUnitCursor(unitNum - 1)}
            >
              <ChevronDoubleRightIcon width={20} height={20} color={'#fff'} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitPager;
