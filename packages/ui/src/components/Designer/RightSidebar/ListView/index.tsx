import React, { useContext, useState } from 'react';
import type { SidebarProps } from '../../../../types.js';
import { DESIGNER_CLASSNAME } from '../../../../constants.js';
import { I18nContext } from '../../../../contexts.js';
import { Input, Typography, Button } from 'antd';
import SelectableSortableContainer from './SelectableSortableContainer.js';
import { SidebarBody, SidebarFooter, SidebarFrame, SidebarHeader } from '../layout.js';

const { Text } = Typography;
const { TextArea } = Input;

const ListView = (
  props: Pick<
    SidebarProps,
    | 'schemas'
    | 'onSortEnd'
    | 'onEdit'
    | 'hoveringSchemaId'
    | 'onChangeHoveringSchemaId'
    | 'changeSchemas'
  >,
) => {
  const { schemas, onSortEnd, onEdit, hoveringSchemaId, onChangeHoveringSchemaId, changeSchemas } =
    props;
  const i18n = useContext(I18nContext);
  const [isBulkUpdateFieldNamesMode, setIsBulkUpdateFieldNamesMode] = useState(false);
  const [fieldNamesValue, setFieldNamesValue] = useState('');

  const commitBulk = () => {
    const names = fieldNamesValue.split('\n');
    if (names.length !== schemas.length) {
      alert(i18n('errorBulkUpdateFieldName'));
    } else {
      changeSchemas(
        names.map((value, index) => ({
          key: 'name',
          value,
          schemaId: schemas[index].id,
        })),
      );
      setIsBulkUpdateFieldNamesMode(false);
    }
  };

  const startBulk = () => {
    setFieldNamesValue(schemas.map((s) => s.name).join('\n'));
    setIsBulkUpdateFieldNamesMode(true);
  };

  return (
    <SidebarFrame className={DESIGNER_CLASSNAME + 'list-view'}>
      <SidebarHeader>
        <Text strong style={{ textAlign: 'center', width: '100%' }}>
          {i18n('fieldsList')}
        </Text>
      </SidebarHeader>
      <SidebarBody>
        {isBulkUpdateFieldNamesMode ? (
          <TextArea
            wrap="off"
            value={fieldNamesValue}
            onChange={(e) => setFieldNamesValue(e.target.value)}
            style={{
              height: '100%',
              width: '100%',
              resize: 'none',
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
      </SidebarBody>
      <SidebarFooter>
        {isBulkUpdateFieldNamesMode ? (
          <>
            <Button
              className={DESIGNER_CLASSNAME + 'bulk-commit'}
              size="small"
              type="text"
              onClick={commitBulk}
            >
              <u> {i18n('commitBulkUpdateFieldName')}</u>
            </Button>
            <span>/</span>
            <Button
              className={DESIGNER_CLASSNAME + 'bulk-cancel'}
              size="small"
              type="text"
              onClick={() => setIsBulkUpdateFieldNamesMode(false)}
            >
              <u> {i18n('cancel')}</u>
            </Button>
          </>
        ) : (
          <Button
            className={DESIGNER_CLASSNAME + 'bulk-update'}
            size="small"
            type="text"
            onClick={startBulk}
          >
            <u> {i18n('bulkUpdateFieldName')}</u>
          </Button>
        )}
      </SidebarFooter>
    </SidebarFrame>
  );
};

export default ListView;
