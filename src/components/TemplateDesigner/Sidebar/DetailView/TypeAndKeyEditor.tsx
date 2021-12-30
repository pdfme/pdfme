import React, { useContext } from 'react';
import { SidebarProps } from '../';
import { I18nContext } from '../../../../libs/contexts';
import { inputTypeList } from '../../../../libs/constants';

const TypeAndKeyEditor = (props: Pick<SidebarProps, 'changeSchemas' | 'activeSchema'>) => {
  const { changeSchemas, activeSchema } = props;
  const i18n = useContext(I18nContext);

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div>
        <label style={{ marginBottom: 0 }}>{i18n('type')}</label>
        <select
          style={{ width: '100%' }}
          onChange={(e) =>
            changeSchemas([{ key: 'type', value: e.target.value, schemaId: activeSchema.id }])
          }
          value={activeSchema.type}
        >
          {inputTypeList.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <div style={{ width: '100%' }}>
        <label style={{ marginBottom: 0 }}>
          {i18n('fieldName')}
          <u style={{ fontSize: '0.7rem' }}>({i18n('requireAndUniq')})</u>
        </label>
        <input
          onChange={(e) =>
            changeSchemas([{ key: 'key', value: e.target.value, schemaId: activeSchema.id }])
          }
          style={{ backgroundColor: activeSchema.key ? '#fff' : '#ffa19b' }}
          value={activeSchema.key}
        />
      </div>
    </div>
  );
};

export default TypeAndKeyEditor;
