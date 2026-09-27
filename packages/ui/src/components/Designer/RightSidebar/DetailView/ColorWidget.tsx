import React, { useEffect, useState } from 'react';
import { ColorPicker, Input, Space } from 'antd';

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
// Matches isHexValid in @pdfme/common: 3/4/6/8-digit hex, where 4/8-digit carry alpha.
const HEX_COLOR_REGEXP = /^#(?:[0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

// A value is safe to forward to the schema only when it is a valid hex color or
// empty (clearing the field). This keeps invalid free-text out of PDF rendering.
const isCommittableColor = (value: string) => value === '' || HEX_COLOR_REGEXP.test(value);

const ColorWidget = (props: ColorWidgetProps) => {
  // Alpha is enabled by default; the picker emits 8-digit hex when alpha < 100%.
  // Fields whose renderer cannot handle alpha (barcode bar/text colors) opt out
  // with disabledAlpha={true}.
  const { value, onChange, disabled, disabledAlpha = false, readOnly, className, style } = props;

  // Keep a local copy so the text input stays responsive while the user types an
  // intermediate value (e.g. "#ff00") that is not yet a valid color.
  const [inputValue, setInputValue] = useState(value ?? '');

  useEffect(() => {
    setInputValue(value ?? '');
  }, [value]);

  if (readOnly) {
    return <span style={style}>{value || ''}</span>;
  }

  const commit = (next: string) => {
    setInputValue(next);
    if (isCommittableColor(next)) {
      onChange?.(next === '' ? undefined : next);
    }
  };

  return (
    <Space.Compact style={style} block>
      <ColorPicker
        value={value || DEFAULT_COLOR}
        disabled={disabled}
        disabledAlpha={disabledAlpha}
        format="hex"
        onChange={(color) => commit(color.toHexString())}
      />
      <Input
        className={className}
        placeholder={DEFAULT_COLOR}
        disabled={disabled}
        value={inputValue}
        onChange={(ev) => commit(ev.target.value)}
      />
    </Space.Compact>
  );
};

export default ColorWidget;
