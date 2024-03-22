import React, { useEffect, useContext } from 'react';
import { DraggableSyntheticListeners } from '@dnd-kit/core';
import { I18nContext } from '../../../../contexts';
import { HolderOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';

const { Text } = Typography;

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
              icon={<HolderOutlined style={{ cursor: 'grab' }} />}
            />
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
                  <ExclamationCircleOutlined width={15} style={{ marginRight: '0.5rem' }} />
                  {status === 'is-warning' ? i18n('noKeyName') : value}
                  {status === 'is-danger' ? i18n('notUniq') : ''}
                </span>
              )}
            </Text>
          </div>
        </li>
      );
    }
  )
);

export default Item;
