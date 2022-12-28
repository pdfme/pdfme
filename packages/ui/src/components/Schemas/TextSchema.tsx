import React, { forwardRef, Ref } from 'react';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  TextSchema,
} from '@pdfme/common';
import { SchemaUIProps } from './SchemaUI';
import { ZOOM } from '../../constants';

type Props = SchemaUIProps & { schema: TextSchema };

const TextSchemaUI = (
  { schema, editable, placeholder, tabIndex, onChange }: Props,
  ref: Ref<HTMLTextAreaElement>
) => {
  const style: React.CSSProperties = {
    padding: 0,
    resize: 'none',
    position: 'absolute',
    fontFamily: schema.fontName ? `'${schema.fontName}'` : 'inherit',
    height: schema.height * ZOOM,
    // Increase the width by 1 point. (0.75 pixels)
    width: (schema.width + (schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING) * 0.75) * ZOOM,
    textAlign: schema.alignment ?? DEFAULT_ALIGNMENT,
    fontSize: `${schema.fontSize ?? DEFAULT_FONT_SIZE}pt`,
    letterSpacing: `${schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING}pt`,
    lineHeight: `${schema.lineHeight ?? DEFAULT_LINE_HEIGHT}em`,
    whiteSpace: 'pre-line',
    wordBreak: 'break-all',
    border: 'none',
    color: schema.fontColor ? schema.fontColor : DEFAULT_FONT_COLOR,
    backgroundColor:
      schema.data && schema.backgroundColor ? schema.backgroundColor : 'rgb(242 244 255 / 75%)',
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
