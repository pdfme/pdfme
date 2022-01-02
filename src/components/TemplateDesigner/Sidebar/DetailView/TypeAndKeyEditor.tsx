import React, { useContext, useEffect, useRef, useState } from 'react';
import { SidebarProps } from '../';
import { I18nContext } from '../../../../libs/contexts';
import { inputTypeList } from '../../../../libs/constants';

const TypeAndKeyEditor = (
  props: Pick<SidebarProps, 'schemas' | 'changeSchemas' | 'activeSchema'>
) => {
  const { changeSchemas, activeSchema, schemas } = props;
  const i18n = useContext(I18nContext);

  const [activeSchemaKey, setActiveSchemaKey] = useState(activeSchema.key);
  const [focusing, setFocusing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // TODO ここがおかしい
  // 結局同じ項目設定できている
  useEffect(() => {
    setActiveSchemaKey(activeSchema.key);
    if (inputRef.current) {
      inputRef.current.blur();
      setFocusing(false);
    }
  }, [activeSchema]);

  const schemaKeys = schemas.map((s) => s.key);

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
          ref={inputRef}
          onChange={(e) => {
            setActiveSchemaKey(e.target.value);
          }}
          onBlur={() => {
            if (!focusing && schemaKeys.includes(activeSchemaKey) && inputRef.current) {
              alert(i18n('fieldNameMustBeUniq'));
              inputRef.current.focus();
              setFocusing(true);
            } else {
              changeSchemas([{ key: 'key', value: activeSchemaKey, schemaId: activeSchema.id }]);
              setFocusing(false);
            }
          }}
          style={{ backgroundColor: activeSchema.key ? '#fff' : '#ffa19b' }}
          value={activeSchemaKey}
        />
      </div>
    </div>
  );
};

export default TypeAndKeyEditor;
