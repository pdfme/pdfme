import React, { useContext } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SchemaForUI } from '@pdfme/common';
import { I18nContext } from '../../../../contexts';
import Item from './Item';
import { useMountStatus } from '../../../../hooks';
import { theme } from 'antd';

interface Props {
  isSelected: boolean;
  style?: React.CSSProperties;
  onSelect: (id: string, isShiftSelect: boolean) => void;
  onEdit: (id: string) => void;
  schema: SchemaForUI;
  schemas: SchemaForUI[];
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}
const SelectableSortableItem = ({
  isSelected,
  style,
  onSelect,
  onEdit,
  schema,
  schemas,
  onMouseEnter,
  onMouseLeave,
}: Props) => {
  const { token } = theme.useToken();

  const i18n = useContext(I18nContext);
  const { setNodeRef, listeners, isDragging, isSorting, transform, transition } = useSortable({
    id: schema.id,
  });
  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;

  const newListeners = {
    ...listeners,
    onClick: (event: any) => onSelect(schema.id, event.shiftKey),
  };

  let status: undefined | 'is-warning' | 'is-danger';
  if (!schema.key) {
    status = 'is-warning';
  } else if (schemas.find((s) => schema.key && s.key === schema.key && s.id !== schema.id)) {
    status = 'is-danger';
  }

  let title = i18n('edit');
  if (status === 'is-warning') {
    title = i18n('plsInputName');
  } else if (status === 'is-danger') {
    title = i18n('fieldMustUniq');
  }

  const selectedStyle = isSelected
    ? { background: token.colorPrimary, opacity: isSorting || isDragging ? 0.5 : 1 }
    : ({} as React.CSSProperties);

  return (
    <Item
      ref={setNodeRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={() => onEdit(schema.id)}
      value={schema.key}
      status={status}
      title={title}
      style={{ ...selectedStyle, ...style }}
      dragging={isDragging}
      sorting={isSorting}
      transition={transition}
      transform={transform}
      fadeIn={mountedWhileDragging}
      listeners={newListeners}
    />
  );
};

export default SelectableSortableItem;
