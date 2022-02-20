import React, { useContext } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SchemaForUI } from '@pdfme/common';
import { I18nContext } from '../../../../contexts';
import Item from './Item';
import { useMountStatus } from '../../../../hooks';

interface Props {
  isSelected: boolean;
  onSelect: (id: string, isShiftSelect: boolean) => void;
  onEdit: (id: string) => void;
  schema: SchemaForUI;
  schemas: SchemaForUI[];
}
const SelectableSortableItem = ({ isSelected, onSelect, onEdit, schema, schemas }: Props) => {
  const i18n = useContext(I18nContext);
  const { setNodeRef, listeners, isDragging, isSorting, over, overIndex, transform, transition } =
    useSortable({ id: schema.id });
  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;

  const newlisteners = {
    ...listeners,
    onClick: (event: any) => {
      onSelect(schema.id, event.shiftKey);
    },
  };

  const sc = schema;
  let status: '' | 'is-warning' | 'is-danger' = '';
  if (!sc.key) {
    status = 'is-warning';
  } else if (schemas.find((s) => sc.key && s.key === sc.key && s.id !== sc.id)) {
    status = 'is-danger';
  }

  const getTitle = () => {
    if (status === 'is-warning') {
      return i18n('plsInputName');
    }
    if (status === 'is-danger') {
      return i18n('fieldMustUniq');
    }

    return i18n('edit');
  };

  const style = isSelected
    ? ({
        color: '#fff',
        background: '#18a0fb',
        opacity: isSorting ? 0.5 : 1,
      } as React.CSSProperties)
    : {};

  return (
    // TODO
    //   <button
    //   disabled={!touchable}
    //   className={`${status}`}
    //   style={{
    //     padding: 5,
    //     margin: 5,
    //     width: '100%',
    //     display: 'flex',
    //     background: 'none',
    //     border: 'none',
    //     textAlign: 'left',
    //     cursor: 'pointer',
    //     fontSize: '0.75rem',
    //   }}
    //   onClick={() => onEdit(sc.id)}
    //   title={getTitle()}
    // >
    //   <span
    //     style={{
    //       marginRight: '1rem',
    //       width: 180,
    //       color: '#333',
    //       overflow: 'hidden',
    //       whiteSpace: 'nowrap',
    //       textOverflow: 'ellipsis',
    //     }}
    //   >
    //     {status === '' ? (
    //       sc.key
    //     ) : (
    //       <span style={{ display: 'flex', alignItems: 'center' }}>
    //         <img
    //           alt="Warning icon"
    //           src={warningIcon}
    //           width={15}
    //           style={{ marginRight: '0.5rem' }}
    //         />
    //         {status === 'is-warning' ? i18n('noKeyName') : sc.key}
    //         {status === 'is-danger' ? i18n('notUniq') : ''}
    //       </span>
    //     )}
    //   </span>
    // </button>

    <Item
      ref={setNodeRef}
      onClick={() => onEdit(sc.id)}
      value={schema.key}
      dragging={isDragging}
      sorting={isSorting}
      style={style}
      transition={transition}
      transform={transform}
      fadeIn={mountedWhileDragging}
      listeners={newlisteners}
    />
  );
};

export default SelectableSortableItem;
