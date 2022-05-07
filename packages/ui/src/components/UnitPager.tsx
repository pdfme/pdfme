import React, { useContext } from 'react';
import left from '../assets/icons/left.svg';
import right from '../assets/icons/right.svg';
import doubleLeft from '../assets/icons/double-left.svg';
import doubleRight from '../assets/icons/double-right.svg';
import { I18nContext } from '../contexts';
import { Size } from '@pdfme/common';

const buttonHeight = 38;
const buttonWrapStyle: React.CSSProperties = {
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
  const i18n = useContext(I18nContext);

  if (unitNum <= 1) return <></>;

  return (
    <div style={{ position: 'absolute', ...size }}>
      <div
        style={{
          position: 'sticky',
          width: '100%',
          zIndex: 1,
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
              <img src={doubleLeft} alt={i18n('goToFirst')} style={{ width: 20 }} />
            </button>
            <button
              style={{ paddingLeft: '0.5rem', ...btnStyle }}
              disabled={unitCursor <= 0}
              onClick={() => setUnitCursor(unitCursor - 1)}
            >
              <img src={left} alt={i18n('goToPrevious')} style={{ width: 20 }} />
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
              <img src={right} alt={i18n('goToNext')} style={{ width: 20 }} />
            </button>
            <button
              style={{ paddingRight: '0.5rem', ...btnStyle }}
              disabled={unitCursor + 1 >= unitNum}
              onClick={() => setUnitCursor(unitNum - 1)}
            >
              <img src={doubleRight} alt={i18n('goToFirst')} style={{ width: 20 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitPager;
