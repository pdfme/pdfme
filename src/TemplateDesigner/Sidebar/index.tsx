import { useState, useContext } from 'react';
import * as styles from './index.module.scss';
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import { Schema } from '../../libs/type';
import { readFiles } from '../../libs/utils';
import { I18nContext } from '../../libs/i18n';
import { inputTypeList } from '../../libs/constants';
import Divider from '../../components/Divider';
import backIcon from '../../assets/back.svg';
import forwardIcon from '../../assets/forward.svg';
import infoIcon from '../../assets/info.svg';
import createIcon from '../../assets/create.svg';
import dragIcon from '../../assets/drag.svg';
import warningIcon from '../../assets/warning.svg';
import deleteIcon from '../../assets/delete.svg';

const Sidebar = ({
  pageCursor,
  activeElement,
  activeSchema,
  schemas,
  onSortEnd,
  onEdit,
  onEditEnd,
  removeSchema,
  changeSchemas,
  addSchema,
}: {
  pageCursor: number;
  activeElement: HTMLElement | null;
  activeSchema: Schema;
  // TODO ここのschemasの方は他のコンポーネントと違うので他のコンポーネントと合わせたい
  schemas: Schema[];
  onSortEnd: ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => void;
  onEdit: (id: string) => void;
  onEditEnd: () => void;
  removeSchema: (id: string) => void;
  changeSchemas: (objs: { key: string; value: string; schemaId: string }[]) => void;
  addSchema: () => void;
}) => {
  const i18n = useContext(I18nContext);
  const [open, setOpen] = useState(true);
  const sidebarWidth = 300;
  const top = 25;
  const right = open ? sidebarWidth + 18 : 0;
  return (
    <div style={{ position: 'sticky', top, zIndex: 29 }}>
      <button
        className={`${styles.tglBtn}`}
        style={{ right, top, position: 'absolute' }}
        onClick={() => setOpen(!open)}
      >
        <img src={open ? forwardIcon : backIcon} width={15} alt="Toggle icon" />
      </button>
      <div
        className={styles.sideBar}
        style={{ width: sidebarWidth, display: open ? 'block' : 'none', top }}
      >
        <aside style={{ display: activeElement ? 'none' : 'block' }}>
          <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
            <h3 style={{ textAlign: 'center', width: '100%', fontWeight: 'bold' }}>
              {i18n('fieldsList')}({pageCursor + 1}P)
            </h3>
          </div>
          <Divider />
          {schemas.length > 0 ? (
            <SortableList
              helperClass={styles.sortableHelper}
              useDragHandle={true}
              axis="y"
              lockAxis="y"
              schemas={schemas}
              onSortEnd={onSortEnd}
              onEdit={onEdit}
              onDelete={removeSchema}
            />
          ) : (
            <p style={{ alignItems: 'center', display: 'flex' }}>
              <img src={infoIcon} style={{ marginRight: '0.5rem' }} alt="Info icon" />
              {i18n('plsAddNewField')}
            </p>
          )}

          <Divider />
        </aside>
        <aside style={{ display: activeElement ? 'block' : 'none' }}>
          <div className={styles.flx}>
            <button style={{ padding: 5, margin: 5 }} onClick={onEditEnd}>
              <img src={backIcon} width={15} alt="Back icon" />
            </button>
            <h3 style={{ fontWeight: 'bold' }}>
              {i18n('editField')}({pageCursor + 1}P)
            </h3>
            <button
              style={{ padding: 5, margin: 5 }}
              onClick={() => {
                removeSchema(activeSchema.id);
              }}
            >
              <img src={deleteIcon} width={15} alt="Delete icon" />
            </button>
          </div>
          <Divider />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div>
              <label style={{ marginBottom: 0 }}>{i18n('type')}</label>
              <select
                style={{ width: '100%' }}
                onChange={(e) =>
                  changeSchemas([
                    {
                      key: 'type',
                      value: e.target.value,
                      schemaId: activeSchema.id,
                    },
                  ])
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
                  changeSchemas([
                    {
                      key: 'key',
                      value: e.target.value,
                      schemaId: activeSchema.id,
                    },
                  ])
                }
                style={{
                  backgroundColor: activeSchema.key ? '#fff' : '#ffa19b',
                }}
                value={activeSchema.key}
              />
            </div>
          </div>
          <Divider />
          <div>
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
                          value: String(+e.target.value),
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
                          value: String(+e.target.value),
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
                          value: String(+e.target.value),
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
                          value: String(+e.target.value),
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
            <Divider />
            {activeSchema.type === 'text' && (
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
                            {
                              key: 'alignment',
                              value: e.target.value,
                              schemaId: activeSchema.id,
                            },
                          ])
                        }
                        value={activeSchema.alignment}
                      >
                        <option value="left">left</option>
                        <option value="right">right</option>
                        <option value="center">center</option>
                      </select>
                    </div>
                    <div>
                      <label>FontSize(pt)</label>
                      <input
                        onChange={(e) =>
                          changeSchemas([
                            {
                              key: 'fontSize',
                              value: e.target.value,
                              schemaId: activeSchema.id,
                            },
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
                              {
                                key: 'fontColor',
                                value: e.target.value,
                                schemaId: activeSchema.id,
                              },
                            ])
                          }
                          value={activeSchema.fontColor || '#000000'}
                          type="color"
                          style={{ width: '100%' }}
                        />
                        <button
                          onClick={() =>
                            changeSchemas([
                              {
                                key: 'fontColor',
                                value: '',
                                schemaId: activeSchema.id,
                              },
                            ])
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
                            {
                              key: 'characterSpacing',
                              value: e.target.value,
                              schemaId: activeSchema.id,
                            },
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
                            {
                              key: 'lineHeight',
                              value: e.target.value,
                              schemaId: activeSchema.id,
                            },
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
                            changeSchemas([
                              {
                                key: 'backgroundColor',
                                value: '',
                                schemaId: activeSchema.id,
                              },
                            ])
                          }
                        >
                          X
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
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
                          changeSchemas([
                            {
                              key: 'data',
                              value: '',
                              schemaId: activeSchema.id,
                            },
                          ])
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
                          const files = e.target.files;
                          readFiles(files, 'dataURL').then((result) => {
                            changeSchemas([
                              {
                                key: 'data',
                                value: result as string,
                                schemaId: activeSchema.id,
                              },
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
                    changeSchemas([
                      {
                        key: 'data',
                        value: e.target.value,
                        schemaId: activeSchema.id,
                      },
                    ])
                  }
                  style={{
                    width: '100%',
                    backgroundColor: activeSchema.data ? '#fff' : '#ffa19b',
                  }}
                  value={activeSchema.data}
                />
              )}
            </div>
          </div>
        </aside>

        <div className={styles.addBtn}>
          <button style={{ padding: '0.5rem' }} onClick={addSchema}>
            <strong>{i18n('addNewField')}</strong>
          </button>
        </div>
      </div>
    </div>
  );
};

