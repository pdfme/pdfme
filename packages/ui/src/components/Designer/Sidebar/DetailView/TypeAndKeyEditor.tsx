import React, { useContext, useRef, useCallback } from 'react';
import { schemaTypes, SchemaForUI } from '@pdfme/common';
import { SidebarProps } from '../index';
import { I18nContext } from '../../../../contexts';

const ErrorLabel = ({ isError, msg }: { isError: boolean; msg: string }) => (
  <span
    style={{ color: isError ? '#ffa19b' : 'inherit', fontWeight: isError ? 'bold' : 'inherit' }}
  >
    {msg}
  </span>
);

const TypeAndKeyEditor = (
  props: Pick<SidebarProps, 'schemas' | 'changeSchemas'> & { activeSchema: SchemaForUI }
) => {
  const { changeSchemas, activeSchema, schemas } = props;
  const i18n = useContext(I18nContext);

  const inputRef = useRef<HTMLInputElement>(null);

  const getHasSameKey = useCallback(() => {
    const schemaKeys = schemas.map((s) => s.key);
    const index = schemaKeys.indexOf(activeSchema.key);
    if (index > -1) {
      schemaKeys.splice(index, 1);
    }

    return schemaKeys.includes(activeSchema.key);
  }, [schemas, activeSchema]);

  const blankKey = !activeSchema.key;
  const hasSameKey = getHasSameKey();

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div>
        <label style={{ marginBottom: 0 }}>{i18n('type')}</label>
        <select
          style={{
            width: '100%',
            border: '1px solid #767676',
            borderRadius: 2,
            color: '#333',
            background: 'none',
          }}
          onChange={(e) =>
            changeSchemas([{ key: 'type', value: e.target.value, schemaId: activeSchema.id }])
          }
          value={activeSchema.type}
        >
          {schemaTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ marginBottom: 0 }}>
          {i18n('fieldName')}
          <u style={{ fontSize: '0.7rem' }}>
            (<ErrorLabel msg={i18n('require')} isError={blankKey} />+
            <ErrorLabel msg={i18n('uniq')} isError={hasSameKey} />)
          </u>
        </label>

        <input
          ref={inputRef}
          onChange={(e) =>
            changeSchemas([{ key: 'key', value: e.target.value, schemaId: activeSchema.id }])
          }
          style={{
            width: '100%',
            border: '1px solid #767676',
            borderRadius: 2,
            color: '#333',
            background: hasSameKey || blankKey ? '#ffa19b' : 'none',
          }}
          value={activeSchema.key}
        />
      </div>
    </div>
  );
};

export default TypeAndKeyEditor;
