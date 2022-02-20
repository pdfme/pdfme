import React, { useContext, useState } from 'react';
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import { SchemaForUI } from '@pdfme/common';
import { ZOOM, RULER_HEIGHT, SIDEBAR_WIDTH } from '../../../../constants';
import { I18nContext } from '../../../../contexts';
import Divider from '../../../Divider';
import dragIcon from '../../../../assets/icons/drag.svg';
import warningIcon from '../../../../assets/icons/warning.svg';
import SelectableSortableContainer from './SelectableSortableContainer';
import { SidebarProps } from '..';

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
    height: number;
    hoveringSchemaId: string | null;
    onChangeHoveringSchemaId: (id: string | null) => void;
  }) => {
    const { scale, schemas, onEdit, height, hoveringSchemaId, onChangeHoveringSchemaId } = props;
    const i18n = useContext(I18nContext);

    return (
      <div style={{ height, overflowY: 'auto' }}>
        {schemas.length > 0 ? (
          schemas.map((s, i) => (
            <div
              key={s.id}
              style={{
                border: `1px solid ${s.id === hoveringSchemaId ? '#18a0fb' : 'transparent'}`,
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
    | 'changeSchemas'
  >
) => {
  const {
    scale,
    schemas,
    onSortEnd,
    onEdit,
    size,
    hoveringSchemaId,
    onChangeHoveringSchemaId,
    changeSchemas,
  } = props;
  const i18n = useContext(I18nContext);
  const [isBulkUpdateFieldNamesMode, setIsBulkUpdateFieldNamesMode] = useState(false);
  const [fieldNamesValue, setFieldNamesValue] = useState('');
  const height = size.height - RULER_HEIGHT * ZOOM - 135;
  return (
    <div>
      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
        <p style={{ textAlign: 'center', width: '100%', fontWeight: 'bold' }}>
          {i18n('fieldsList')}
        </p>
      </div>
      <Divider />
      {isBulkUpdateFieldNamesMode ? (
        <div>
          <textarea
            value={fieldNamesValue}
            onChange={(e) => setFieldNamesValue(e.target.value)}
            style={{
              height,
              width: '100%',
              fontSize: '1rem',
              lineHeight: '2rem',
              background: 'transparent',
            }}
          ></textarea>
        </div>
      ) : (
        <SelectableSortableContainer
          height={height}
          schemas={schemas}
          hoveringSchemaId={hoveringSchemaId}
          onChangeHoveringSchemaId={onChangeHoveringSchemaId}
          onSortEnd={onSortEnd}
          onEdit={onEdit}
        />
        // <SortableList
        //   scale={scale}
        //
        //   hoveringSchemaId={hoveringSchemaId}
        //   onChangeHoveringSchemaId={onChangeHoveringSchemaId}
        //   updateBeforeSortStart={(node: any) => {
        //     if (node.node.style) {
        //       node.node.style.zIndex = '9999';
        //     }
        //   }}
        //   useDragHandle
        //   axis="y"
        //   lockAxis="y"
        //   schemas={schemas}
        //   onSortEnd={onSortEnd}
        //   onEdit={onEdit}
        // />
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          cursor: 'pointer',
          fontSize: '0.75rem',
        }}
      >
        {isBulkUpdateFieldNamesMode ? (
          <>
            <u onClick={() => setIsBulkUpdateFieldNamesMode(false)}>{i18n('cancel')}</u>
            <span style={{ margin: '0 1rem' }}>/</span>
            <u
              onClick={() => {
                const names = fieldNamesValue.split('\n');
                if (names.length !== schemas.length) {
                  alert(i18n('errorBulkUpdateFieldName'));
                } else {
                  changeSchemas(
                    names.map((value, index) => ({
                      key: 'key',
                      value,
                      schemaId: schemas[index].id,
                    }))
                  );
                  setIsBulkUpdateFieldNamesMode(false);
                }
              }}
            >
              {i18n('commitBulkUpdateFieldName')}
            </u>
          </>
        ) : (
          <u
            onClick={() => {
              setFieldNamesValue(schemas.map((s) => s.key).join('\n'));
              setIsBulkUpdateFieldNamesMode(true);
            }}
          >
            {i18n('bulkUpdateFieldName')}
          </u>
        )}
      </div>
      <Divider />
    </div>
  );
};

export default ListView;
