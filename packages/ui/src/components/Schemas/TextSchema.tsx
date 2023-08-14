import React, { useContext, forwardRef, Ref, useState, useEffect } from 'react';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  TextSchema,
  calculateDynamicFontSize,
  getFontKitFont,
  getFontAlignmentValue,
} from '@pdfme/common';
import { SchemaUIProps } from './SchemaUI';
import { ZOOM } from '../../constants';
import { FontContext } from '../../contexts';

type Props = SchemaUIProps & { schema: TextSchema };

const TextSchemaUI = (
  { schema, editable, placeholder, tabIndex, onChange }: Props,
  ref: Ref<HTMLTextAreaElement>
) => {
  const font = useContext(FontContext);
  const [dynamicFontSize, setDynamicFontSize] = useState<number | undefined>(undefined);
  const [fontAlignmentValue, setFontAlignmentValue] = useState<number>(0);


  useEffect(() => {
    if (schema.dynamicFontSize && schema.data) {
      calculateDynamicFontSize({
        textSchema: schema,
        font,
        input: schema.data,
        startingFontSize: dynamicFontSize,
      }).then(setDynamicFontSize);
    } else {
      setDynamicFontSize(undefined);
    }
  }, [
    schema.data,
    schema.width,
    schema.height,
    schema.dynamicFontSize?.min,
    schema.dynamicFontSize?.max,
    schema.characterSpacing,
    schema.lineHeight,
    font
  ]);

  useEffect(() => {
    getFontKitFont(schema, font).then(fontKitFont => {
      const fav = getFontAlignmentValue(fontKitFont, dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE);
      setFontAlignmentValue(fav);
    });
  }, [
    schema.width,
    schema.height,
    schema.fontName,
    schema.fontSize,
    schema.dynamicFontSize?.max,
    schema.dynamicFontSize?.min,
    schema.characterSpacing,
    schema.lineHeight,
    font,
    dynamicFontSize
  ]);


  const style: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    padding: 0,
    height: fontAlignmentValue < 0 ? schema.height * ZOOM + Math.abs(fontAlignmentValue) : schema.height * ZOOM,
    width: schema.width * ZOOM,
    resize: 'none',
    marginTop: fontAlignmentValue < 0 ? fontAlignmentValue : 0,
    paddingTop: fontAlignmentValue >= 0 ? fontAlignmentValue : 0,
    fontFamily: schema.fontName ? `'${schema.fontName}'` : 'inherit',
    color: schema.fontColor ? schema.fontColor : DEFAULT_FONT_COLOR,
    fontSize: `${dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE}pt`,
    letterSpacing: `${schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING}pt`,
    lineHeight: `${schema.lineHeight ?? DEFAULT_LINE_HEIGHT}em`,
    textAlign: schema.alignment ?? DEFAULT_ALIGNMENT,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    backgroundColor:
      schema.data && schema.backgroundColor ? schema.backgroundColor : 'rgb(242 244 255 / 75%)',
    border: 'none',
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
    <div style={{ ...style, height: schema.height * ZOOM, marginTop: 0, paddingTop: 0 }}>
      <div style={{ marginTop: style.marginTop, paddingTop: style.paddingTop }}>
        {/*  Set the letterSpacing of the last character to 0. */}
        {schema.data.split('').map((l, i) => (
          <span key={i} style={{ letterSpacing: String(schema.data).length === i + 1 ? 0 : 'inherit', }} >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
};

export default forwardRef<HTMLTextAreaElement, Props>(TextSchemaUI);
