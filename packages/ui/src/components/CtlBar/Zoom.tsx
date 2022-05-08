import React, { useContext } from 'react';
import { I18nContext } from '../../contexts';
import add from '../../assets/icons/add.svg';
import remove from '../../assets/icons/remove.svg';

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
  const i18n = useContext(I18nContext);
  const nextZoomOut = zoomLevel - zoomStep;
  const nextZoomIn = zoomLevel + zoomStep;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button
        style={{
          paddingRight: '0.5rem',
          ...btnStyle,
          cursor: minZoom >= nextZoomOut ? 'not-allowed' : 'pointer',
        }}
        disabled={minZoom >= nextZoomOut}
        onClick={() => setZoomLevel(nextZoomOut)}
      >
        <img src={remove} alt={i18n('zoomOut')} style={{ width: 20 }} />
      </button>
      <strong style={{ color: 'white', fontSize: '0.9rem', minWidth: 45, textAlign: 'center' }}>
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
        <img src={add} alt={i18n('zoomIn')} style={{ width: 20 }} />
      </button>
    </div>
  );
};

export default Pager;
