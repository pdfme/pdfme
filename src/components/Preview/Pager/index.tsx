import * as styles from './index.module.scss';
import left from '../../../images/left.svg';
import right from '../../../images/right.svg';
import doubleLeft from '../../../images/double-left.svg';
import doubleRight from '../../../images/double-right.svg';
import { useContext } from 'react';
import { I18nContext } from '../../../i18n';

const Pager = ({
  isOpen,
  pageCursor,
  pageNum,
  setPageCursor,
}: {
  isOpen: boolean;
  pageCursor: number;
  pageNum: number;
  setPageCursor: (page: number) => void;
}) => {
  const i18n = useContext(I18nContext);

  return (
    <div
      className={styles.wrapper}
      style={{ display: !isOpen || pageNum === 1 ? 'none' : 'block' }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className={styles.leftBtn} onClick={() => setPageCursor(0)}>
          <img src={doubleLeft} alt={i18n('goToFirst')} style={{ width: 20 }} />
        </button>
        <button className={styles.leftBtn} onClick={() => setPageCursor(pageCursor - 1)}>
          <img src={left} alt={i18n('goToPrevious')} style={{ width: 20 }} />
        </button>
        <strong style={{ color: 'white' }}>
          {pageCursor + 1}/{pageNum}
        </strong>
        <button
          className={styles.rightBtn}
          disabled={pageCursor + 1 >= pageNum}
          onClick={() => setPageCursor(pageCursor + 1)}
        >
          <img src={right} alt={i18n('goToNext')} style={{ width: 20 }} />
        </button>
        <button
          className={styles.rightBtn}
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
