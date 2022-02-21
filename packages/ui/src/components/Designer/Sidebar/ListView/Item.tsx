import React, { useEffect, useContext } from 'react';
import { DraggableSyntheticListeners } from '@dnd-kit/core';
import { I18nContext } from '../../../../contexts';
import dragIcon from '../../../../assets/icons/drag.svg';
import warningIcon from '../../../../assets/icons/warning.svg';

interface Props {
  value: React.ReactNode;
  style?: React.CSSProperties;
  status?: 'is-warning' | 'is-danger';
  title?: string;
  dragOverlay?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  dragging?: boolean;
  sorting?: boolean;
  transition?: string;
  transform?: { x: number; y: number; scaleX: number; scaleY: number } | null;
  fadeIn?: boolean;
  listeners?: DraggableSyntheticListeners;
}
const Item = React.memo(
  React.forwardRef<HTMLLIElement, Props>(
    (
      {
        value,
        status,
        title,
        style,
        dragOverlay,
        onClick,
        onMouseEnter,
        onMouseLeave,
        dragging,
        fadeIn,
        listeners,
        sorting,
        transition,
        transform,
        ...props
      },
      ref
    ) => {
      const i18n = useContext(I18nContext);

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
          }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          ref={ref}
        >
          <div style={{ display: 'flex', alignItems: 'center', ...style }} {...props}>
            <button
              {...listeners}
              style={{ padding: '0.5rem', background: 'none', border: 'none', display: 'flex' }}
            >
              <img style={{ cursor: 'grab' }} src={dragIcon} width={15} alt="Drag icon" />
            </button>
            <div
              style={{
                width: '100%',
                padding: '0.5rem',
                paddingLeft: 0,
                cursor: 'pointer',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
              title={title || ''}
              onClick={() => onClick && onClick()}
            >
              {status === undefined ? (
                value
              ) : (
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <img
                    alt="Warning icon"
                    src={warningIcon}
                    width={15}
                    style={{ marginRight: '0.5rem' }}
                  />
                  {status === 'is-warning' ? i18n('noKeyName') : value}
                  {status === 'is-danger' ? i18n('notUniq') : ''}
                </span>
              )}
            </div>
          </div>
        </li>
      );
    }
  )
);

export default Item;
