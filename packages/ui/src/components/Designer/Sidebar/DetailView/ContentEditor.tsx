import React, { useContext } from 'react';
import { SchemaForUI } from '@pdfme/common';
import { I18nContext } from '../../../../contexts';
import { SidebarProps } from '..';

const ContentEditor = (
  props: Pick<SidebarProps, 'changeSchemas'> & { activeSchema: SchemaForUI }
) => {
  const { changeSchemas, activeSchema } = props;
  const i18n = useContext(I18nContext);

  return (
    <>
      {activeSchema.type === 'text' && (
        <>
          <label>{i18n('content')}</label>
          <textarea
            rows={6}
            onChange={async (e) => {
              changeSchemas([{ key: 'content', value: e.target.value, schemaId: activeSchema.id }]);
            }}
            style={{
              width: '100%',
              border: '1px solid #767676',
              borderRadius: 2,
              color: '#333',
              background: activeSchema.content ? 'none' : '#ffa19b',
            }}
            value={activeSchema.content}
          />
        </>
      )}
    </>
  );
};

export default ContentEditor;
