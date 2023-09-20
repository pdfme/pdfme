import React, { ChangeEvent, CSSProperties } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const baseInputStyle: CSSProperties = {
  color: '#333',
  background: 'none',
  borderRadius: 2,
  border: '1px solid #767676',
};

const ColorInputSet = (props: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  extraStyle?: CSSProperties;
}) => {
  const { label, value, onChange, onClear, extraStyle } = props;
  const fieldId = 'input-' + label.replace(/\s/g, '');

  return (
    <div style={{ width: '45%', ...extraStyle }}>
      <label htmlFor={fieldId}>{label}</label>
      <div style={{ display: 'flex' }}>
        <input
          id={fieldId}
          name={fieldId}
          onChange={onChange}
          value={value}
          type="color"
          style={{ ...baseInputStyle, width: '90%' }}
        />
        <button
          onClick={onClear}
          style={{
            ...baseInputStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <XMarkIcon width={10} height={10} />
        </button>
      </div>
    </div>
  );
};

export default ColorInputSet;
