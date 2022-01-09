import React, { useState, useContext } from 'react';
import * as styles from './index.module.scss';
import { SchemaForUI, Size } from '../../../libs/type';
import { RULER_HEIGHT, ZOOM } from '../../../libs/constants';
import { I18nContext } from '../../../libs/contexts';
import backIcon from '../../../assets/icons/back.svg';
import forwardIcon from '../../../assets/icons/forward.svg';
import ListView from './ListView';
import DetailView from './DetailView';

export type SidebarProps = {
  height: number;
  hoveringSchemaId: string | null;
  onChangeHoveringSchemaId: (id: string | null) => void;
  size: Size;
  pageSize: Size;
  activeElement: HTMLElement | null;
  activeSchema: SchemaForUI;
  schemas: SchemaForUI[];
  onSortEnd: ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => void;
  onEdit: (id: string) => void;
  onEditEnd: () => void;
  changeSchemas: (objs: { key: string; value: string | number; schemaId: string }[]) => void;
  addSchema: () => void;
};

const Sidebar = (props: SidebarProps) => {
  const { height, size, addSchema } = props;

  const i18n = useContext(I18nContext);
  const [open, setOpen] = useState(true);
  const sidebarWidth = 260;
  const top = 0;

  return (
    <div style={{ position: 'absolute', height, width: '100%' }}>
      <div style={{ position: 'sticky', top, zIndex: 29 }}>
        <button className={`${styles.tglBtn}`} onClick={() => setOpen(!open)}>
          <img src={open ? forwardIcon : backIcon} width={15} alt="Toggle icon" />
        </button>
        <div
          className={styles.sideBar}
          style={{
            width: sidebarWidth,
            height: size.height - RULER_HEIGHT * ZOOM,
            display: open ? 'block' : 'none',
            top,
          }}
        >
          {props.activeElement ? <DetailView {...props} /> : <ListView {...props} />}
          <div className={styles.addBtn}>
            <button
              style={{
                padding: '0.5rem',
                color: '#fff',
                background: '#18a0fb',
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
              }}
              onClick={addSchema}
            >
              <strong>{i18n('addNewField')}</strong>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
