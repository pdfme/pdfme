import React, { useContext } from 'react';
import { readFiles } from '../../../../helper';
import { I18nContext } from '../../../../contexts';
import { SidebarProps } from '..';

const ExampleInputEditor = (props: Pick<SidebarProps, 'changeSchemas' | 'activeSchema'>) => {
  const { changeSchemas, activeSchema } = props;
  const i18n = useContext(I18nContext);

  return (
    <div>
      <label style={{ marginBottom: 0 }}>{i18n('inputExample')}</label>
      {activeSchema.type === 'image' ? (
        <div style={{ position: 'relative', textAlign: 'center' }}>
          {activeSchema.data ? (
            <div style={{ margin: '0 auto' }}>
              <button
                style={{ position: 'absolute', top: 0, left: 0 }}
                aria-label="close"
                onClick={() =>
                  changeSchemas([{ key: 'data', value: '', schemaId: activeSchema.id }])
                }
              >
                x
              </button>
              <img style={{ maxHeight: 180 }} src={activeSchema.data} alt="Input Example" />
            </div>
          ) : (
            <label>
              <input
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
            backgroundColor: activeSchema.data ? '#fff' : '#ffa19b',
          }}
          value={activeSchema.data}
        />
      )}
    </div>
  );
};

export default ExampleInputEditor;
