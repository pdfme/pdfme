import React, { useContext } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
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
        <ChevronLeftIcon width={20} height={20} color={'#fff'} />
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
        <ChevronRightIcon width={20} height={20} color={'#fff'} />
      </button>
    </div>
  );
};

export default Pager;
