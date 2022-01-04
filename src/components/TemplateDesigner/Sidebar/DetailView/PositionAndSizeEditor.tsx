import React, { useContext } from 'react';
import * as styles from '../index.module.scss';
import { I18nContext } from '../../../../libs/contexts';
import { SidebarProps } from '../';

const PositionAndSizeEditor = (
  props: Pick<SidebarProps, 'pageSizes' | 'pageCursor' | 'changeSchemas' | 'activeSchema'>
) => {
  const { changeSchemas, activeSchema, pageSizes, pageCursor } = props;
  const pageSize = pageSizes[pageCursor];
  const i18n = useContext(I18nContext);

  return (
    <div>
      <p style={{ marginBottom: 0 }}>{i18n('posAndSize')}</p>
      <div className={styles.flx}>
        <div className={styles.inputSet}>
          <label style={{ width: 17 }}>X:</label>
          <input
            style={{ width: 70 }}
            type="number"
            onChange={(e) => {
              const value = Number(e.target.value);
              if (activeSchema.width + value < pageSize.width) {
                changeSchemas([
                  { key: 'position.x', value: String(value), schemaId: activeSchema.id },
                ]);
              }
            }}
            value={activeSchema.position.x}
          />
          <span>mm</span>
        </div>
        <div className={styles.inputSet}>
          <label style={{ width: 17 }}>Y:</label>
          <input
            style={{ width: 70 }}
            type="number"
            onChange={(e) => {
              const value = Number(e.target.value);
              if (activeSchema.height + value < pageSize.height) {
                changeSchemas([
                  { key: 'position.y', value: String(value), schemaId: activeSchema.id },
                ]);
              }
            }}
            value={activeSchema.position.y}
          />
          <span>mm</span>
        </div>
      </div>
      <div className={styles.flx} style={{ marginTop: '0.25rem' }}>
        <div className={styles.inputSet}>
          <label style={{ width: 17 }}>W:</label>
          <input
            style={{ width: 70 }}
            type="number"
            onChange={(e) => {
              const value = Number(e.target.value);
              if (activeSchema.position.x + value < pageSize.width) {
                changeSchemas([{ key: 'width', value: String(value), schemaId: activeSchema.id }]);
              }
            }}
            value={activeSchema.width}
          />
          <span>mm</span>
        </div>
        <div className={styles.inputSet}>
          <label style={{ width: 17 }}>H:</label>
          <input
            style={{ width: 70 }}
            type="number"
            onChange={(e) => {
              const value = Number(e.target.value);
              if (activeSchema.position.y + value < pageSize.height) {
                changeSchemas([{ key: 'height', value: String(value), schemaId: activeSchema.id }]);
              }
            }}
            value={activeSchema.height}
          />
          <span>mm</span>
        </div>
      </div>
    </div>
  );
};

export default PositionAndSizeEditor;
