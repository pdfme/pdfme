import * as styles from './index.module.scss';
import left from '../../../images/left.svg';
import right from '../../../images/right.svg';
import doubleLeft from '../../../images/double-left.svg';
import doubleRight from '../../../images/double-right.svg';

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
}) => (
  <div className={styles.wrapper} style={{ display: !isOpen || pageNum === 1 ? 'none' : 'block' }}>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button className={styles.leftBtn} onClick={() => setPageCursor(0)}>
        {/* TOOD 多言語化 */}
        <img src={doubleLeft} alt={'最初に戻る'} style={{ width: 20 }} />
      </button>
      <button className={styles.leftBtn} onClick={() => setPageCursor(pageCursor - 1)}>
        {/* TOOD 多言語化 */}
        <img src={left} alt={'1つ戻る'} style={{ width: 20 }} />
      </button>
      <strong style={{ color: 'white' }}>
        {pageCursor + 1}/{pageNum}
      </strong>
      <button
        className={styles.rightBtn}
        disabled={pageCursor + 1 >= pageNum}
        onClick={() => setPageCursor(pageCursor + 1)}
      >
        {/* TOOD 多言語化 */}
        <img src={right} alt={'1つ進む'} style={{ width: 20 }} />
      </button>
      <button
        className={styles.rightBtn}
        disabled={pageCursor + 1 >= pageNum}
        onClick={() => setPageCursor(pageNum - 1)}
      >
        {/* TOOD 多言語化 */}
        <img src={doubleRight} alt={'最後に進む'} style={{ width: 20 }} />
      </button>
    </div>
  </div>
);

export default Pager;
