import React, { useEffect, useState } from 'react';
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
import Item from './Item';
import SelectableSortableItem from './SelectableSortableItem';

interface Props {
  schemas: SchemaForUI[];
  onEdit: (id: string) => void;
  onSortEnd: ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => void;
  height: number;
  hoveringSchemaId: string | null;
  onChangeHoveringSchemaId: (id: string | null) => void;
}

const SelectableSortableContainer = ({
  schemas: initialSchemas,
  // TODO 下記のpropsを使う実装
  onEdit,
  onSortEnd,
  height,
  hoveringSchemaId,
  onChangeHoveringSchemaId,
}: Props) => {
  // TODO schemasは親のコンポーネントで管理したい
  const [schemas, setSchemas] = useState<SchemaForUI[]>(initialSchemas);
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
        setActiveId(active.id);
        setClonedItems(schemas);

        if (!isItemSelected(active.id)) {
          const newSelectedSchemas: SchemaForUI[] = [];
          setSelectedSchemas(newSelectedSchemas);
        } else if (selectedSchemas.length > 0) {
          setSchemas((schemas) =>
            selectedSchemas.reduce((ret, selectedItem) => {
              if (selectedItem.id === active.id) {
                return ret;
              }
              return ret.filter((schema) => schema !== selectedItem);
            }, schemas)
          );
        }
      }}
      onDragEnd={({ active, over }) => {
        const overId = over?.id || '';

        const activeIndex = schemas.map((i) => i.id).indexOf(active.id);
        const overIndex = schemas.map((i) => i.id).indexOf(overId);

        if (selectedSchemas.length) {
          setSchemas((schemas) => {
            let newSchemas = [...schemas];
            newSchemas = arrayMove(newSchemas, activeIndex, overIndex);
            newSchemas.splice(
              overIndex + 1,
              0,
              ...selectedSchemas.filter((item) => item.id !== activeId)
            );
            return newSchemas;
          });
          setSelectedSchemas([]);
        } else if (activeIndex !== overIndex) {
          setSchemas((schemas) => arrayMove(schemas, activeIndex, overIndex));
        }

        setActiveId(null);
      }}
      onDragCancel={() => {
        if (dragOverlaydItems) {
          setSchemas(dragOverlaydItems);
        }

        setActiveId(null);
        setClonedItems(null);
      }}
    >
      <div style={{ height, overflowY: 'auto' }}>
        <SortableContext items={schemas} strategy={verticalListSortingStrategy}>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              borderRadius: 5,
            }}
          >
            {schemas.map((schema) => (
              <div
                key={schema.id}
                style={{
                  border: `1px solid ${schema.id === hoveringSchemaId ? '#18a0fb' : 'transparent'}`,
                }}
                onMouseEnter={() => onChangeHoveringSchemaId(schema.id)}
                onMouseLeave={() => onChangeHoveringSchemaId(null)}
              >
                <SelectableSortableItem
                  key={schema.id}
                  schema={schema}
                  schemas={schemas}
                  isSelected={isItemSelected(schema.id)}
                  onEdit={onEdit}
                  onSelect={onSelectionChanged}
                />
              </div>
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
                  style={{ color: '#fff', background: '#18a0fb' }}
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
                      style={{ color: '#fff', background: '#18a0fb' }}
                      dragOverlay
                    />
                  ))}
              </ul>
            </>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
};

export default SelectableSortableContainer;
