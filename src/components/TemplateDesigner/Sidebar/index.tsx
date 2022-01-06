import React, { useState, useContext } from 'react';
import * as styles from './index.module.scss';
import { Schema, Size } from '../../../libs/type';
import { I18nContext } from '../../../libs/contexts';
import backIcon from '../../../assets/back.svg';
import forwardIcon from '../../../assets/forward.svg';
import ListView from './ListView';
import DetailView from './DetailView';

export type SidebarProps = {
  height: number;
  pageCursor: number;
  pageSizes: Size[];
  activeElement: HTMLElement | null;
  activeSchema: Schema;
  schemas: Schema[];
  onSortEnd: ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => void;
  onEdit: (id: string) => void;
  onEditEnd: () => void;
  removeSchema: (id: string) => void;
  changeSchemas: (objs: { key: string; value: string | number; schemaId: string }[]) => void;
  addSchema: () => void;
};

const Sidebar = (props: SidebarProps) => {
  const { height, addSchema } = props;

  const i18n = useContext(I18nContext);
  const [open, setOpen] = useState(true);
  const sidebarWidth = 300;
  const top = 0;
  const right = open ? sidebarWidth + 18 : 0;

  return (
    <div style={{ position: 'absolute', height, width: '100%' }}>
      <div style={{ position: 'sticky', top, zIndex: 29 }}>
        <button
          className={`${styles.tglBtn}`}
          style={{ right, top, position: 'absolute' }}
          onClick={() => setOpen(!open)}
        >
          <img src={open ? forwardIcon : backIcon} width={15} alt="Toggle icon" />
        </button>
        <div
          className={styles.sideBar}
          style={{ width: sidebarWidth, display: open ? 'block' : 'none', top }}
        >
          {props.activeElement ? <DetailView {...props} /> : <ListView {...props} />}
          <div className={styles.addBtn}>
            <button style={{ padding: '0.5rem' }} onClick={addSchema}>
              <strong>{i18n('addNewField')}</strong>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
