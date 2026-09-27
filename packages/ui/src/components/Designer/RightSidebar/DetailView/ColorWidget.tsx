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
// 3/4-digit shorthand is ambiguous while typing ("#ff0" may be a prefix of
// "#ff0000"), so keystrokes only commit the unambiguous 6/8-digit forms; the
// shorthand forms commit on blur/Enter instead.
const FULL_HEX_COLOR_REGEXP = /^#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

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
    onChange?.(next === '' ? undefined : next);
  };

  const handleInputChange = (next: string) => {
    setInputValue(next);
    if (next === '' || FULL_HEX_COLOR_REGEXP.test(next)) {
      commit(next);
    }
  };

  // Blur/Enter is the "done typing" signal: valid shorthand commits here, and
  // invalid free-text reverts to the last committed value. This keeps invalid
  // colors out of PDF rendering.
  const handleInputCommit = () => {
    if (HEX_COLOR_REGEXP.test(inputValue)) {
      commit(inputValue);
    } else if (inputValue !== '') {
      setInputValue(value ?? '');
    }
  };

  return (
    <Space.Compact style={style} block>
      <ColorPicker
        value={value || DEFAULT_COLOR}
        disabled={disabled}
        disabledAlpha={disabledAlpha}
        format="hex"
        onChange={(color) => {
          const next = color.toHexString();
          setInputValue(next);
          commit(next);
        }}
      />
      <Input
        className={className}
        placeholder={DEFAULT_COLOR}
        disabled={disabled}
        value={inputValue}
        onChange={(ev) => handleInputChange(ev.target.value)}
        onBlur={handleInputCommit}
        onPressEnter={handleInputCommit}
      />
    </Space.Compact>
  );
};

export default ColorWidget;
