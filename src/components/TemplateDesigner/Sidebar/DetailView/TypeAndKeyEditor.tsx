import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { SidebarProps } from '../';
import { I18nContext } from '../../../../libs/contexts';
import { inputTypeList } from '../../../../libs/constants';
import { usePrevious } from '../../../../libs/hooks';

// TODO クリックで選択中のmoveableを切り替えるとkeyがおかしくなる
const TypeAndKeyEditor = (
  props: Pick<SidebarProps, 'schemas' | 'changeSchemas' | 'activeSchema'>
) => {
  const { changeSchemas, activeSchema, schemas } = props;
  const i18n = useContext(I18nContext);

  const [activeSchemaKey, setActiveSchemaKey] = useState(activeSchema.key);
  const prevActiveSchema = usePrevious(activeSchema);

  const inputRef = useRef<HTMLInputElement>(null);

  const getHasSameKey = useCallback(() => {
    const schemaKeys = schemas.map((s) => s.key);
    const index = schemaKeys.indexOf(activeSchema.key);
    if (index > -1) {
      schemaKeys.splice(index, 1);
    }

    return schemaKeys.includes(activeSchemaKey);
  }, [schemas, activeSchemaKey, activeSchema]);

  const isKeyError = getHasSameKey() || !activeSchemaKey;

  const checkAndCommitKey = useCallback(() => {
    const { activeElement } = document;
    const focusing = activeElement === inputRef.current;
    if (!focusing && isKeyError) {
      alert(i18n(activeSchemaKey ? 'fieldNameMustBeUniq' : 'fieldNameIsRequired'));
      inputRef.current?.focus();

      return;
    }

    if (activeSchemaKey !== activeSchema.key) {
      changeSchemas([{ key: 'key', value: activeSchemaKey, schemaId: activeSchema.id }]);
    }
  }, [activeSchema, activeSchemaKey, isKeyError, changeSchemas, i18n]);

  useEffect(() => {
    // TODO ここが動く時におかしい
    if (prevActiveSchema?.id !== activeSchema.id) {
      setActiveSchemaKey(activeSchema.key);
    }
  }, [activeSchema, prevActiveSchema]);

  // useEffect(() => checkAndCommitKey, [activeSchema, activeSchemaKey]);

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
          onChange={(e) => setActiveSchemaKey(e.target.value)}
          onBlur={checkAndCommitKey}
          style={{ backgroundColor: isKeyError ? '#ffa19b' : '#fff' }}
          value={activeSchemaKey}
        />
      </div>
    </div>
  );
};

export default TypeAndKeyEditor;
