import React, { useContext } from 'react';
import { Size } from '@pdfme/common';
// Import icons from lucide-react
// Note: In tests, these are replaced via the Vitest lucide-react mock.
import {
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  MoveHorizontal,
  MoveVertical,
} from 'lucide-react';

import type { MenuProps } from 'antd';
import { theme, Typography, Button, Dropdown, Tooltip } from 'antd';
import { I18nContext } from '../contexts.js';
import { MIN_ZOOM, type ZoomMode, useMaxZoom } from '../helper.js';
import { UI_CLASSNAME } from '../constants.js';

const { Text } = Typography;

type TextStyle = { color: string; fontSize: number; margin: number };
type ZoomProps = {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  zoomMode: ZoomMode;
  fitWidth: () => void;
  fitHeight: () => void;
  style: { textStyle: TextStyle };
  labels: {
    zoomIn: string;
    zoomOut: string;
    fitWidth: string;
    fitHeight: string;
  };
};

const ToolbarButton = ({
  className,
  label,
  disabled,
  active,
  onClick,
  children,
}: {
  className: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <Tooltip title={label}>
    <Button
      className={className}
      type="text"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      style={active ? { backgroundColor: 'rgba(255, 255, 255, 0.18)' } : undefined}
    >
      {children}
    </Button>
  </Tooltip>
);

const Separator = ({ color }: { color: string }) => (
  <div style={{ width: 1, height: 24, margin: '0 6px', backgroundColor: color, opacity: 0.45 }} />
);

const Zoom = ({
  zoomLevel,
  setZoomLevel,
  zoomMode,
  fitWidth,
  fitHeight,
  style,
  labels,
}: ZoomProps) => {
  const zoomStep = 0.25;
  const maxZoom = useMaxZoom();

  const nextZoomOut = zoomLevel - zoomStep;
  const nextZoomIn = zoomLevel + zoomStep;
  const iconProps = { size: 16, color: style.textStyle.color };

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <ToolbarButton
        className={UI_CLASSNAME + 'zoom-out'}
        label={labels.zoomOut}
        disabled={zoomLevel <= MIN_ZOOM}
        onClick={() => setZoomLevel(nextZoomOut)}
      >
        <Minus {...iconProps} />
      </ToolbarButton>
      <Text strong style={style.textStyle}>
        {Math.round(zoomLevel * 100)}%
      </Text>
      <ToolbarButton
        className={UI_CLASSNAME + 'zoom-in'}
        label={labels.zoomIn}
        disabled={maxZoom <= zoomLevel}
        onClick={() => setZoomLevel(nextZoomIn)}
      >
        <Plus {...iconProps} />
      </ToolbarButton>
      <Separator color={style.textStyle.color} />
      <ToolbarButton
        className={UI_CLASSNAME + 'fit-width'}
        label={labels.fitWidth}
        active={zoomMode === 'fit-width'}
        onClick={fitWidth}
      >
        <MoveHorizontal {...iconProps} />
      </ToolbarButton>
      <ToolbarButton
        className={UI_CLASSNAME + 'fit-height'}
        label={labels.fitHeight}
        active={zoomMode === 'fit-height'}
        onClick={fitHeight}
      >
        <MoveVertical {...iconProps} />
      </ToolbarButton>
    </div>
  );
};

type PagerProps = {
  pageCursor: number;
  pageNum: number;
  setPageCursor: (page: number) => void;
  style: { textStyle: TextStyle };
};

const Pager = ({ pageCursor, pageNum, setPageCursor, style }: PagerProps) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Button
        className={UI_CLASSNAME + 'page-prev'}
        type="text"
        disabled={pageCursor <= 0}
        onClick={() => setPageCursor(pageCursor - 1)}
      >
        <ChevronLeft size={16} color={style.textStyle.color} />
      </Button>
      <Text strong style={style.textStyle}>
        {pageCursor + 1}/{pageNum}
      </Text>
      <Button
        className={UI_CLASSNAME + 'page-next'}
        type="text"
        disabled={pageCursor + 1 >= pageNum}
        onClick={() => setPageCursor(pageCursor + 1)}
      >
        <ChevronRight size={16} color={style.textStyle.color} />
      </Button>
    </div>
  );
};

type ContextMenuProps = {
  items: MenuProps['items'];
  style: { textStyle: TextStyle };
};
const ContextMenu = ({ items, style }: ContextMenuProps) => (
  <Dropdown menu={{ items }} placement="top" arrow trigger={['click']}>
    <Button className={UI_CLASSNAME + 'context-menu'} type="text">
      <Ellipsis size={16} color={style.textStyle.color} />
    </Button>
  </Dropdown>
);

type CtlBarProps = {
  size: Size;
  pageCursor: number;
  pageNum: number;
  setPageCursor: (page: number) => void;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  zoomMode: ZoomMode;
  fitWidth: () => void;
  fitHeight: () => void;
  addPageAfter?: () => void;
  removePage?: () => void;
};

const CtlBar = (props: CtlBarProps) => {
  const { token } = theme.useToken();
  const i18n = useContext(I18nContext);

  const {
    size,
    pageCursor,
    pageNum,
    setPageCursor,
    zoomLevel,
    setZoomLevel,
    zoomMode,
    fitWidth,
    fitHeight,
    addPageAfter,
    removePage,
  } = props;

  const contextMenuItems: MenuProps['items'] = [];
  if (addPageAfter) {
    contextMenuItems.push({
      key: '1',
      label: <div onClick={addPageAfter}>{i18n('addPageAfter')}</div>,
    });
  }
  if (removePage && pageNum > 1 && pageCursor !== 0) {
    contextMenuItems.push({
      key: '2',
      label: <div onClick={removePage}>{i18n('removePage')}</div>,
    });
  }

  const textStyle = {
    color: token.colorWhite,
    fontSize: token.fontSize,
    margin: token.marginXS,
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 'auto',
        bottom: '6%',
        width: size.width,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        className={UI_CLASSNAME + 'control-bar'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
          height: 40,
          boxSizing: 'border-box',
          padding: token.paddingSM,
          gap: token.marginXS,
          borderRadius: token.borderRadius,
          backgroundColor: token.colorBgMask,
          pointerEvents: 'auto',
        }}
      >
        {pageNum > 1 && (
          <div className={UI_CLASSNAME + 'pager'}>
            <Pager
              style={{ textStyle }}
              pageCursor={pageCursor}
              pageNum={pageNum}
              setPageCursor={setPageCursor}
            />
          </div>
        )}
        <div className={UI_CLASSNAME + 'zoom'}>
          <Zoom
            style={{ textStyle }}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            zoomMode={zoomMode}
            fitWidth={fitWidth}
            fitHeight={fitHeight}
            labels={{
              zoomIn: i18n('zoomIn'),
              zoomOut: i18n('zoomOut'),
              fitWidth: i18n('fitWidth'),
              fitHeight: i18n('fitHeight'),
            }}
          />
        </div>
        {contextMenuItems.length > 0 && (
          <ContextMenu items={contextMenuItems} style={{ textStyle }} />
        )}
      </div>
    </div>
  );
};

export default CtlBar;
