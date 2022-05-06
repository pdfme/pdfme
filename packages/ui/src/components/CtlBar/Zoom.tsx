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

type Props = {
  scale: number;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
};

const Pager = ({ scale, zoomLevel, setZoomLevel }: Props) => {
  const i18n = useContext(I18nContext);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <button
        style={{ paddingRight: '0.5rem', ...btnStyle }}
        onClick={() => setZoomLevel(zoomLevel - 0.25)}
      >
        {/* TODO 0より小さくできなくする */}
        <img src={remove} alt={i18n('zoomOut')} style={{ width: 20 }} />
      </button>
      <strong style={{ color: 'white', fontSize: '0.9rem' }}>{Math.round(scale * 100)}%</strong>
      <button
        style={{ paddingRight: '0.5rem', ...btnStyle }}
        onClick={() => setZoomLevel(zoomLevel + 0.25)}
      >
        <img src={add} alt={i18n('zoomIn')} style={{ width: 20 }} />
      </button>
    </div>
  );
};

export default Pager;
