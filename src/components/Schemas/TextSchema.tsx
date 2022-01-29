import React, { forwardRef, Ref } from 'react';
import { ZOOM } from '../../libs/constants';
import { SchemaUIProps } from './SchemaUI';
import { TextSchema } from '../../libs/type';

type Props = SchemaUIProps & { schema: TextSchema };

const TextSchemaUI = (
  { schema, editable, placeholder, tabIndex, onChange }: Props,
  ref: Ref<HTMLTextAreaElement>
) => {
  const style: React.CSSProperties = {
    resize: 'none',
    fontFamily: schema.fontName || 'inherit',
    height: schema.height * ZOOM,
    width: schema.width * ZOOM,
    textAlign: schema.alignment,
    fontSize: `${schema.fontSize}pt`,
    letterSpacing: `${schema.characterSpacing}pt`,
    fontFeatureSettings: `"palt"`,
    lineHeight: `${schema.lineHeight}em`,
    whiteSpace: 'pre-line',
    wordBreak: 'break-all',
    background: 'transparent',
    border: 'none',
    color: schema.fontColor || '#000',
  };

  return editable ? (
    <textarea
      ref={ref}
      placeholder={placeholder}
      tabIndex={tabIndex}
      style={style}
      onChange={(e) => onChange(e.target.value)}
      value={schema.data}
    ></textarea>
  ) : (
    <div style={style}>
      {/*  Set the letterSpacing of the last character to 0. */}
      {schema.data.split('').map((l, i) => (
        <span
          key={i}
          style={{
            letterSpacing: String(schema.data).length === i + 1 ? 0 : 'inherit',
          }}
        >
          {l}
        </span>
      ))}
    </div>
  );
};

export default forwardRef<HTMLTextAreaElement, Props>(TextSchemaUI);
