import React, { useContext, useState } from 'react';
import type { SidebarProps } from '../../../../types';
import { SIDEBAR_WIDTH } from '../../../../constants';
import { I18nContext } from '../../../../contexts';
import { getSidebarContentHeight } from '../../../../helper';
import { Input, Typography, Divider, Button } from 'antd';
import SelectableSortableContainer from './SelectableSortableContainer';

const { Text } = Typography;
const { TextArea } = Input;

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

  const commitBulk = () => {
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
  }

  const startBulk = () => {
    setFieldNamesValue(schemas.map((s) => s.key).join('\n'));
    setIsBulkUpdateFieldNamesMode(true);
  }

  return (
    <div>
      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
        <Text strong style={{ textAlign: 'center', width: '100%' }}>
          {i18n('fieldsList')}
        </Text>
      </div>
      <Divider />
      {/* TODO ここの高さがずれる */}
      <div style={{ height: height - 40 }}>
        {isBulkUpdateFieldNamesMode ? (
          <TextArea
            wrap="off"
            value={fieldNamesValue}
            onChange={(e) => setFieldNamesValue(e.target.value)}
            style={{ paddingLeft: 30, height: height - 40, width: SIDEBAR_WIDTH - 35, lineHeight: '2.75rem' }}
          />
        ) : (
          <SelectableSortableContainer
            schemas={schemas}
            hoveringSchemaId={hoveringSchemaId}
            onChangeHoveringSchemaId={onChangeHoveringSchemaId}
            onSortEnd={onSortEnd}
            onEdit={onEdit}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: 40 }}>
          {isBulkUpdateFieldNamesMode ? (
            <>
              <Button type="text" onClick={commitBulk}              >
                {i18n('commitBulkUpdateFieldName')}
              </Button>
              <span style={{ margin: '0 1rem' }}>/</span>
              <Button type="text" onClick={() => setIsBulkUpdateFieldNamesMode(false)}>{i18n('cancel')}</Button>
            </>
          ) : (
            <Button type="text" onClick={startBulk}>
              {i18n('bulkUpdateFieldName')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListView;
