import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensors,
  useSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SchemaForUI } from '@pdfme/common';
import type { SidebarProps } from '../../../../types';
import Item from './Item';
import SelectableSortableItem from './SelectableSortableItem';
import { theme } from 'antd';

const SelectableSortableContainer = (
  props: Pick<
    SidebarProps,
    'schemas' | 'onEdit' | 'onSortEnd' | 'hoveringSchemaId' | 'onChangeHoveringSchemaId'
  >
) => {
  const { token } = theme.useToken();

  const { schemas, onEdit, onSortEnd, hoveringSchemaId, onChangeHoveringSchemaId } = props;
  const [selectedSchemas, setSelectedSchemas] = useState<SchemaForUI[]>([]);
  const [dragOverlaydItems, setClonedItems] = useState<SchemaForUI[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 15 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isItemSelected = (itemId: string): boolean =>
    selectedSchemas.map((i) => i.id).includes(itemId);

  const onSelectionChanged = (id: string, isShiftSelect: boolean) => {
    if (isShiftSelect) {
      if (isItemSelected(id)) {
        const newSelectedSchemas = selectedSchemas.filter((item) => item.id !== id);
        setSelectedSchemas(newSelectedSchemas);
      } else {
        const newSelectedItem = schemas.find((schema) => schema.id === id)!;
        const newSelectedSchemas = selectedSchemas.concat(newSelectedItem);
        setSelectedSchemas(newSelectedSchemas);
      }
    } else {
      setSelectedSchemas([]);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => {
        setActiveId(String(active.id));
        setClonedItems(schemas);

        if (!isItemSelected(String(active.id))) {
          const newSelectedSchemas: SchemaForUI[] = [];
          setSelectedSchemas(newSelectedSchemas);
        } else if (selectedSchemas.length > 0) {
          onSortEnd(
            selectedSchemas.reduce((ret, selectedItem) => {
              if (selectedItem.id === String(active.id)) {
                return ret;
              }
              return ret.filter((schema) => schema !== selectedItem);
            }, schemas)
          );
        }
      }}
      onDragEnd={({ active, over }) => {
        const overId = over?.id || '';

        const activeIndex = schemas.map((i) => i.id).indexOf(String(active.id));
        const overIndex = schemas.map((i) => i.id).indexOf(String(overId));

        if (selectedSchemas.length) {
          let newSchemas = [...schemas];
          newSchemas = arrayMove(newSchemas, activeIndex, overIndex);
          newSchemas.splice(
            overIndex + 1,
            0,
            ...selectedSchemas.filter((item) => item.id !== activeId)
          );
          onSortEnd(newSchemas);
          setSelectedSchemas([]);
        } else if (activeIndex !== overIndex) {
          onSortEnd(arrayMove(schemas, activeIndex, overIndex));
        }

        setActiveId(null);
      }}
      onDragCancel={() => {
        if (dragOverlaydItems) {
          onSortEnd(dragOverlaydItems);
        }

        setActiveId(null);
        setClonedItems(null);
      }}
    >
      <>
        <div style={{ height: '100%', overflowY: 'auto' }}>
          <SortableContext items={schemas} strategy={verticalListSortingStrategy}>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', borderRadius: 5 }}>
              {schemas.map((schema) => (
                <SelectableSortableItem
                  key={schema.id}
                  style={{
                    border: `1px solid ${
                      schema.id === hoveringSchemaId ? token.colorPrimary : 'transparent'
                    }`,
                  }}
                  schema={schema}
                  schemas={schemas}
                  isSelected={isItemSelected(schema.id) || activeId === schema.id}
                  onEdit={onEdit}
                  onSelect={onSelectionChanged}
                  onMouseEnter={() => onChangeHoveringSchemaId(schema.id)}
                  onMouseLeave={() => onChangeHoveringSchemaId(null)}
                />
              ))}
            </ul>
          </SortableContext>
        </div>
        {createPortal(
          <DragOverlay adjustScale>
            {activeId ? (
              <>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  <Item
                    value={schemas.find((schema) => schema.id === activeId)!.key}
                    style={{ background: token.colorPrimary }}
                    dragOverlay
                  />
                </ul>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {selectedSchemas
                    .filter((item) => item.id !== activeId)
                    .map((item) => (
                      <Item
                        key={item.id}
                        value={item.key}
                        style={{ background: token.colorPrimary }}
                        dragOverlay
                      />
                    ))}
                </ul>
              </>
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </>
    </DndContext>
  );
};

export default SelectableSortableContainer;
