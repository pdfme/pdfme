import React, { useContext } from 'react';
import * as styles from './index.module.scss';
import {
  SortableContainer as sortableContainer,
  SortableElement as sortableElement,
  SortableHandle as sortableHandle,
} from 'react-sortable-hoc';
import { Schema } from '../../libs/type';
import { I18nContext } from '../../libs/i18n';
import Divider from '../../components/Divider';
import infoIcon from '../../assets/info.svg';
import createIcon from '../../assets/create.svg';
import dragIcon from '../../assets/drag.svg';
import warningIcon from '../../assets/warning.svg';
import deleteIcon from '../../assets/delete.svg';
import { SidebarProps } from './';

const isTouchable = () => true;

const DragHandle = sortableHandle(() => (
  <button style={{ padding: 5, margin: 5, cursor: 'grab' }}>
    <img src={dragIcon} width={15} alt="Drag icon" />
  </button>
));

const SortableItem = sortableElement(
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
      }
      if (status === 'is-danger') {
        return i18n('fieldMustUniq');
      }

      return i18n('edit');
    };

    return (
      <div key={sc.id} className={styles.flx}>
        <DragHandle />
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

const SortableList = sortableContainer(
  ({
    schemas,
    onEdit,
    onDelete,
  }: {
    schemas: Schema[];
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }) => {
    const i18n = useContext(I18nContext);

    return (
      <div style={{ maxHeight: 350, overflowY: 'auto' }}>
        {schemas.length > 0 ? (
          schemas.map((s, i) => (
            <SortableItem
              disabled={!isTouchable()}
              index={i}
              key={s.id}
              schemas={schemas}
              schema={s}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        ) : (
          <p style={{ alignItems: 'center', display: 'flex' }}>
            <img src={infoIcon} style={{ marginRight: '0.5rem' }} alt="Info icon" />
            {i18n('plsAddNewField')}
          </p>
        )}
      </div>
    );
  }
);

const ListView = (
  props: Pick<SidebarProps, 'pageCursor' | 'schemas' | 'onSortEnd' | 'onEdit' | 'removeSchema'>
) => {
  const { pageCursor, schemas, onSortEnd, onEdit, removeSchema } = props;
  const i18n = useContext(I18nContext);

  return (
    <aside>
      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
        <h3 style={{ textAlign: 'center', width: '100%', fontWeight: 'bold' }}>
          {i18n('fieldsList')}({pageCursor + 1}P)
        </h3>
      </div>
      <Divider />
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
      <Divider />
    </aside>
  );
};

export default ListView;
