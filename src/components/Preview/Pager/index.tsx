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
  <div
    style={{
      display: !isOpen || pageNum === 1 ? 'none' : 'block',
      position: 'absolute',
      right: 0,
      zIndex: 1,
      backgroundColor: 'rgb(153 153 153 / 60%)',
      padding: '0.5rem',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button
        className="button is-small"
        disabled={pageCursor <= 0}
        style={{
          display: 'flex',
          alignItems: 'center',
          marginRight: '0.5rem',
        }}
        onClick={() => setPageCursor(0)}
      >
        <img src={doubleLeft} alt={'最初に戻る'} style={{ width: 20 }} />
      </button>
      <button
        className="button is-small"
        disabled={pageCursor <= 0}
        style={{
          display: 'flex',
          alignItems: 'center',
          marginRight: '0.5rem',
        }}
        onClick={() => setPageCursor(pageCursor - 1)}
      >
        <img src={left} alt={'1つ戻る'} style={{ width: 20 }} />
      </button>
      <strong className="is-size-7" style={{ color: 'white' }}>
        {pageCursor + 1}/{pageNum}
      </strong>
      <button
        className="button is-small"
        disabled={pageCursor + 1 >= pageNum}
        style={{
          display: 'flex',
          alignItems: 'center',
          marginLeft: '0.5rem',
        }}
        onClick={() => setPageCursor(pageCursor + 1)}
      >
        <img src={right} alt={'1つ進む'} style={{ width: 20 }} />
      </button>
      <button
        className="button is-small"
        disabled={pageCursor + 1 >= pageNum}
        style={{
          display: 'flex',
          alignItems: 'center',
          marginLeft: '0.5rem',
        }}
        onClick={() => setPageCursor(pageNum - 1)}
      >
        <img src={doubleRight} alt={'最後に進む'} style={{ width: 20 }} />
      </button>
    </div>
  </div>
);

export default Pager;
