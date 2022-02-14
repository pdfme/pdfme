import React, { useContext } from 'react';
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import { SchemaForUI, Size } from '@pdfme/common';
import { ZOOM, RULER_HEIGHT, SIDEBAR_WIDTH } from '../../../constants';
import { I18nContext } from '../../../contexts';
import Divider from '../../Divider';
import dragIcon from '../../../assets/icons/drag.svg';
import warningIcon from '../../../assets/icons/warning.svg';
import { SidebarProps } from '.';

const isTouchable = () => true;

const DragHandle = SortableHandle(() => (
  <button style={{ padding: 0, background: 'none', border: 'none', display: 'flex' }}>
    <img style={{ cursor: 'grab' }} src={dragIcon} width={15} alt="Drag icon" />
  </button>
));

const SortableItem = SortableElement(
  (props: { schemas: SchemaForUI[]; schema: SchemaForUI; onEdit: (id: string) => void }) => {
    const { schemas, schema, onEdit } = props;
    const i18n = useContext(I18nContext);

    const sc = schema;
    let status: '' | 'is-warning' | 'is-danger' = '';
    if (!sc.key) {
      status = 'is-warning';
    } else if (schemas.find((s) => sc.key && s.key === sc.key && s.id !== sc.id)) {
      status = 'is-danger';
    }

    const touchable = isTouchable();

    const getTitle = () => {
      if (status === 'is-warning') {
        return i18n('plsInputName');
      }
      if (status === 'is-danger') {
        return i18n('fieldMustUniq');
      }

      return i18n('edit');
    };

    return (
      <div
        key={sc.id}
        style={{
          paddingLeft: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <DragHandle />
        <button
          disabled={!touchable}
          className={`${status}`}
          style={{
            padding: 5,
            margin: 5,
            width: '100%',
            display: 'flex',
            background: 'none',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
          onClick={() => onEdit(sc.id)}
          title={getTitle()}
        >
          <span
            style={{
              marginRight: '1rem',
              width: 180,
              color: '#333',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {status === '' ? (
              sc.key
            ) : (
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <img
                  alt="Warning icon"
                  src={warningIcon}
                  width={15}
                  style={{ marginRight: '0.5rem' }}
                />
                {status === 'is-warning' ? i18n('noKeyName') : sc.key}
                {status === 'is-danger' ? i18n('notUniq') : ''}
              </span>
            )}
          </span>
        </button>
      </div>
    );
  }
);

const SortableList = SortableContainer(
  (props: {
    scale: number;
    schemas: SchemaForUI[];
    onEdit: (id: string) => void;
    size: Size;
    hoveringSchemaId: string | null;
    onChangeHoveringSchemaId: (id: string | null) => void;
  }) => {
    const { scale, schemas, onEdit, size, hoveringSchemaId, onChangeHoveringSchemaId } = props;
    const i18n = useContext(I18nContext);

    return (
      <div style={{ height: size.height - RULER_HEIGHT * ZOOM - 125, overflowY: 'auto' }}>
        {schemas.length > 0 ? (
          schemas.map((s, i) => (
            <div
              key={s.id}
              style={{
                border: `1px solid ${s.id === hoveringSchemaId ? '#18a0fb' : 'transparent'}`,
                // Reasons for adapting transform
                // https://github.com/clauderic/react-sortable-hoc/issues/386
                width: SIDEBAR_WIDTH * scale,
                transform: `scale(${1 - scale + 1})`,
                transformOrigin: 'top left',
              }}
              onMouseEnter={() => onChangeHoveringSchemaId(s.id)}
              onMouseLeave={() => onChangeHoveringSchemaId(null)}
            >
              <SortableItem
                disabled={!isTouchable()}
                index={i}
                schemas={schemas}
                schema={s}
                onEdit={onEdit}
              />
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center' }}>{i18n('plsAddNewField')}</p>
        )}
      </div>
    );
  }
);

const ListView = (
  props: Pick<
    SidebarProps,
    | 'scale'
    | 'schemas'
    | 'onSortEnd'
    | 'onEdit'
    | 'size'
    | 'hoveringSchemaId'
    | 'onChangeHoveringSchemaId'
  >
) => {
  const { scale, schemas, onSortEnd, onEdit, size, hoveringSchemaId, onChangeHoveringSchemaId } =
    props;
  const i18n = useContext(I18nContext);

  return (
    <div>
      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
        <p style={{ textAlign: 'center', width: '100%', fontWeight: 'bold' }}>
          {i18n('fieldsList')}
        </p>
      </div>
      <Divider />
      <SortableList
        scale={scale}
        size={size}
        hoveringSchemaId={hoveringSchemaId}
        onChangeHoveringSchemaId={onChangeHoveringSchemaId}
        updateBeforeSortStart={(node: any) => {
          if (node.node.style) {
            node.node.style.zIndex = '9999';
          }
        }}
        useDragHandle
        axis="y"
        lockAxis="y"
        schemas={schemas}
        onSortEnd={onSortEnd}
        onEdit={onEdit}
      />
      <Divider />
    </div>
  );
};

export default ListView;
