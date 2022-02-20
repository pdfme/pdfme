import React, { useEffect } from 'react';
import { DraggableSyntheticListeners } from '@dnd-kit/core';
import dragIcon from '../../../../assets/icons/drag.svg';

// TODO 不要なpropsがないかチェックする必要がある
interface ItemProps {
  onClick?: () => void;
  dragOverlay?: boolean;
  color?: string;
  disabled?: boolean;
  dragging?: boolean;
  height?: number;
  fadeIn?: boolean;
  transform?: { x: number; y: number; scaleX: number; scaleY: number } | null;
  listeners?: DraggableSyntheticListeners;
  sorting?: boolean;
  style?: React.CSSProperties;
  transition?: string;
  value: React.ReactNode;
}
const Item = React.memo(
  React.forwardRef<HTMLLIElement, ItemProps>(
    (
      {
        onClick,
        color,
        dragOverlay,
        dragging,
        disabled,
        fadeIn,
        height,
        listeners,
        sorting,
        style,
        transition,
        transform,
        value,
        ...props
      },
      ref
    ) => {
      useEffect(() => {
        if (!dragOverlay) {
          return;
        }

        document.body.style.cursor = 'grabbing';

        return () => {
          document.body.style.cursor = '';
        };
      }, [dragOverlay]);

      const { x, y, scaleX, scaleY } = transform || { x: 0, y: 0, scaleX: 1, scaleY: 1 };

      return (
        <li
          style={{
            transition,
            transform: `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})`,
            color: color,
          }}
          ref={ref}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              transform: `translate3d(${x}, ${y}, 0) scaleX(${scaleX * 1.01}) scaleY(${
                scaleY * 1.01
              })`,
              ...style,
            }}
            {...props}
          >
            <button
              {...listeners}
              style={{
                padding: '0.5rem',
                background: 'none',
                border: 'none',
                display: 'flex',
              }}
            >
              <img style={{ cursor: 'grab' }} src={dragIcon} width={15} alt="Drag icon" />
            </button>
            <div
              style={{ width: '100%', padding: '0.5rem', paddingLeft: 0, cursor: 'pointer' }}
              onClick={() => {
                onClick && onClick();
              }}
            >
              {value}
            </div>
          </div>
        </li>
      );
    }
  )
);

export default Item;
