import React, { useContext } from 'react';
import { SchemaForUI } from '@pdfme/common';
import { readFiles } from '../../../../helper';
import { I18nContext } from '../../../../contexts';
import { SidebarProps } from '..';
import { XMarkIcon } from '@heroicons/react/24/outline';

const ExampleInputEditor = (
  props: Pick<SidebarProps, 'changeSchemas'> & { activeSchema: SchemaForUI }
) => {
  const { changeSchemas, activeSchema } = props;
  const i18n = useContext(I18nContext);

  return (
    <div>
      <label>{i18n('inputExample')}</label>
      {activeSchema.type === 'image' ? (
        <div style={{ position: 'relative' }}>
          {activeSchema.data ? (
            <div style={{ margin: '0 auto' }}>
              <button
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#333',
                  background: '#f2f2f2',
                  cursor: 'pointer',
                  borderRadius: 2,
                  border: '1px solid #767676',
                  height: 24,
                  width: 24,
                }}
                aria-label="close"
                onClick={() =>
                  changeSchemas([{ key: 'data', value: '', schemaId: activeSchema.id }])
                }
              >
                <XMarkIcon width={10} height={10} />
              </button>
              <img style={{ maxHeight: 180 }} src={activeSchema.data} alt="Input Example" />
            </div>
          ) : (
            <label>
              <input
                style={{ color: '#333', background: 'none' }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const { files } = e.target;
                  readFiles(files, 'dataURL').then((result) => {
                    changeSchemas([
                      { key: 'data', value: result as string, schemaId: activeSchema.id },
                    ]);
                  });
                }}
                type="file"
                accept="image/jpeg, image/png"
              />
            </label>
          )}
        </div>
      ) : (
        <textarea
          rows={6}
          onChange={(e) =>
            changeSchemas([{ key: 'data', value: e.target.value, schemaId: activeSchema.id }])
          }
          style={{
            width: '100%',
            border: '1px solid #767676',
            borderRadius: 2,
            color: '#333',
            background: activeSchema.data ? 'none' : '#ffa19b',
          }}
          value={activeSchema.data}
        />
      )}
    </div>
  );
};

export default ExampleInputEditor;
