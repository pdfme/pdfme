import React, { useContext, useState } from 'react';
import type { SidebarProps } from '../../../../types';
import { SIDEBAR_WIDTH } from '../../../../constants';
import { I18nContext } from '../../../../contexts';
import { getSidebarContentHeight } from '../../../../helper';
import { Divider } from 'antd';
import SelectableSortableContainer from './SelectableSortableContainer';

const ListView = (
  props: Pick<
    SidebarProps,
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
  const height = getSidebarContentHeight(size.height);
  return (
    <div>
      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
        {/* TODO 修正 */}
        <span style={{ textAlign: 'center', width: '100%', fontWeight: 'bold' }}>
          {i18n('fieldsList')}
        </span>
      </div>
      <Divider />
      {isBulkUpdateFieldNamesMode ? (
        <div>
          <textarea
            wrap="off"
            value={fieldNamesValue}
            onChange={(e) => setFieldNamesValue(e.target.value)}
            style={{
              height: height - 5,
              width: SIDEBAR_WIDTH - 35,
              fontSize: '1rem',
              lineHeight: '2.25rem',
              background: 'transparent',
              margin: 0,
              padding: '0.51rem',
              border: '1px  solid #555',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
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
      )}
      {/* TODO 修正 */}
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
            <span style={{ margin: '0 1rem' }}>/</span>
            <u onClick={() => setIsBulkUpdateFieldNamesMode(false)}>{i18n('cancel')}</u>
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
    </div>
  );
};

export default ListView;
