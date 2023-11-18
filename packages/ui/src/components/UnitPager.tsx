import React, { useContext } from 'react';
import { Size } from '@pdfme/common';
import { theme, Typography, Button } from 'antd';
import { StyleContext } from '../contexts';
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
};

const icons = {
  left: LeftOutlined,
  right: RightOutlined,
  doubleLeft: DoubleLeftOutlined,
  doubleRight: DoubleRightOutlined,
};

const UnitButton: React.FC<UnitButtonProps> = ({ type, onClick, disabled }) => {
  const Icon = icons[type];
  const style = useContext(StyleContext);

  return (
    <Button type="text" onClick={onClick} disabled={disabled}>
      <Icon style={{ color: style.UnitPager.textColor }} />
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

  const style = useContext(StyleContext);

  const { token } = theme.useToken();

  const buttonWrapStyle: React.CSSProperties = {
    pointerEvents: 'initial',
    position: 'sticky',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    height: style.UnitPager.height,
    padding: token.paddingSM,
    borderRadius: token.borderRadius,
    backgroundColor: style.UnitPager.background,
  };
  const textStyle = {
    color: style.CtlBar.textColor,
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
          top: `calc(50% - ${style.UnitPager.height / 2}px)`,
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
            />
            <UnitButton
              type="left"
              onClick={() => setUnitCursor(unitCursor - 1)}
              disabled={unitCursor <= 0}
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
            />
            <UnitButton
              type="doubleRight"
              onClick={() => setUnitCursor(unitNum - 1)}
              disabled={unitCursor + 1 >= unitNum}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitPager;
