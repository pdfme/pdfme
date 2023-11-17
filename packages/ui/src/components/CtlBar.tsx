import React, { useContext } from 'react';
import { Size } from '@pdfme/common';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { theme, Typography, Button } from 'antd';
import { StyleContext } from '../contexts';

const { Text } = Typography;

type ZoomProps = {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  style: {
    textStyle: React.CSSProperties;
    iconStyle: { size: number; color: string };
  };
};

const Zoom = ({ zoomLevel, setZoomLevel, style }: ZoomProps) => {
  const zoomStep = 0.25;
  const maxZoom = 2;
  const minZoom = 0.25;

  const nextZoomOut = zoomLevel - zoomStep;
  const nextZoomIn = zoomLevel + zoomStep;

  return (
    <div style={{ display: 'flex' }}>
      <Button
        type="text"
        disabled={minZoom >= nextZoomOut}
        onClick={() => setZoomLevel(nextZoomOut)}
      >
        <MinusIcon
          width={style.iconStyle.size}
          height={style.iconStyle.size}
          color={style.iconStyle.color}
        />
      </Button>
      <Text strong style={style.textStyle}>
        {Math.round(zoomLevel * 100)}%
      </Text>
      <Button type="text" disabled={maxZoom < nextZoomIn} onClick={() => setZoomLevel(nextZoomIn)}>
        <PlusIcon
          width={style.iconStyle.size}
          height={style.iconStyle.size}
          color={style.iconStyle.color}
        />
      </Button>
    </div>
  );
};

type PagerProps = {
  pageCursor: number;
  pageNum: number;
  setPageCursor: (page: number) => void;
  style: {
    textStyle: React.CSSProperties;
    iconStyle: { size: number; color: string };
  };
};

const Pager = ({ pageCursor, pageNum, setPageCursor, style }: PagerProps) => {
  return (
    <div style={{ display: 'flex' }}>
      <Button type="text" disabled={pageCursor <= 0} onClick={() => setPageCursor(pageCursor - 1)}>
        <ChevronLeftIcon
          width={style.iconStyle.size}
          height={style.iconStyle.size}
          color={style.iconStyle.color}
        />
      </Button>
      <Text strong style={style.textStyle}>
        {pageCursor + 1}/{pageNum}
      </Text>
      <Button
        type="text"
        disabled={pageCursor + 1 >= pageNum}
        onClick={() => setPageCursor(pageCursor + 1)}
      >
        <ChevronRightIcon
          width={style.iconStyle.size}
          height={style.iconStyle.size}
          color={style.iconStyle.color}
        />
      </Button>
    </div>
  );
};

type CtlBarProps = {
  size: Size;
  pageCursor: number;
  pageNum: number;
  setPageCursor: (page: number) => void;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
};

const CtlBar = (props: CtlBarProps) => {
  const style = useContext(StyleContext);
  const { token } = theme.useToken();

  const barWidth = style.CtlBar.barWidth;
  const { size, pageCursor, pageNum, setPageCursor, zoomLevel, setZoomLevel } = props;
  const width = pageNum > 1 ? barWidth : barWidth / 2;

  const textStyle = {
    color: style.CtlBar.textColor,
    fontSize: token.fontSize,
    margin: token.marginXS,
  };
  const iconStyle = style.CtlBar.icon;

  return (
    <div style={{ position: 'absolute', top: 'auto', bottom: '6%', width: size.width }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
          left: `calc(50% - ${width / 2}px)`,
          width,
          height: style.CtlBar.height,
          boxSizing: 'border-box',
          padding: token.paddingSM,
          borderRadius: token.borderRadius,
          backgroundColor: style.CtlBar.background,
        }}
      >
        {pageNum > 1 && (
          <Pager
            style={{ textStyle, iconStyle }}
            pageCursor={pageCursor}
            pageNum={pageNum}
            setPageCursor={setPageCursor}
          />
        )}
        <Zoom style={{ textStyle, iconStyle }} zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} />
      </div>
    </div>
  );
};

export default CtlBar;
