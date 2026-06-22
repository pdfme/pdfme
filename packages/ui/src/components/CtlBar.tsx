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
const CONTROL_BUTTON_SIZE = 32;

const getControlButtonStyle = (active?: boolean): React.CSSProperties => ({
  width: CONTROL_BUTTON_SIZE,
  minWidth: CONTROL_BUTTON_SIZE,
  height: CONTROL_BUTTON_SIZE,
  padding: 0,
  ...(active ? { backgroundColor: 'rgba(255, 255, 255, 0.18)' } : {}),
});

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
      style={getControlButtonStyle(active)}
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        rowGap: 0,
      }}
    >
      <ToolbarButton
        className={UI_CLASSNAME + 'zoom-out'}
        label={labels.zoomOut}
        disabled={zoomLevel <= MIN_ZOOM}
        onClick={() => setZoomLevel(nextZoomOut)}
      >
        <Minus {...iconProps} />
      </ToolbarButton>
      <Text
        strong
        style={{
          ...style.textStyle,
          minWidth: 44,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
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
        style={getControlButtonStyle()}
      >
        <ChevronLeft size={16} color={style.textStyle.color} />
      </Button>
      <Text
        strong
        style={{
          ...style.textStyle,
          minWidth: 36,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {pageCursor + 1}/{pageNum}
      </Text>
      <Button
        className={UI_CLASSNAME + 'page-next'}
        type="text"
        disabled={pageCursor + 1 >= pageNum}
        onClick={() => setPageCursor(pageCursor + 1)}
        style={getControlButtonStyle()}
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
    <Button
      className={UI_CLASSNAME + 'context-menu'}
      type="text"
      style={getControlButtonStyle()}
    >
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
        boxSizing: 'border-box',
        padding: `0 ${token.paddingXS}px`,
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
          minHeight: 40,
          maxWidth: '100%',
          boxSizing: 'border-box',
          padding: `${token.paddingXXS}px ${token.paddingSM}px`,
          columnGap: token.marginXS,
          rowGap: token.marginXXS,
          flexWrap: 'wrap',
          borderRadius: token.borderRadius,
          backgroundColor: token.colorBgMask,
          pointerEvents: 'auto',
        }}
      >
        {pageNum > 1 && (
          <div className={UI_CLASSNAME + 'pager'} style={{ flexShrink: 0 }}>
            <Pager
              style={{ textStyle }}
              pageCursor={pageCursor}
              pageNum={pageNum}
              setPageCursor={setPageCursor}
            />
          </div>
        )}
        <div className={UI_CLASSNAME + 'zoom'} style={{ minWidth: 0 }}>
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
