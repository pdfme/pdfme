import React, { useContext } from 'react';
import * as styles from './index.module.scss';
import { readFiles } from '../../../libs/ui';
import { I18nContext } from '../../../libs/i18n';
import { inputTypeList } from '../../../libs/constants';
import Divider from '../../Divider';
import backIcon from '../../../assets/back.svg';
import deleteIcon from '../../../assets/delete.svg';
import { SidebarProps } from '.';

const TextPropEditor = (props: Pick<SidebarProps, 'changeSchemas' | 'activeSchema'>) => {
  const { changeSchemas, activeSchema } = props;
  const alignments = ['left', 'center', 'right'];
  const i18n = useContext(I18nContext);

  if (activeSchema.type !== 'text') return <></>;

  return (
    <>
      <p style={{ marginBottom: 0 }}>{i18n('style')}</p>
      <div className={styles.flx} style={{ marginBottom: '0.25rem' }}>
        <div style={{ width: '50%' }}>
          <div>
            <label>Alignment</label>
            <select
              style={{ width: '100%' }}
              onChange={(e) =>
                changeSchemas([
                  { key: 'alignment', value: e.target.value, schemaId: activeSchema.id },
                ])
              }
              value={activeSchema.alignment}
            >
              {alignments.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>FontSize(pt)</label>
            <input
              onChange={(e) =>
                changeSchemas([
                  { key: 'fontSize', value: e.target.value, schemaId: activeSchema.id },
                ])
              }
              value={activeSchema.fontSize}
              type="number"
            />
          </div>
          <div>
            <label>FontColor</label>
            <div style={{ display: 'flex' }}>
              <input
                onChange={(e) =>
                  changeSchemas([
                    { key: 'fontColor', value: e.target.value, schemaId: activeSchema.id },
                  ])
                }
                value={activeSchema.fontColor || '#000000'}
                type="color"
                style={{ width: '100%' }}
              />
              <button
                onClick={() =>
                  changeSchemas([{ key: 'fontColor', value: '', schemaId: activeSchema.id }])
                }
              >
                X
              </button>
            </div>
          </div>
        </div>
        <div style={{ width: '50%' }}>
          <div>
            <label>CharacterSpacing(pt):</label>
            <input
              onChange={(e) =>
                changeSchemas([
                  { key: 'characterSpacing', value: e.target.value, schemaId: activeSchema.id },
                ])
              }
              value={activeSchema.characterSpacing}
              type="number"
            />
          </div>
          <div>
            <label>LineHeight(em)</label>
            <input
              onChange={(e) =>
                changeSchemas([
                  { key: 'lineHeight', value: e.target.value, schemaId: activeSchema.id },
                ])
              }
              value={activeSchema.lineHeight}
              type="number"
            />
          </div>
          <div>
            <label>Background</label>
            <div style={{ display: 'flex' }}>
              <input
                onChange={(e) =>
                  changeSchemas([
                    {
                      key: 'backgroundColor',
                      value: e.target.value,
                      schemaId: activeSchema.id,
                    },
                  ])
                }
                value={activeSchema.backgroundColor || '#ffffff'}
                type="color"
                style={{ width: '100%' }}
              />
              <button
                onClick={() =>
                  changeSchemas([{ key: 'backgroundColor', value: '', schemaId: activeSchema.id }])
                }
              >
                X
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const ExampleInputEditor = (props: Pick<SidebarProps, 'changeSchemas' | 'activeSchema'>) => {
  const { changeSchemas, activeSchema } = props;
  const i18n = useContext(I18nContext);

  return (
    <div>
      <label style={{ marginBottom: 0 }}>{i18n('inputExample')}</label>
      {activeSchema.type === 'image' ? (
        <div style={{ position: 'relative' }}>
          {activeSchema.data ? (
            <div style={{ margin: '0 auto' }}>
              <button
                className={`${styles.dltBtn}`}
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

const PositionAndSizeEditor = (props: Pick<SidebarProps, 'changeSchemas' | 'activeSchema'>) => {
  const { changeSchemas, activeSchema } = props;
  const i18n = useContext(I18nContext);

  return (
    <div>
      <p style={{ marginBottom: 0 }}>{i18n('posAndSize')}</p>
      <div className={styles.flx}>
        <div className={styles.inputSet}>
          <label style={{ width: 17 }}>X:</label>
          <input
            style={{ width: 70 }}
            type="number"
            onChange={(e) =>
              changeSchemas([
                {
                  key: 'position.x',
                  value: String(Number(e.target.value)),
                  schemaId: activeSchema.id,
                },
              ])
            }
            value={activeSchema.position.x}
          />
          <span>mm</span>
        </div>
        <div className={styles.inputSet}>
          <label style={{ width: 17 }}>Y:</label>
          <input
            style={{ width: 70 }}
            type="number"
            onChange={(e) =>
              changeSchemas([
                {
                  key: 'position.y',
                  value: String(Number(e.target.value)),
                  schemaId: activeSchema.id,
                },
              ])
            }
            value={activeSchema.position.y}
          />
          <span>mm</span>
        </div>
      </div>
      <div className={styles.flx} style={{ marginTop: '0.25rem' }}>
        <div className={styles.inputSet}>
          <label style={{ width: 17 }}>W:</label>
          <input
            style={{ width: 70 }}
            type="number"
            onChange={(e) =>
              changeSchemas([
                {
                  key: 'width',
                  value: String(Number(e.target.value)),
                  schemaId: activeSchema.id,
                },
              ])
            }
            value={activeSchema.width}
          />
          <span>mm</span>
        </div>
        <div className={styles.inputSet}>
          <label style={{ width: 17 }}>H:</label>
          <input
            style={{ width: 70 }}
            type="number"
            onChange={(e) =>
              changeSchemas([
                {
                  key: 'height',
                  value: String(Number(e.target.value)),
                  schemaId: activeSchema.id,
                },
              ])
            }
            value={activeSchema.height}
          />
          <span>mm</span>
        </div>
      </div>
    </div>
  );
};

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

const DetailView = (
  props: Pick<
    SidebarProps,
    'changeSchemas' | 'activeSchema' | 'pageCursor' | 'onEditEnd' | 'removeSchema'
  >
) => {
  const { activeSchema, pageCursor, onEditEnd, removeSchema } = props;
  const i18n = useContext(I18nContext);

  return (
    <aside>
      <div className={styles.flx}>
        <button style={{ padding: 5, margin: 5 }} onClick={onEditEnd}>
          <img src={backIcon} width={15} alt="Back icon" />
        </button>
        <h3 style={{ fontWeight: 'bold' }}>
          {i18n('editField')}({pageCursor + 1}P)
        </h3>
        <button style={{ padding: 5, margin: 5 }} onClick={() => removeSchema(activeSchema.id)}>
          <img src={deleteIcon} width={15} alt="Delete icon" />
        </button>
      </div>
      <Divider />
      <TypeAndKeyEditor {...props} />
      <Divider />
      <PositionAndSizeEditor {...props} />
      <Divider />
      {activeSchema.type === 'text' && <TextPropEditor {...props} />}
      <ExampleInputEditor {...props} />
    </aside>
  );
};

export default DetailView;
