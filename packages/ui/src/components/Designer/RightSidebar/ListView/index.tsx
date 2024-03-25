import React, { useContext, useState } from 'react';
import type { SidebarProps } from '../../../../types';
import { RIGHT_SIDEBAR_WIDTH } from '../../../../constants';
import { I18nContext } from '../../../../contexts';
import { getSidebarContentHeight } from '../../../../helper';
import { theme, Input, Typography, Divider, Button } from 'antd';
import SelectableSortableContainer from './SelectableSortableContainer';

const { Text } = Typography;
const { TextArea } = Input;

const headHeight = 40;

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
  const { token } = theme.useToken();
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
  };

  const startBulk = () => {
    setFieldNamesValue(schemas.map((s) => s.key).join('\n'));
    setIsBulkUpdateFieldNamesMode(true);
  };

  return (
    <div>
      <div style={{ height: headHeight, display: 'flex', alignItems: 'center' }}>
        <Text strong style={{ textAlign: 'center', width: '100%' }}>
          {i18n('fieldsList')}
        </Text>
      </div>
      <Divider style={{ marginTop: token.marginXS, marginBottom: token.marginXS }} />
      <div style={{ height: height - headHeight }}>
        {isBulkUpdateFieldNamesMode ? (
          <TextArea
            wrap="off"
            value={fieldNamesValue}
            onChange={(e) => setFieldNamesValue(e.target.value)}
            style={{
              paddingLeft: 30,
              height: height - headHeight,
              width: RIGHT_SIDEBAR_WIDTH - 35,
              lineHeight: '2.75rem',
            }}
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
        <div style={{ paddingTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          {isBulkUpdateFieldNamesMode ? (
            <>
              <Button size="small" type="text" onClick={commitBulk}>
                <u> {i18n('commitBulkUpdateFieldName')}</u>
              </Button>
              <span style={{ margin: '0 1rem' }}>/</span>
              <Button size="small" type="text" onClick={() => setIsBulkUpdateFieldNamesMode(false)}>
                <u> {i18n('cancel')}</u>
              </Button>
            </>
          ) : (
            <Button size="small" type="text" onClick={startBulk}>
              <u> {i18n('bulkUpdateFieldName')}</u>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListView;
