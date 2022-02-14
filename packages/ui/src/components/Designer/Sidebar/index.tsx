import React, { useState, useContext } from 'react';
import { SchemaForUI, Size } from '@pdfme/common';
import { ZOOM, RULER_HEIGHT, SIDEBAR_WIDTH } from '../../../constants';
import { I18nContext } from '../../../contexts';
import backIcon from '../../../assets/icons/back.svg';
import forwardIcon from '../../../assets/icons/forward.svg';
import ListView from './ListView';
import DetailView from './DetailView';

export type SidebarProps = {
  scale: number;
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
  const top = 0;

  return (
    <div
      style={{ position: 'absolute', right: 0, zIndex: 1, height, width: open ? SIDEBAR_WIDTH : 0 }}
    >
      <div style={{ position: 'sticky', top, zIndex: 1, fontSize: '1rem' }}>
        <button
          style={{
            position: 'absolute',
            top: '1rem',
            right: '0.5rem',
            zIndex: 100,
            border: 'none',
            borderRadius: 2,
            padding: '0.5rem',
            cursor: 'pointer',
            background: '#eee',
          }}
          onClick={() => setOpen(!open)}
        >
          <img src={open ? forwardIcon : backIcon} width={15} alt="Toggle icon" />
        </button>
        <div
          style={{
            width: SIDEBAR_WIDTH,
            height: size.height - RULER_HEIGHT * ZOOM,
            display: open ? 'block' : 'none',
            top,
            right: 0,
            position: 'absolute',
            background: '#ffffffed',
            color: '#333',
            border: '1px solid #eee',
            padding: '0.5rem',
            overflowY: 'auto',
            fontFamily: "'Open Sans', sans-serif",
            fontWeight: 400,
          }}
        >
          {props.activeElement ? <DetailView {...props} /> : <ListView {...props} />}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              position: 'absolute',
              width: '100%',
              left: 0,
              bottom: '1rem',
              paddingTop: '1rem',
            }}
          >
            <button
              style={{
                padding: '0.5rem',
                color: '#fff',
                background: '#18a0fb',
                border: 'none',
                borderRadius: 2,
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
