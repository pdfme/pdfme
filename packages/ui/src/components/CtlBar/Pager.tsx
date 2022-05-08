import React, { useContext } from 'react';
import left from '../../assets/icons/left.svg';
import right from '../../assets/icons/right.svg';
import { I18nContext } from '../../contexts';

const btnStyle: React.CSSProperties = {
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  display: 'flex',
  alignItems: 'center',
};

type Props = {
  pageCursor: number;
  pageNum: number;
  setPageCursor: (page: number) => void;
};

const Pager = ({ pageCursor, pageNum, setPageCursor }: Props) => {
  const i18n = useContext(I18nContext);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button
        style={{
          paddingLeft: '0.5rem',
          ...btnStyle,
          cursor: pageCursor <= 0 ? 'not-allowed' : 'pointer',
        }}
        disabled={pageCursor <= 0}
        onClick={() => setPageCursor(pageCursor - 1)}
      >
        <img src={left} alt={i18n('goToPrevious')} style={{ width: 20 }} />
      </button>
      <strong style={{ color: 'white', fontSize: '0.9rem', minWidth: 45, textAlign: 'center' }}>
        {pageCursor + 1}/{pageNum}
      </strong>
      <button
        style={{
          paddingRight: '0.5rem',
          ...btnStyle,
          cursor: pageCursor + 1 >= pageNum ? 'not-allowed' : 'pointer',
        }}
        disabled={pageCursor + 1 >= pageNum}
        onClick={() => setPageCursor(pageCursor + 1)}
      >
        <img src={right} alt={i18n('goToNext')} style={{ width: 20 }} />
      </button>
    </div>
  );
};

export default Pager;
