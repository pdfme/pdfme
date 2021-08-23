import React, { useState } from 'react';
// import styles from './index.module.scss';
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import { Schema, Lang } from '../../types';
import { readFiles } from '../../utils';
import { i18n } from '../../i18n';
import { inputTypeList } from '../../constants';
import Divider from '../Divider';
const backIcon = require('../../img/back.svg') as string;
const forwardIcon = require('../../img/forward.svg') as string;
const infoIcon = require('../../img/info.svg') as string;
const createIcon = require('../../img/create.svg') as string;
const dragIcon = require('../../img/drag.svg') as string;
const warningIcon = require('../../img/warning.svg') as string;
const deleteIcon = require('../../img/delete.svg') as string;

const isTouchable = () => true;

const DragHandle = SortableHandle(({ disabled }: { disabled: boolean }) => (
  <button
    disabled={disabled}
    className="button is-small is-light"
    style={{ padding: 5, margin: 5, cursor: 'grab' }}
  >
    <img src={dragIcon} width={15} alt="Drag icon" />
  </button>
));

const SortableItem = SortableElement(
  ({
    lang,
    schemas,
    schema,
    focusElementId,
    onEdit,
    onDelete,
    onMouseEnter,
    onMouseLeave,
  }: {
    lang: Lang;
    schemas: Schema[];
    schema: Schema;
    focusElementId: string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onMouseEnter: (id: string) => void;
    onMouseLeave: () => void;
  }) => {
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
        return i18n(lang, 'plsInputName');
      } else if (status === 'is-danger') {
        return i18n(lang, 'fieldMustUniq');
      } else {
        return i18n(lang, 'edit');
      }
    };
    return (
      <div
        key={sc.id}
        // className={styles.flx}
        style={{
          border: focusElementId === sc.id ? '1px solid #d42802' : '1px solid transparent',
        }}
        onMouseEnter={() => onMouseEnter(sc.id)}
        onMouseLeave={() => onMouseLeave()}
      >
        <DragHandle disabled={!touchable} />
        <button
          disabled={!touchable}
          className={`button is-small is-light ${status}`}
          style={{ padding: 5, margin: 5 }}
          onClick={() => onEdit(sc.id)}
          title={getTitle()}
        >
          {/* <span className={`is-size-7 ${styles.keyLabel}`}> */}
          <span className={`is-size-7`}>
            {status === '' ? (
              sc.key
            ) : (
              // <span className={styles.warning}>
              <span>
                <img
                  alt="Warning icon"
                  src={warningIcon}
                  width={15}
                  style={{ marginRight: '0.5rem' }}
                />
                {status === 'is-warning' ? i18n(lang, 'noKeyName') : sc.key}
              </span>
            )}
          </span>
          <img alt="Create icon" src={createIcon} width={15} />
        </button>
        <button
          disabled={!touchable}
          className="button is-small is-light"
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
    lang,
    schemas,
    onEdit,
    onDelete,
    onMouseEnter,
    onMouseLeave,
    focusElementId,
  }: {
    lang: Lang;
    schemas: Schema[];
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onMouseEnter: (id: string) => void;
    onMouseLeave: () => void;
    focusElementId: string;
  }) => (
    <div style={{ maxHeight: 350, overflowY: 'auto' }}>
      {schemas.map((s, i) => (
        <SortableItem
          disabled={!isTouchable()}
          lang={lang}
          focusElementId={focusElementId}
          index={i}
          key={s.id}
          schemas={schemas}
          schema={s}
          onEdit={onEdit}
          onDelete={onDelete}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      ))}
    </div>
  )
);

