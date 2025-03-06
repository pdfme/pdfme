import React, { useEffect, useContext } from 'react';
import { DraggableSyntheticListeners } from '@dnd-kit/core';
import { I18nContext } from '../../../../contexts.js';
import { GripVertical, CircleAlert, Lock } from 'lucide-react';
import { Button, Typography } from 'antd';

const { Text } = Typography;

// Define prop types for Item component
interface Props {
  /** Content to display in the item */
  value: React.ReactNode;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Custom styles for the item */
  style?: React.CSSProperties;
  /** Status indicator for the item */
  status?: 'is-warning' | 'is-danger';
  /** Title attribute for the item */
  title?: string;
  /** Whether the item is required */
  required?: boolean;
  /** Whether the item is read-only */
  readOnly?: boolean;
  /** Whether the item is being dragged as an overlay */
  dragOverlay?: boolean;
  /** Click handler for the item */
  onClick?: () => void;
  /** Mouse enter handler */
  onMouseEnter?: () => void;
  /** Mouse leave handler */
  onMouseLeave?: () => void;
  /** Whether the item is currently being dragged */
  dragging?: boolean;
  /** Whether items are being sorted */
  sorting?: boolean;
  /** CSS transition value */
  transition?: string;
  /** Transform data for the item */
  transform?: { x: number; y: number; scaleX: number; scaleY: number } | null;
  /** Whether to fade the item in */
  fadeIn?: boolean;
  /** Drag listeners from dnd-kit */
  listeners?: DraggableSyntheticListeners;
}
// Using React.memo and forwardRef for optimized rendering
// Using TypeScript interface for prop validation instead of PropTypes
const Item = React.memo(
  /* eslint-disable react/prop-types */
  React.forwardRef<HTMLLIElement, Props>(function Item(
    {
      icon,
      value,
      status,
      title,
      required,
      readOnly,
      style,
      dragOverlay,
      onClick,
      onMouseEnter,
      onMouseLeave,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      dragging,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      fadeIn,
      listeners,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      sorting,
      transition,
      transform,
      ...props
    },
    ref,
  ) {
    /* eslint-enable react/prop-types */
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
          marginTop: 10,
          transition,
          transform: `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})`,
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        ref={ref}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            gap: '0.5rem',
            ...style,
          }}
          {...props}
          onClick={() => onClick && onClick()}
        >
          <Button
            {...listeners}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'none',
              boxShadow: 'none',
              border: 'none',
              paddingLeft: '0.25rem',
            }}
            icon={<GripVertical size={15} style={{ cursor: 'grab' }} />}
          />
          {icon}
          <Text
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              width: '100%',
            }}
            title={title || ''}
          >
            {status === undefined ? (
              value
            ) : (
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <CircleAlert size={15} style={{ marginRight: '0.25rem' }} />
                {status === 'is-warning' ? i18n('noKeyName') : value}
                {status === 'is-danger' ? i18n('notUniq') : ''}
              </span>
            )}
          </Text>
          {readOnly && <Lock size={15} style={{ marginRight: '0.5rem' }} />}
          {required && <span style={{ color: 'red', marginRight: '0.5rem' }}>*</span>}
        </div>
      </li>
    );
  }),
);

// Set display name for debugging
Item.displayName = 'Item';

export default Item;
