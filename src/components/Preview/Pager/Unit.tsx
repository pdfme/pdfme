import React, { useContext } from 'react';
import styles from './index.module.scss';
import left from '../../../assets/icons/left.svg';
import right from '../../../assets/icons/right.svg';
import doubleLeft from '../../../assets/icons/double-left.svg';
import doubleRight from '../../../assets/icons/double-right.svg';
import { I18nContext } from '../../../libs/contexts';

type Props = {
  unitCursor: number;
  unitNum: number;
  setUnitCursor: (page: number) => void;
};

const UnitPager = ({ unitCursor, unitNum, setUnitCursor }: Props) => {
  const i18n = useContext(I18nContext);

  if (unitNum <= 1) return <></>;

  return (
    <>
      {unitCursor > 0 && (
        <div className={styles.unitWrapper} style={{ marginLeft: '1rem' }}>
          <button
            className={styles.leftBtn}
            disabled={unitCursor <= 0}
            onClick={() => setUnitCursor(0)}
          >
            <img src={doubleLeft} alt={i18n('goToFirst')} style={{ width: 20 }} />
          </button>
          <button
            className={styles.leftBtn}
            disabled={unitCursor <= 0}
            onClick={() => setUnitCursor(unitCursor - 1)}
          >
            <img src={left} alt={i18n('goToPrevious')} style={{ width: 20 }} />
          </button>
          <strong style={{ color: 'white' }}>
            {unitCursor + 1}/{unitNum}
          </strong>
        </div>
      )}
      {unitCursor + 1 < unitNum && (
        <div className={styles.unitWrapper} style={{ marginLeft: 'auto', marginRight: '1rem' }}>
          <strong style={{ color: 'white' }}>
            {unitCursor + 1}/{unitNum}
          </strong>
          <button
            className={styles.rightBtn}
            disabled={unitCursor + 1 >= unitNum}
            onClick={() => setUnitCursor(unitCursor + 1)}
          >
            <img src={right} alt={i18n('goToNext')} style={{ width: 20 }} />
          </button>
          <button
            className={styles.rightBtn}
            disabled={unitCursor + 1 >= unitNum}
            onClick={() => setUnitCursor(unitNum - 1)}
          >
            <img src={doubleRight} alt={i18n('goToFirst')} style={{ width: 20 }} />
          </button>
        </div>
      )}
    </>
  );
};

export default UnitPager;
