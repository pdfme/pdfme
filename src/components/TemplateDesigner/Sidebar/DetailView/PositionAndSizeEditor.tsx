import React from 'react';
import * as styles from '../index.module.scss';
import { SidebarProps } from '../';

const PositionAndSizeEditor = (
  props: Pick<SidebarProps, 'pageSize' | 'changeSchemas' | 'activeSchema'>
) => {
  const { changeSchemas, activeSchema, pageSize } = props;

  return (
    <div>
      <div className={styles.flx}>
        <div className={styles.inputSet}>
          <label style={{ width: 17 }}>X</label>
          <input
            style={{ width: 70 }}
            type="number"
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 0 && activeSchema.width + value < pageSize.width) {
                changeSchemas([{ key: 'position.x', value, schemaId: activeSchema.id }]);
              }
            }}
            value={activeSchema.position.x}
          />
          <span style={{ fontSize: '0.6rem' }}>mm</span>
        </div>
        <div className={styles.inputSet}>
          <label style={{ width: 17 }}>Y</label>
          <input
            style={{ width: 70 }}
            type="number"
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 0 && activeSchema.height + value < pageSize.height) {
                changeSchemas([{ key: 'position.y', value, schemaId: activeSchema.id }]);
              }
            }}
            value={activeSchema.position.y}
          />
          <span style={{ fontSize: '0.6rem' }}>mm</span>
        </div>
      </div>
      <div className={styles.flx} style={{ marginTop: '0.25rem' }}>
        <div className={styles.inputSet}>
          <label style={{ width: 17 }}>W</label>
          <input
            style={{ width: 70 }}
            type="number"
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 0 && activeSchema.position.x + value < pageSize.width) {
                changeSchemas([{ key: 'width', value, schemaId: activeSchema.id }]);
              }
            }}
            value={activeSchema.width}
          />
          <span style={{ fontSize: '0.6rem' }}>mm</span>
        </div>
        <div className={styles.inputSet}>
          <label style={{ width: 17 }}>H</label>
          <input
            style={{ width: 70 }}
            type="number"
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 0 && activeSchema.position.y + value < pageSize.height) {
                changeSchemas([{ key: 'height', value, schemaId: activeSchema.id }]);
              }
            }}
            value={activeSchema.height}
          />
          <span style={{ fontSize: '0.6rem' }}>mm</span>
        </div>
      </div>
    </div>
  );
};

export default PositionAndSizeEditor;
