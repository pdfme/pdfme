import React, { useContext } from 'react';
import * as styles from './index.module.scss';
import {
  SortableContainer as sortableContainer,
  SortableElement as sortableElement,
  SortableHandle as sortableHandle,
} from 'react-sortable-hoc';
import { SchemaForUI } from '../../../libs/type';
import { I18nContext } from '../../../libs/contexts';
import Divider from '../../Divider';
import infoIcon from '../../../assets/icons/info.svg';
import dragIcon from '../../../assets/icons/drag.svg';
import warningIcon from '../../../assets/icons/warning.svg';
import { SidebarProps } from '.';

const isTouchable = () => true;

const DragHandle = sortableHandle(() => (
  <button style={{ padding: 0, background: 'none', border: 'none' }}>
    <img style={{ padding: 5, cursor: 'grab' }} src={dragIcon} width={15} alt="Drag icon" />
  </button>
));

const SortableItem = sortableElement(
  (props: { schemas: SchemaForUI[]; schema: SchemaForUI; onEdit: (id: string) => void }) => {
    const { schemas, schema, onEdit } = props;
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
          style={{
            padding: 5,
            margin: 5,
            width: '100%',
            display: 'flex',
            background: 'none',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
          }}
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
        </button>
      </div>
    );
  }
);

const SortableList = sortableContainer(
  ({ schemas, onEdit }: { schemas: SchemaForUI[]; onEdit: (id: string) => void }) => {
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

const ListView = (props: Pick<SidebarProps, 'schemas' | 'onSortEnd' | 'onEdit'>) => {
  const { schemas, onSortEnd, onEdit } = props;
  const i18n = useContext(I18nContext);

  return (
    <aside>
      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
        <p style={{ textAlign: 'center', width: '100%', fontWeight: 'bold' }}>
          {i18n('fieldsList')}
        </p>
      </div>
      <Divider />
      <SortableList
        helperClass={styles.sortableHelper}
        useDragHandle
        axis="y"
        lockAxis="y"
        schemas={schemas}
        onSortEnd={onSortEnd}
        onEdit={onEdit}
      />
      <Divider />
    </aside>
  );
};

export default ListView;
