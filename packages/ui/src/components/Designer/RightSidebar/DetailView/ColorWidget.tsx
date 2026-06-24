import React from 'react';
import { ColorPicker, Input, Space } from 'antd';
import type { Color } from 'antd/es/color-picker';

// form-render passes these props to a field widget. We override the built-in
// `color` widget because form-render's bundled `rc-color-picker` relies on
// ReactDOM.unstable_renderSubtreeIntoContainer, which was removed in React 19.
export interface ColorWidgetProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  schema?: { format?: string };
  disabled?: boolean;
  disabledAlpha?: boolean;
  readOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_COLOR = '#000000';

const ColorWidget = (props: ColorWidgetProps) => {
  const { value, onChange, disabled, disabledAlpha, readOnly, className, style } = props;

  if (readOnly) {
    return <span style={style}>{value || ''}</span>;
  }

  return (
    <Space.Compact style={style} block>
      <ColorPicker
        value={value || DEFAULT_COLOR}
        disabled={disabled}
        disabledAlpha={disabledAlpha}
        format="hex"
        onChange={(color) => onChange?.(color.toHexString())}
      />
      <Input
        className={className}
        placeholder={DEFAULT_COLOR}
        disabled={disabled}
        value={value}
        onChange={(ev) => onChange?.(ev.target.value)}
      />
    </Space.Compact>
  );
};

export default ColorWidget;
