import React from 'react';
import { Size } from '@pdfme/common';
import { MinusOutlined, PlusOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { theme, Typography, Button } from 'antd';

const { Text } = Typography;

type TextStyle = { color: string; fontSize: number; margin: number };
type ZoomProps = {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  style: { textStyle: TextStyle };
};

const Zoom = ({ zoomLevel, setZoomLevel, style }: ZoomProps) => {
  const zoomStep = 0.25;
  const maxZoom = 2;
  const minZoom = 0.25;

  const nextZoomOut = zoomLevel - zoomStep;
  const nextZoomIn = zoomLevel + zoomStep;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Button
        type="text"
        disabled={minZoom >= nextZoomOut}
        onClick={() => setZoomLevel(nextZoomOut)}
        icon={<MinusOutlined style={{ color: style.textStyle.color }} />}
      />
      <Text strong style={style.textStyle}>
        {Math.round(zoomLevel * 100)}%
      </Text>
      <Button
        type="text"
        disabled={maxZoom < nextZoomIn}
        onClick={() => setZoomLevel(nextZoomIn)}
        icon={<PlusOutlined style={{ color: style.textStyle.color }} />}
      />
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
      <Button type="text" disabled={pageCursor <= 0} onClick={() => setPageCursor(pageCursor - 1)}>
        <LeftOutlined style={{ color: style.textStyle.color }} />
      </Button>
      <Text strong style={style.textStyle}>
        {pageCursor + 1}/{pageNum}
      </Text>
      <Button
        type="text"
        disabled={pageCursor + 1 >= pageNum}
        onClick={() => setPageCursor(pageCursor + 1)}
      >
        <RightOutlined style={{ color: style.textStyle.color }} />
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
  const { token } = theme.useToken();

  const barWidth = 300;
  const { size, pageCursor, pageNum, setPageCursor, zoomLevel, setZoomLevel } = props;
  const width = pageNum > 1 ? barWidth : barWidth / 2;

  const textStyle = {
    color: token.colorWhite,
    fontSize: token.fontSize,
    margin: token.marginXS,
  };

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
          height: 40,
          boxSizing: 'border-box',
          padding: token.paddingSM,
          borderRadius: token.borderRadius,
          backgroundColor: token.colorBgMask,
        }}
      >
        {pageNum > 1 && (
          <Pager
            style={{ textStyle }}
            pageCursor={pageCursor}
            pageNum={pageNum}
            setPageCursor={setPageCursor}
          />
        )}
        <Zoom style={{ textStyle }} zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} />
      </div>
    </div>
  );
};

export default CtlBar;