const Sidebar = ({
  lang,
  pageCursor,
  activeElement,
  activeSchema,
  schemas,
  focusElementId,
  onSortEnd,
  onEdit,
  onEditEnd,
  removeSchema,
  onMouseEnter,
  onMouseLeave,
  changeSchema,
  addSchema,
}: {
  lang: Lang;
  pageCursor: number;
  activeElement: HTMLElement | null;
  activeSchema: Schema;
  schemas: Schema[];
  focusElementId: string;
  onSortEnd: ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => void;
  onEdit: (id: string) => void;
  onEditEnd: () => void;
  removeSchema: (id: string) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
  changeSchema: (obj: Array<{ key: string; value: string; schemaId: string }>) => void;
  addSchema: () => void;
}) => {
  const [open, setOpen] = useState(true);
  const sidebarWidth = 300;
  const top = 25;
  const right = (open ? sidebarWidth : 0) - 1;
  return (
    <div style={{ position: 'sticky', top, zIndex: 29 }}>
      <button
        // className={`button is-small is-light ${styles.tglBtn}`}
        className={`button is-small is-light`}
        style={{ right, top }}
        onClick={() => setOpen(!open)}
      >
        <img src={open ? forwardIcon : backIcon} width={15} alt="Toggle icon" />
      </button>
      <div
        // className={styles.sideBar}
        style={{ width: sidebarWidth, display: open ? 'block' : 'none', top }}
      >
        <aside style={{ display: activeElement ? 'none' : 'block' }}>
          <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
            <h3
              className="is-size-7"
              style={{ textAlign: 'center', width: '100%', fontWeight: 'bold' }}
            >
              {i18n(lang, 'fieldsList')}({pageCursor + 1}P)
            </h3>
          </div>
          <Divider />
          {schemas.length > 0 ? (
            <SortableList
              lang={lang}
              focusElementId={focusElementId}
              // helperClass={styles.sortableHelper}
              useDragHandle={true}
              axis="y"
              lockAxis="y"
              schemas={schemas}
              onSortEnd={onSortEnd}
              onEdit={onEdit}
              onDelete={removeSchema}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
            />
          ) : (
            <p style={{ alignItems: 'center', display: 'flex' }} className="is-size-7">
              <img src={infoIcon} style={{ marginRight: '0.5rem' }} alt="Info icon" />
              {i18n(lang, 'plsAddNewField')}
            </p>
          )}

          <Divider />
        </aside>
        <aside style={{ display: activeElement ? 'block' : 'none' }}>
          {/* <div className={styles.flx}> */}
          <div>
            <button
              className="button is-small is-light"
              style={{ padding: 5, margin: 5 }}
              onClick={onEditEnd}
            >
              <img src={backIcon} width={15} alt="Back icon" />
            </button>
            <h3 className="is-size-7" style={{ fontWeight: 'bold' }}>
              {i18n(lang, 'editField')}({pageCursor + 1}P)
            </h3>
            <button
              className="button is-small is-light"
              style={{ padding: 5, margin: 5 }}
              onClick={() => {
                removeSchema(activeSchema.id);
              }}
            >
              <img src={deleteIcon} width={15} alt="Delete icon" />
            </button>
          </div>
          <Divider />
          <div style={{ display: 'flex' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <label className="label is-small has-text-white" style={{ marginBottom: 0 }}>
                {i18n(lang, 'type')}
              </label>
              <select
                style={{ width: '100%' }}
                className="select is-small"
                onChange={(e) =>
                  changeSchema([
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
              <label className="label is-small has-text-white" style={{ marginBottom: 0 }}>
                {i18n(lang, 'fieldName')}
                <u style={{ fontSize: '0.7rem' }}>({i18n(lang, 'requireAndUniq')})</u>
              </label>
              <input
                className="input is-small"
                onChange={(e) =>
                  changeSchema([
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
              <p className="label is-small has-text-white" style={{ marginBottom: 0 }}>
                {i18n(lang, 'posAndSize')}
              </p>
              {/* <div className={styles.flx}> */}
              <div>
                {/* <div className={styles.inputSet}> */}
                <div>
                  <label style={{ width: 17 }}>X:</label>
                  <input
                    className="input is-small"
                    style={{ width: 70 }}
                    type="number"
                    onChange={(e) =>
                      changeSchema([
                        {
                          key: 'position.x',
                          value: String(+e.target.value),
                          schemaId: activeSchema.id,
                        },
                      ])
                    }
                    value={activeSchema.position.x}
                  />
                  <span className="is-size-7">mm</span>
                </div>
                {/* <div className={styles.inputSet}> */}
                <div>
                  <label style={{ width: 17 }}>Y:</label>
                  <input
                    className="input is-small"
                    style={{ width: 70 }}
                    type="number"
                    onChange={(e) =>
                      changeSchema([
                        {
                          key: 'position.y',
                          value: String(+e.target.value),
                          schemaId: activeSchema.id,
                        },
                      ])
                    }
                    value={activeSchema.position.y}
                  />
                  <span className="is-size-7">mm</span>
                </div>
              </div>
              {/* <div className={styles.flx} style={{ marginTop: '0.25rem' }}> */}
              <div style={{ marginTop: '0.25rem' }}>
                {/* <div className={styles.inputSet}> */}
                <div>
                  <label style={{ width: 17 }}>W:</label>
                  <input
                    className="input is-small"
                    style={{ width: 70 }}
                    type="number"
                    onChange={(e) =>
                      changeSchema([
                        {
                          key: 'width',
                          value: String(+e.target.value),
                          schemaId: activeSchema.id,
                        },
                      ])
                    }
                    value={activeSchema.width}
                  />
                  <span className="is-size-7">mm</span>
                </div>
                {/* <div className={styles.inputSet}> */}
                <div>
                  <label style={{ width: 17 }}>H:</label>
                  <input
                    className="input is-small"
                    style={{ width: 70 }}
                    type="number"
                    onChange={(e) =>
                      changeSchema([
                        {
                          key: 'height',
                          value: String(+e.target.value),
                          schemaId: activeSchema.id,
                        },
                      ])
                    }
                    value={activeSchema.height}
                  />
                  <span className="is-size-7">mm</span>
                </div>
              </div>
            </div>
            <Divider />
            {activeSchema.type === 'text' && (
              <>
                <p className="label is-small has-text-white" style={{ marginBottom: 0 }}>
                  {i18n(lang, 'style')}
                </p>
                <div style={{ display: 'flex', marginBottom: '0.25rem' }}>
                  <div style={{ width: '50%' }}>
                    <div>
                      <label className="is-size-7">Alignment</label>
                      <select
                        style={{ width: '100%' }}
                        className="select is-small"
                        onChange={(e) =>
                          changeSchema([
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
                      <label className="is-size-7">FontSize(pt)</label>
                      <input
                        className="input is-small"
                        onChange={(e) =>
                          changeSchema([
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
                      <label className="is-size-7">FontColor</label>
                      <div style={{ display: 'flex' }}>
                        <input
                          className="input is-small"
                          onChange={(e) =>
                            changeSchema([
                              {
                                key: 'fontColor',
                                value: e.target.value,
                                schemaId: activeSchema.id,
                              },
                            ])
                          }
                          value={activeSchema.fontColor || '#000000'}
                          type="color"
                        />
                        <button
                          className="button is-small"
                          onClick={() =>
                            changeSchema([
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
                      <label className="is-size-7">CharacterSpacing(pt):</label>
                      <input
                        className="input is-small"
                        onChange={(e) =>
                          changeSchema([
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
                      <label className="is-size-7">LineHeight(em)</label>
                      <input
                        className="input is-small"
                        onChange={(e) =>
                          changeSchema([
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
                      <label className="is-size-7">Background</label>
                      <div style={{ display: 'flex' }}>
                        <input
                          className="input is-small"
                          onChange={(e) =>
                            changeSchema([
                              {
                                key: 'backgroundColor',
                                value: e.target.value,
                                schemaId: activeSchema.id,
                              },
                            ])
                          }
                          value={activeSchema.backgroundColor || '#ffffff'}
                          type="color"
                        />
                        <button
                          className="button is-small"
                          onClick={() =>
                            changeSchema([
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
              <label className="label is-small has-text-white" style={{ marginBottom: 0 }}>
                {i18n(lang, 'inputExample')}
              </label>
              {activeSchema.type === 'image' ? (
                <div className="file is-small">
                  {activeSchema.data ? (
                    <div style={{ margin: '0 auto' }}>
                      <button
                        // className={`delete ${styles.dltBtn}`}
                        aria-label="close"
                        onClick={() =>
                          changeSchema([
                            {
                              key: 'data',
                              value: '',
                              schemaId: activeSchema.id,
                            },
                          ])
                        }
                      />
                      <img style={{ maxHeight: 180 }} src={activeSchema.data} alt="Input Example" />
                    </div>
                  ) : (
                    <label className="file-label">
                      <input
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const files = e.target.files;
                          readFiles(files, 'dataURL').then((result) => {
                            changeSchema([
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
                        className="file-input"
                      />
                      <span className="file-cta">
                        <span className="file-label">{i18n(lang, 'plsSelect')}</span>
                      </span>
                    </label>
                  )}
                </div>
              ) : (
                <textarea
                  rows={2}
                  className="textarea is-size-7"
                  onChange={(e) =>
                    changeSchema([
                      {
                        key: 'data',
                        value: e.target.value,
                        schemaId: activeSchema.id,
                      },
                    ])
                  }
                  style={{
                    backgroundColor: activeSchema.data ? '#fff' : '#ffa19b',
                  }}
                  value={activeSchema.data}
                />
              )}
            </div>
          </div>
        </aside>

        {/* <div className={styles.addBtn}> */}
        <div>
          <button className="button is-small is-danger" onClick={addSchema}>
            <strong>{i18n(lang, 'addNewField')}</strong>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
