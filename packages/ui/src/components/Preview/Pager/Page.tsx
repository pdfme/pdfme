import React, { useContext } from 'react';
import left from '../../../assets/icons/left.svg';
import right from '../../../assets/icons/right.svg';
import doubleLeft from '../../../assets/icons/double-left.svg';
import doubleRight from '../../../assets/icons/double-right.svg';
import { I18nContext } from '../../../contexts';

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

  if (pageNum <= 1) return <></>;

  return (
    <div
      style={{
        position: 'sticky',
        top: '90%',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#777777e6',
          borderRadius: 2,
          padding: '0.5rem',
        }}
      >
        <button
          style={{ paddingLeft: '0.5rem', ...btnStyle }}
          disabled={pageCursor <= 0}
          onClick={() => setPageCursor(0)}
        >
          <img src={doubleLeft} alt={i18n('goToFirst')} style={{ width: 20 }} />
        </button>
        <button
          style={{ paddingLeft: '0.5rem', ...btnStyle }}
          disabled={pageCursor <= 0}
          onClick={() => setPageCursor(pageCursor - 1)}
        >
          <img src={left} alt={i18n('goToPrevious')} style={{ width: 20 }} />
        </button>
        <strong style={{ color: 'white' }}>
          {pageCursor + 1}/{pageNum}
        </strong>
        <button
          style={{ paddingRight: '0.5rem', ...btnStyle }}
          disabled={pageCursor + 1 >= pageNum}
          onClick={() => setPageCursor(pageCursor + 1)}
        >
          <img src={right} alt={i18n('goToNext')} style={{ width: 20 }} />
        </button>
        <button
          style={{ paddingRight: '0.5rem', ...btnStyle }}
          disabled={pageCursor + 1 >= pageNum}
          onClick={() => setPageCursor(pageNum - 1)}
        >
          <img src={doubleRight} alt={i18n('goToFirst')} style={{ width: 20 }} />
        </button>
      </div>
    </div>
  );
};

export default Pager;