const isTouchable = () => true;

const DragHandle = SortableHandle(({ disabled }: { disabled: boolean }) => (
  <button disabled={disabled} style={{ padding: 5, margin: 5, cursor: 'grab' }}>
    <img src={dragIcon} width={15} alt="Drag icon" />
  </button>
));

const SortableItem = SortableElement(
  ({
    schemas,
    schema,
    onEdit,
    onDelete,
  }: {
    schemas: Schema[];
    schema: Schema;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }) => {
    const i18n = useContext(I18nContext);

    const sc = schema;
    let status: '' | 'is-warning' | 'is-danger' = '';
    if (!sc.key) {
      status = 'is-warning';
    } else if (schemas.find((s) => sc.key && s.key === sc.key && s.id !== sc.id)) {
      status = 'is-danger';
    }

    const touchable = isTouchable();

    const getTitle = () => {
      if (status === 'is-warning') {
        return i18n('plsInputName');
      } else if (status === 'is-danger') {
        return i18n('fieldMustUniq');
      } else {
        return i18n('edit');
      }
    };
    return (
      <div key={sc.id} className={styles.flx}>
        <DragHandle disabled={!touchable} />
        <button
          disabled={!touchable}
          className={`${status}`}
          style={{ padding: 5, margin: 5, width: '100%', display: 'flex', alignItems: 'center' }}
          onClick={() => onEdit(sc.id)}
          title={getTitle()}
        >
          <span className={`${styles.keyLabel}`}>
            {status === '' ? (
              sc.key
            ) : (
              <span className={styles.warning}>
                <img
                  alt="Warning icon"
                  src={warningIcon}
                  width={15}
                  style={{ marginRight: '0.5rem' }}
                />
                {status === 'is-warning' ? i18n('noKeyName') : sc.key}
              </span>
            )}
          </span>
          <img alt="Create icon" src={createIcon} width={15} />
        </button>
        <button
          disabled={!touchable}
          style={{ padding: 5, margin: 5 }}
          onClick={() => onDelete(sc.id)}
        >
          <img alt="Delete icon" src={deleteIcon} width={15} />
        </button>
      </div>
    );
  }
);

const SortableList = SortableContainer(
  ({
    schemas,
    onEdit,
    onDelete,
  }: {
    schemas: Schema[];
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <div style={{ maxHeight: 350, overflowY: 'auto' }}>
      {schemas.map((s, i) => (
        <SortableItem
          disabled={!isTouchable()}
          index={i}
          key={s.id}
          schemas={schemas}
          schema={s}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
);

export default Sidebar;
