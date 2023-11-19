import React from 'react';
import { Size } from '@pdfme/common';
import { theme, Typography, Button } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
} from '@ant-design/icons';
const { Text } = Typography;

type UnitButtonProps = {
  type: 'left' | 'right' | 'doubleLeft' | 'doubleRight';
  onClick: () => void;
  disabled: boolean;
  textStyle: { color: string; fontSize: number; margin: number };
};

const icons = {
  left: LeftOutlined,
  right: RightOutlined,
  doubleLeft: DoubleLeftOutlined,
  doubleRight: DoubleRightOutlined,
};

const UnitButton: React.FC<UnitButtonProps> = ({ type, onClick, disabled, textStyle }) => {
  const Icon = icons[type];

  return (
    <Button type="text" onClick={onClick} disabled={disabled}>
      <Icon style={{ color: textStyle.color }} />
    </Button>
  );
};

type Props = {
  size: Size;
  unitCursor: number;
  unitNum: number;
  setUnitCursor: (page: number) => void;
};

const UnitPager = ({ size, unitCursor, unitNum, setUnitCursor }: Props) => {
  if (unitNum <= 1) return null;

  const { token } = theme.useToken();

  const buttonWrapStyle: React.CSSProperties = {
    pointerEvents: 'initial',
    position: 'sticky',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    height: 40,
    padding: token.paddingSM,
    borderRadius: token.borderRadius,
    backgroundColor: token.colorBgMask,
  };
  const textStyle = {
    color: token.colorWhite,
    fontSize: token.fontSize,
    margin: token.marginXS,
  };

  return (
    <div style={{ position: 'absolute', ...size }}>
      <div
        style={{
          position: 'sticky',
          width: '100%',
          zIndex: 1,
          top: `calc(50% - ${(buttonWrapStyle.height as number) / 2}px)`,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {unitCursor > 0 && (
          <div style={{ left: '1rem', marginLeft: '1rem', ...buttonWrapStyle }}>
            <UnitButton
              type="doubleLeft"
              onClick={() => setUnitCursor(0)}
              disabled={unitCursor <= 0}
              textStyle={textStyle}
            />
            <UnitButton
              type="left"
              onClick={() => setUnitCursor(unitCursor - 1)}
              disabled={unitCursor <= 0}
              textStyle={textStyle}
            />
            <Text strong style={textStyle}>
              {unitCursor + 1}/{unitNum}
            </Text>
          </div>
        )}
        {unitCursor + 1 < unitNum && (
          <div
            style={{ right: '1rem', marginLeft: 'auto', marginRight: '1rem', ...buttonWrapStyle }}
          >
            <Text strong style={textStyle}>
              {unitCursor + 1}/{unitNum}
            </Text>
            <UnitButton
              type="right"
              onClick={() => setUnitCursor(unitCursor + 1)}
              disabled={unitCursor + 1 >= unitNum}
              textStyle={textStyle}
            />
            <UnitButton
              type="doubleRight"
              onClick={() => setUnitCursor(unitNum - 1)}
              disabled={unitCursor + 1 >= unitNum}
              textStyle={textStyle}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitPager;
